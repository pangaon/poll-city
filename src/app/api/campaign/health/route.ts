/**
 * GET /api/campaign/health
 * Returns the campaign health score for the active campaign.
 * Requires authenticated session with activeCampaignId.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { computeCampaignHealth, type HealthInput } from "@/lib/campaign/health-score";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const campaignId =
    (req.nextUrl.searchParams.get("campaignId") as string | null) ??
    session.user.activeCampaignId;

  if (!campaignId) {
    return NextResponse.json({ error: "No active campaign" }, { status: 400, headers: NO_STORE });
  }

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    contactedContacts,
    supportCounts,
    p1Count,
    p2Count,
    doorsLast7,
    callsLast7,
    activeVolunteers,
    donationSum,
    campaign,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId, deletedAt: null } }),

    prisma.contact.count({
      where: { campaignId, deletedAt: null, lastContactedAt: { not: null } },
    }),

    prisma.contact.groupBy({
      by: ["supportLevel"],
      where: { campaignId, deletedAt: null },
      _count: { id: true },
    }),

    // P1 = strong_support
    prisma.contact.count({
      where: { campaignId, deletedAt: null, supportLevel: "strong_support" },
    }),

    // P2 = leaning_support
    prisma.contact.count({
      where: { campaignId, deletedAt: null, supportLevel: "leaning_support" },
    }),

    // Door knocks last 7 days
    prisma.interaction.count({
      where: { contact: { campaignId }, type: "door_knock", createdAt: { gte: sevenDaysAgo } },
    }),

    // Calls last 7 days
    prisma.interaction.count({
      where: { contact: { campaignId }, type: "phone_call", createdAt: { gte: sevenDaysAgo } },
    }),

    // Active volunteers last 14 days (users who logged an interaction)
    prisma.interaction.groupBy({
      by: ["userId"],
      where: { contact: { campaignId }, createdAt: { gte: fourteenDaysAgo }, userId: { not: undefined } },
      _count: { id: true },
    }).then((rows) => rows.length),

    // Total donations
    prisma.donation.aggregate({
      where: { campaignId, deletedAt: null },
      _sum: { amount: true },
    }),

    // Campaign for election date (used to compute win threshold heuristic)
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { spendingLimit: true },
    }),
  ]);

  const supportMap: Record<string, number> = {};
  for (const row of supportCounts) {
    supportMap[row.supportLevel] = row._count.id;
  }

  const strongSupport = supportMap["strong_support"] ?? 0;
  const leaningSupport = supportMap["leaning_support"] ?? 0;
  const leaningOpp = supportMap["leaning_opposition"] ?? 0;
  const strongOpp = supportMap["strong_opposition"] ?? 0;

  // Win threshold heuristic: 35% of known contacts, minimum 500
  const winThreshold = Math.max(500, Math.round(totalContacts * 0.35));

  // Donation goal heuristic: use spendingLimit as a proxy if available
  const donationGoal = campaign?.spendingLimit ?? 0;

  const input: HealthInput = {
    totalContacts,
    contactedContacts,
    strongSupport,
    leaningSupport,
    opposition: leaningOpp + strongOpp,
    p1Count,
    p2Count,
    winThreshold,
    doorsLast7Days: doorsLast7,
    callsLast7Days: callsLast7,
    activeVolunteers,
    donationsRaised: Number(donationSum._sum.amount ?? 0),
    donationGoal,
  };

  const result = computeCampaignHealth(input);

  return NextResponse.json({ data: result }, { headers: NO_STORE });
}
