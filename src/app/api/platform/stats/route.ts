import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalCampaigns,
    activeCampaigns,
    totalUsers,
    usersLast30days,
    totalContacts,
    totalPolls,
    totalPollResponses,
    contentPending,
    recentCampaigns,
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaign.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30days } } }),
    prisma.contact.count(),
    prisma.poll.count(),
    prisma.pollResponse.count(),
    // Content pending = social posts in draft state (best proxy for "content pending review")
    prisma.socialPost.count({ where: { status: "draft" } }).catch(() => 0),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { memberships: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns,
      inactive: totalCampaigns - activeCampaigns,
    },
    users: {
      total: totalUsers,
      last30days: usersLast30days,
    },
    contacts: {
      total: totalContacts,
    },
    polls: {
      total: totalPolls,
      responses: totalPollResponses,
    },
    pipeline: {
      sourcesActive: activeCampaigns,
      contentPending: contentPending,
    },
    recentCampaigns,
  });
}
