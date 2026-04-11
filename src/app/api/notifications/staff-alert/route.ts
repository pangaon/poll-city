import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: { campaignId?: string; contactId?: string; event?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const campaignId = (body.campaignId ?? "").trim();
  const event = body.event?.trim();
  const message = body.message?.trim() ?? "";

  if (!event) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "notifications:write");
  if (forbidden) return forbidden;

  if (body.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
      select: { campaignId: true },
    });
    if (!contact || contact.campaignId !== campaignId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404, headers: NO_STORE_HEADERS });
    }
  }

  const staffMembers = await prisma.membership.findMany({
    where: { campaignId, role: { in: [Role.ADMIN, Role.CAMPAIGN_MANAGER] } },
    include: { user: { select: { id: true } } },
  });

  if (staffMembers.length > 0) {
    await prisma.notification.createMany({
      data: staffMembers.map((m) => ({
        userId: m.user.id,
        title: `🔔 ${event.replace(/_/g, " ")}`,
        body: message || "Campaign staff alert",
        type: "staff_alert",
        entityType: body.contactId ? "contact" : "campaign",
        entityId: body.contactId ?? campaignId,
        isRead: false,
      })),
    });
  }

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: event,
      entityType: body.contactId ? "contact" : "campaign",
      entityId: body.contactId ?? campaignId,
      details: { message },
    },
  });

  return NextResponse.json({ data: { notified: staffMembers.length } }, { headers: NO_STORE_HEADERS });
}
