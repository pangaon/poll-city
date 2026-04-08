import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createCanvassListSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const isVolunteer = session!.user.role === "VOLUNTEER";

  const where: Record<string, unknown> = { campaignId };

  // Volunteers only see lists explicitly sent to them.
  if (isVolunteer || scope === "assigned") {
    where.assignments = { some: { userId: session!.user.id } };
  } else if (scope === "unassigned") {
    where.assignments = { none: {} };
  } else if (scope === "sent") {
    where.assignments = { some: {} };
  }

  const lists = await prisma.canvassList.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json({
    data: lists,
    visibility: isVolunteer ? "assigned_only" : "all",
    scopeApplied: isVolunteer ? "assigned" : scope,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createCanvassListSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const { forbidden } = await guardCampaignRoute(session!.user.id, parsed.data.campaignId, "canvassing:write");
  if (forbidden) return forbidden;
  const list = await prisma.canvassList.create({ data: parsed.data });
  await prisma.activityLog.create({
    data: {
      campaignId: parsed.data.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "canvass_list",
      entityId: list.id,
      details: { name: parsed.data.name },
    },
  });
  return NextResponse.json({ data: list }, { status: 201 });
}
