/**
 * GET /api/maps/electoral-overlay — Historical election data for map overlays.
 *
 * What Qomon does: "Voter turnout and electoral history data."
 * What we do: overlay actual Ontario election results on the campaign map.
 * Show where candidates won/lost historically, turnout by ward, and
 * trends across 2014-2018-2022 elections.
 *
 * Uses the ElectionResult table already seeded with 7,048 Ontario results.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const municipality = sp.get("municipality");
  const ward = sp.get("ward");
  const year = sp.get("year"); // 2014, 2018, 2022

  const where: Record<string, unknown> = { electionType: "municipal" };
  if (municipality) where.jurisdiction = { contains: municipality, mode: "insensitive" };
  if (ward) where.jurisdiction = { contains: ward, mode: "insensitive" };
  if (year) where.electionDate = { gte: new Date(`${year}-01-01`), lt: new Date(`${Number(year) + 1}-01-01`) };

  const results = await prisma.electionResult.findMany({
    where,
    select: {
      id: true,
      jurisdiction: true,
      candidateName: true,
      votesReceived: true,
      totalVotesCast: true,
      percentage: true,
      won: true,
      electionDate: true,
    },
    orderBy: [{ jurisdiction: "asc" }, { votesReceived: "desc" }],
    take: 500,
  });

  // Group by jurisdiction for ward-level summaries
  const jurisdictions = new Map<string, typeof results>();
  for (const r of results) {
    const j = r.jurisdiction;
    if (!jurisdictions.has(j)) jurisdictions.set(j, []);
    jurisdictions.get(j)!.push(r);
  }

  const wardSummaries = Array.from(jurisdictions.entries()).map(([jurisdiction, candidates]) => {
    const winner = candidates.find((c) => c.won);
    const totalVotes = candidates[0]?.totalVotesCast ?? 0;
    const topCandidate = candidates[0];
    const margin = candidates.length >= 2
      ? (candidates[0].votesReceived ?? 0) - (candidates[1].votesReceived ?? 0)
      : 0;
    const competitiveness = totalVotes > 0 && candidates.length >= 2
      ? Math.round((margin / totalVotes) * 100)
      : 100;

    return {
      jurisdiction,
      year: candidates[0]?.electionDate?.getFullYear() ?? null,
      winner: winner?.candidateName ?? topCandidate?.candidateName ?? "Unknown",
      winnerVotes: winner?.votesReceived ?? topCandidate?.votesReceived ?? 0,
      winnerPct: winner?.percentage ?? topCandidate?.percentage ?? 0,
      totalVotes,
      candidateCount: candidates.length,
      margin,
      competitiveness, // lower = more competitive
      competitive: competitiveness < 10,
      candidates: candidates.slice(0, 5).map((c) => ({
        name: c.candidateName,
        votes: c.votesReceived,
        pct: c.percentage,
        won: c.won,
      })),
    };
  });

  // Trend analysis: compare across election years
  const yearSet = new Set(results.map((r) => r.electionDate?.getFullYear()).filter(Boolean));
  const years = Array.from(yearSet).sort();

  return NextResponse.json({
    wardSummaries,
    totalJurisdictions: wardSummaries.length,
    mostCompetitive: wardSummaries.filter((w) => w.competitive).sort((a, b) => a.competitiveness - b.competitiveness).slice(0, 10),
    highestTurnout: wardSummaries.sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 10),
    availableYears: years,
  }, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600" }, // election results don't change often
  });
}
