import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/teams?campaignId=X ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const teams = await prisma.fieldTeam.findMany({
    where: { campaignId, isActive: true },
    include: {
      _count: { select: { members: true } },
      leadUser: { select: { id: true, name: true } },
      members: {
        where: { leftAt: null },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: teams });
}

// ── POST /api/field/teams ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    leadUserId?: string;
    ward?: string;
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const team = await prisma.fieldTeam.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      leadUserId: body.leadUserId ?? null,
      ward: body.ward?.trim() ?? null,
      isActive: true,
      createdById: session!.user.id,
    },
    include: {
      _count: { select: { members: true } },
      leadUser: { select: { id: true, name: true } },
      members: { where: { leftAt: null }, include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ data: team }, { status: 201 });
}
