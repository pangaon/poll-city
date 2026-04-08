/**
 * GET /api/analytics/gotv — GOTV analytics: voted tracker, priority tier breakdown, pacing.
 */
import { NextRequest, NextResponse } from "next/server";
import { SupportLevel } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import { computeGotvScore } from "@/lib/gotv/score";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "gotv:read");
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId") || (session.user.activeCampaignId as string);
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [totalContacts, totalVoted, supporterVoted, totalSupporters] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({ where: { campaignId, voted: true } }),
    prisma.contact.count({ where: { campaignId, voted: true, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
  ]);

  // P1-P4 tier breakdown using the real GOTV scoring engine
  const contacts = await prisma.contact.findMany({
    where: { campaignId },
    select: {
      supportLevel: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      voted: true,
    },
  });
  const tierCounts = { p1: 0, p2: 0, p3: 0, p4: 0 };
  for (const contact of contacts) {
    const { tier } = computeGotvScore(contact);
    if (tier === 1) tierCounts.p1++;
    else if (tier === 2) tierCounts.p2++;
    else if (tier === 3) tierCounts.p3++;
    else tierCounts.p4++;
  }
  const { p1, p2, p3, p4 } = tierCounts;

  const turnoutRate = totalContacts > 0 ? Math.round((totalVoted / totalContacts) * 100) : 0;
  const supporterTurnoutRate = totalSupporters > 0 ? Math.round((supporterVoted / totalSupporters) * 100) : 0;

  return NextResponse.json({
    totalContacts,
    totalVoted,
    turnoutRate,
    supporterVoted,
    totalSupporters,
    supporterTurnoutRate,
    tiers: { p1, p2, p3, p4 },
    notYetVoted: totalSupporters - supporterVoted,
  });
}
