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
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

export async function GET(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Campaign settings still loaded here so future threshold tuning remains possible.
  await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { electionDate: true, spendingLimit: true },
  });

  const metrics = await getGotvSummaryMetrics(campaignId);
  const supportersRemaining = metrics.confirmedSupporters - metrics.supportersVoted;

  // Hourly pacing (if election day)
  const now = new Date();
  const pollsClose = 20; // 8pm
  const currentHour = now.getHours();
  const hoursRemaining = Math.max(0, pollsClose - currentHour);
  const pacingTarget = hoursRemaining > 0 ? Math.ceil(metrics.gap / hoursRemaining) : metrics.gap;

  const duration = Date.now() - start;

  return NextResponse.json({
    gap: metrics.gap,
    winThreshold: metrics.winThreshold,
    supportersVoted: metrics.supportersVoted,
    totalSupporters: metrics.confirmedSupporters,
    supportersRemaining,
    totalVoted: metrics.totalVoted,
    totalContacts: metrics.totalContacts,
    turnoutPct: metrics.totalContacts > 0 ? Math.round((metrics.totalVoted / metrics.totalContacts) * 100) : 0,
    supporterTurnoutPct: metrics.confirmedSupporters > 0 ? Math.round((metrics.supportersVoted / metrics.confirmedSupporters) * 100) : 0,
    pacing: {
      hoursRemaining,
      votesNeededPerHour: pacingTarget,
      onTrack: metrics.supportersVoted >= (metrics.winThreshold - metrics.gap),
    },
    drillThrough: metrics.drillThrough,
    duration,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
