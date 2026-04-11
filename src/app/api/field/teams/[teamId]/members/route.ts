import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/teams/[teamId]/members?campaignId=X ──────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const members = await prisma.fieldTeamMember.findMany({
    where: { teamId: params.teamId, campaignId, leftAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ data: members });
}

// ── POST /api/field/teams/[teamId]/members ───────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    userId?: string;
    volunteerId?: string;
    role?: "leader" | "member";
  } | null;

  if (!body?.campaignId || (!body.userId && !body.volunteerId)) {
    return NextResponse.json({ error: "campaignId and userId or volunteerId are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const team = await prisma.fieldTeam.findFirst({
    where: { id: params.teamId, campaignId: body.campaignId, isActive: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Prevent duplicate active membership
  const existing = await prisma.fieldTeamMember.findFirst({
    where: {
      teamId: params.teamId,
      campaignId: body.campaignId,
      leftAt: null,
      ...(body.userId ? { userId: body.userId } : { volunteerId: body.volunteerId }),
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member of this team" }, { status: 409 });
  }

  const member = await prisma.fieldTeamMember.create({
    data: {
      teamId: params.teamId,
      campaignId: body.campaignId,
      userId: body.userId ?? null,
      volunteerId: body.volunteerId ?? null,
      role: body.role === "leader" ? "leader" : "member",
      joinedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: member }, { status: 201 });
}
