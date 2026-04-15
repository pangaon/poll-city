import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/eday/hq?campaignId=...
 *
 * Aggregated election-night data for the Campaign Manager HQ view.
 * Returns:
 *  - liveResults: all LiveResult rows for this campaign
 *  - candidateTotals: votes per candidate (verified entries only)
 *  - scrutineers: assignments + whether they've submitted a result
 *  - statusCounts: total | verified | pending | mismatches (guessed from entryTwoUserId = null)
 *  - recentSubmissions: last 15 entries (newest first)
 *
 * Only ADMIN / CAMPAIGN_MANAGER / SUPER_ADMIN may access this endpoint.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  // Fetch the campaign details for the candidate name and election date
  const [campaign, liveResults, assignments] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        candidateName: true,
        electionDate: true,
        name: true,
        jurisdiction: true,
      },
    }),
    prisma.liveResult.findMany({
      where: { campaignId },
      include: {
        // User relations on LiveResult aren't set up — just get the raw IDs
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scrutineerAssignment.findMany({
      where: { campaignId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ── Aggregate candidate vote totals (verified entries only for confidence) ──
  const verifiedResults = liveResults.filter((r) => r.isVerified);
  const pendingResults = liveResults.filter((r) => !r.isVerified);

  // For our candidate specifically: sum across all verified polls
  const candidateName = campaign?.candidateName ?? "";
  const ourCandidate = verifiedResults
    .filter((r) => r.candidateName.toLowerCase().includes(candidateName.toLowerCase()) || candidateName === "")
    .reduce((sum, r) => sum + r.votes, 0);

  // All candidates' totals (from verified results)
  const candidateMap = new Map<string, { votes: number; party: string | null }>();
  for (const r of verifiedResults) {
    const existing = candidateMap.get(r.candidateName);
    if (existing) {
      existing.votes += r.votes;
    } else {
      candidateMap.set(r.candidateName, { votes: r.votes, party: r.party });
    }
  }

  const candidateTotals = Array.from(candidateMap.entries())
    .map(([name, data]) => ({
      name,
      party: data.party,
      votes: data.votes,
      isOurCandidate: candidateName
        ? name.toLowerCase().includes(candidateName.toLowerCase())
        : false,
    }))
    .sort((a, b) => b.votes - a.votes);

  // ── Scrutineer status ──────────────────────────────────────────────────────
  // Which polling stations have submissions from our scrutineers?
  const submittedByUserId = new Set(
    liveResults
      .flatMap((r) => [r.entryOneUserId, r.entryTwoUserId])
      .filter((id): id is string => id !== null),
  );

  const scrutineers = assignments.map((a) => ({
    id: a.id,
    pollingStation: a.pollingStation,
    pollingAddress: a.pollingAddress,
    municipality: a.municipality,
    ward: a.ward,
    user: a.user,
    candidateSigned: a.candidateSigned,
    hasSubmitted: submittedByUserId.has(a.userId),
  }));

  const scrutineersCheckedIn = scrutineers.filter((s) => s.hasSubmitted).length;
  const scrutineersAssigned = scrutineers.length;

  // ── Status counts ──────────────────────────────────────────────────────────
  const statusCounts = {
    total: liveResults.length,
    verified: verifiedResults.length,
    pending: pendingResults.length,
    scrutineersAssigned,
    scrutineersCheckedIn,
    pollsWithBothEntries: verifiedResults.length,
    pollsWithOneEntry: pendingResults.length,
  };

  // ── Recent submissions (feed) ──────────────────────────────────────────────
  const recentSubmissions = liveResults.slice(0, 20).map((r) => ({
    id: r.id,
    candidateName: r.candidateName,
    party: r.party,
    votes: r.votes,
    pollingStation: r.ward ?? r.municipality,
    isVerified: r.isVerified,
    ocrAssisted: r.ocrAssisted,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    data: {
      campaign: {
        name: campaign?.name,
        candidateName,
        electionDate: campaign?.electionDate,
        jurisdiction: campaign?.jurisdiction,
      },
      statusCounts,
      candidateTotals,
      ourCandidateVotes: ourCandidate,
      scrutineers,
      recentSubmissions,
    },
  });
}
