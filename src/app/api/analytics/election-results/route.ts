import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  void session;

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const province = searchParams.get("province");
  const jurisdiction = searchParams.get("jurisdiction");
  const electionType = searchParams.get("electionType") ?? "municipal";

  const where: Record<string, unknown> = { electionType };
  if (province) where.province = province;
  if (jurisdiction) where.jurisdiction = { contains: jurisdiction, mode: "insensitive" };
  if (year) {
    const y = parseInt(year);
    where.electionDate = {
      gte: new Date(`${y}-01-01`),
      lt: new Date(`${y + 1}-01-01`),
    };
  }

  const results = await prisma.electionResult.findMany({
    where,
    orderBy: [{ jurisdiction: "asc" }, { electionDate: "desc" }, { votesReceived: "desc" }],
    take: 2000,
    select: {
      id: true,
      electionDate: true,
      jurisdiction: true,
      candidateName: true,
      partyName: true,
      votesReceived: true,
      totalVotesCast: true,
      percentage: true,
      won: true,
      pollNumber: true,
      province: true,
    },
  });

  // Group by jurisdiction
  const byJurisdiction: Record<string, {
    jurisdiction: string;
    province: string | null;
    years: Record<string, { totalVotes: number; winnerName: string; winnerPct: number; candidateCount: number }>;
    candidates: typeof results;
  }> = {};

  for (const r of results) {
    if (!byJurisdiction[r.jurisdiction]) {
      byJurisdiction[r.jurisdiction] = {
        jurisdiction: r.jurisdiction,
        province: r.province,
        years: {},
        candidates: [],
      };
    }
    byJurisdiction[r.jurisdiction].candidates.push(r);

    const yr = r.electionDate.getFullYear().toString();
    if (!byJurisdiction[r.jurisdiction].years[yr]) {
      byJurisdiction[r.jurisdiction].years[yr] = { totalVotes: 0, winnerName: "", winnerPct: 0, candidateCount: 0 };
    }
    const yData = byJurisdiction[r.jurisdiction].years[yr];
    yData.candidateCount++;
    if (r.won) {
      yData.winnerName = r.candidateName;
      yData.winnerPct = r.percentage;
      yData.totalVotes = r.totalVotesCast;
    }
  }

  // Top 10 by total votes (most recent year)
  const topByVotes = Object.values(byJurisdiction)
    .map((j) => {
      const latestYear = Object.keys(j.years).sort().reverse()[0];
      return {
        jurisdiction: j.jurisdiction,
        province: j.province,
        totalVotes: j.years[latestYear]?.totalVotes ?? 0,
        winnerName: j.years[latestYear]?.winnerName ?? "",
        winnerPct: j.years[latestYear]?.winnerPct ?? 0,
        year: latestYear,
      };
    })
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 10);

  // Year-over-year trend for a selected jurisdiction (or all)
  const trendByYear = results.reduce<Record<string, { year: string; totalVotes: number; contests: number }>>((acc, r) => {
    const yr = r.electionDate.getFullYear().toString();
    if (!acc[yr]) acc[yr] = { year: yr, totalVotes: 0, contests: 0 };
    if (r.won) {
      acc[yr].totalVotes += r.totalVotesCast;
      acc[yr].contests++;
    }
    return acc;
  }, {});

  return NextResponse.json({
    data: {
      results: results.slice(0, 500),
      byJurisdiction: Object.values(byJurisdiction).slice(0, 200),
      topByVotes,
      trendByYear: Object.values(trendByYear).sort((a, b) => a.year.localeCompare(b.year)),
      total: results.length,
    },
  });
}
