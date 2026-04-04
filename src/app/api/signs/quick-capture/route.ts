import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId?: string;
    contactId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    signType?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  const address = body.address?.trim();

  if (!campaignId || !address) {
    return NextResponse.json({ error: "campaignId and address required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let resolvedContactId = body.contactId?.trim() || undefined;

  if (resolvedContactId) {
    const existingContact = await prisma.contact.findUnique({
      where: { id: resolvedContactId },
      select: { id: true, campaignId: true },
    });
    if (!existingContact || existingContact.campaignId !== campaignId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.update({
      where: { id: resolvedContactId },
      data: { signRequested: true },
    });
  } else if (body.firstName?.trim() || body.lastName?.trim()) {
    const contact = await prisma.contact.create({
      data: {
        campaignId,
        firstName: body.firstName?.trim() || "Unknown",
        lastName: body.lastName?.trim() || "Unknown",
        phone: body.phone?.trim() || null,
        address1: address,
        signRequested: true,
        source: "sign_capture",
      },
    });
    resolvedContactId = contact.id;
  }

  const sign = await prisma.sign.create({
    data: {
      campaignId,
      contactId: resolvedContactId ?? null,
      address1: address,
      signType: body.signType?.trim() || "standard",
      notes: body.notes?.trim() || null,
      status: "requested",
    },
  });

  const staffMembers = await prisma.membership.findMany({
    where: { campaignId, role: { in: [Role.ADMIN, Role.CAMPAIGN_MANAGER] } },
    include: { user: { select: { id: true } } },
  });

  if (staffMembers.length > 0) {
    await prisma.notification.createMany({
      data: staffMembers.map((m) => ({
        userId: m.user.id,
        title: "🪧 New Sign Request",
        body: `${body.signType?.trim() || "Standard"} sign requested at ${address}${body.firstName ? ` by ${body.firstName.trim()} ${body.lastName?.trim() ?? ""}` : ""}`,
        type: "staff_alert",
        entityType: "sign",
        entityId: sign.id,
        isRead: false,
      })),
    });
  }

  return NextResponse.json({ data: sign }, { status: 201 });
}
