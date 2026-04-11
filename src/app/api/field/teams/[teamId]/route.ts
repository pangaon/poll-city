import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── PATCH /api/field/teams/[teamId] ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    leadUserId?: string;
    ward?: string;
    isActive?: boolean;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.fieldTeam.findFirst({
    where: { id: params.teamId, campaignId: body.campaignId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const updated = await prisma.fieldTeam.update({
    where: { id: params.teamId },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.leadUserId !== undefined ? { leadUserId: body.leadUserId ?? null } : {}),
      ...(body.ward !== undefined ? { ward: body.ward?.trim() ?? null } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
    include: {
      _count: { select: { members: true } },
      leadUser: { select: { id: true, name: true } },
      members: { where: { leftAt: null }, include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ data: updated });
}

// ── DELETE /api/field/teams/[teamId] (soft deactivate) ──────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.fieldTeam.findFirst({
    where: { id: params.teamId, campaignId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await prisma.fieldTeam.update({
    where: { id: params.teamId },
    data: { isActive: false },
  });

  return NextResponse.json({ data: { id: params.teamId, deactivated: true } });
}
