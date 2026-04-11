import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groups = await prisma.volunteerGroup.findMany({
    where: { campaignId },
    include: {
      leaderProfile: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
      },
      members: {
        include: {
          volunteerProfile: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: groups });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string;
    name?: string;
    description?: string;
    targetWard?: string;
    leaderProfileId?: string;
  } | null;

  if (!body?.campaignId || !body.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await prisma.volunteerGroup.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      description: sanitizeUserText(body.description),
      targetWard: body.targetWard?.trim() || null,
      leaderProfileId: body.leaderProfileId || null,
    },
  });

  if (body.leaderProfileId) {
    const leader = await prisma.volunteerProfile.findUnique({ where: { id: body.leaderProfileId }, select: { userId: true } });
    if (leader?.userId) {
      await prisma.membership.updateMany({
        where: { userId: leader.userId, campaignId: body.campaignId },
        data: { role: "VOLUNTEER_LEADER" },
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "volunteer_group",
      entityId: created.id,
      details: { name: created.name },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
