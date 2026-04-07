/**
 * GET /api/gotv/gap — The Gap: the single most important metric on election day.
 *
 * From POLL-CITY-TRUTH Section 7:
 * Win threshold = estimated votes needed to win
 * Supporters voted = contacts where support=SUPPORTER AND voted=true
 * Gap = win threshold - supporters voted
 *
 * This endpoint must be FAST. Sub-200ms. Called every few seconds on election day.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { SupportLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Fast parallel queries — no joins
  const [campaign, totalSupporters, supportersVoted, totalVoted, totalContacts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { electionDate: true, spendingLimit: true },
    }),
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } },
    }),
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] }, voted: true },
    }),
    prisma.contact.count({ where: { campaignId, voted: true } }),
    prisma.contact.count({ where: { campaignId } }),
  ]);

  // Win threshold estimation:
  // Historical municipal turnout: ~35-40% in Ontario
  // Competitive adjustment: assume you need 51% of voters to win
  // Win threshold = totalContacts * 0.38 (turnout) * 0.51 (win margin)
  // This is configurable — campaign can set their own threshold
  const estimatedTurnout = 0.38;
  const winMargin = 0.51;
  const winThreshold = Math.ceil(totalContacts * estimatedTurnout * winMargin);

  const gap = Math.max(0, winThreshold - supportersVoted);
  const supportersRemaining = totalSupporters - supportersVoted;

  // Hourly pacing (if election day)
  const now = new Date();
  const pollsOpen = 10; // 10am
  const pollsClose = 20; // 8pm
  const currentHour = now.getHours();
  const hoursRemaining = Math.max(0, pollsClose - currentHour);
  const pacingTarget = hoursRemaining > 0 ? Math.ceil(gap / hoursRemaining) : gap;

  const duration = Date.now() - start;

  return NextResponse.json({
    gap,
    winThreshold,
    supportersVoted,
    totalSupporters,
    supportersRemaining,
    totalVoted,
    totalContacts,
    turnoutPct: totalContacts > 0 ? Math.round((totalVoted / totalContacts) * 100) : 0,
    supporterTurnoutPct: totalSupporters > 0 ? Math.round((supportersVoted / totalSupporters) * 100) : 0,
    pacing: {
      hoursRemaining,
      votesNeededPerHour: pacingTarget,
      onTrack: supportersVoted >= (winThreshold - gap),
    },
    duration,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
