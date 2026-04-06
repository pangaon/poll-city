/**
 * GET /api/analytics/gotv — GOTV analytics: voted tracker, priority tier breakdown, pacing.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "gotv:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const [totalContacts, totalVoted, supporterVoted, totalSupporters] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({ where: { campaignId, voted: true } }),
    prisma.contact.count({ where: { campaignId, voted: true, supportLevel: { in: ["strong_support", "leaning_support"] as any[] } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] } } }),
  ]);

  // P1-P4 tier breakdown (based on contact support + contacted status)
  const p1 = await prisma.contact.count({ where: { campaignId, supportLevel: "strong_support" as any } });
  const p2 = await prisma.contact.count({ where: { campaignId, supportLevel: "leaning_support" as any } });
  const p3 = await prisma.contact.count({ where: { campaignId, supportLevel: "undecided" as any } });
  const p4 = await prisma.contact.count({ where: { campaignId, supportLevel: { in: ["leaning_against", "against"] as any[] } } });

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
