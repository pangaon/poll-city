/**
 * GET /api/analytics/gotv — GOTV analytics: voted tracker, priority tier breakdown, pacing.
 */
import { NextRequest, NextResponse } from "next/server";
import { SupportLevel } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "gotv:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const [totalContacts, totalVoted, supporterVoted, totalSupporters] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({ where: { campaignId, voted: true } }),
    prisma.contact.count({ where: { campaignId, voted: true, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
  ]);

  // P1-P4 tier breakdown (based on contact support + contacted status)
  const p1 = await prisma.contact.count({ where: { campaignId, supportLevel: SupportLevel.strong_support } });
  const p2 = await prisma.contact.count({ where: { campaignId, supportLevel: SupportLevel.leaning_support } });
  const p3 = await prisma.contact.count({ where: { campaignId, supportLevel: SupportLevel.undecided } });
  const p4 = await prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.leaning_opposition, SupportLevel.strong_opposition] } } });

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
