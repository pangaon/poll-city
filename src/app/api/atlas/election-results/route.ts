import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface Candidate {
  name: string;
  votes: number;
  totalVotes: number;
  pct: number;
  won: boolean;
  incumbent: boolean;
  acclaimed: boolean;
}

interface Race {
  office: string;
  candidates: Candidate[];
  winner: string | null;
  winnerPct: number | null;
  margin: number | null;
  acclaimed: boolean;
  totalVotes: number;
}

interface YearData {
  electionDate: string;
  electors: number;
  voted: number;
  turnoutPct: number;
  races: Race[];
}

export async function GET(req: NextRequest) {
  const municipality = req.nextUrl.searchParams.get("municipality");
  if (!municipality) {
    return NextResponse.json({ error: "municipality query param required" }, { status: 400 });
  }

  const rows = await prisma.electionResult.findMany({
    where: {
      jurisdiction: { startsWith: `${municipality} |` },
      electionType: "municipal",
      province: "ON",
    },
    orderBy: [{ electionDate: "desc" }, { jurisdiction: "asc" }, { percentage: "desc" }],
  });

  // Group by year
  const byYear = new Map<string, typeof rows>();
  for (const r of rows) {
    const y = r.electionDate.getFullYear().toString();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(r);
  }

  const years: Record<string, YearData> = {};

  for (const [year, yearRows] of Array.from(byYear.entries())) {
    // Separate stats record from candidate records
    const statsRow = yearRows.find(r => r.candidateName === "_STATS_");
    const candidateRows = yearRows.filter(r => r.candidateName !== "_STATS_");

    const electors = statsRow?.totalVotesCast ?? 0;
    const voted = statsRow?.votesReceived ?? 0;
    const turnoutPct = statsRow?.percentage ?? 0;

    // Group candidates by office (everything after the | )
    const byOffice = new Map<string, typeof candidateRows>();
    for (const c of candidateRows) {
      const office = c.jurisdiction.split(" | ").slice(1).join(" | ");
      if (!byOffice.has(office)) byOffice.set(office, []);
      byOffice.get(office)!.push(c);
    }

    const races: Race[] = [];
    for (const [office, candidates] of Array.from(byOffice.entries())) {
      const acclaimed = candidates.some(c => c.source?.includes("_acclaimed"));
      const winner = candidates.find(c => c.won);
      const sorted = [...candidates].sort((a, b) => b.votesReceived - a.votesReceived);

      const top = sorted[0];
      const second = sorted[1];
      const margin = top && second && top.votesReceived > 0 && second.votesReceived >= 0
        ? Math.round((top.percentage - second.percentage) * 10) / 10
        : null;

      races.push({
        office,
        candidates: sorted.map(c => ({
          name: c.candidateName,
          votes: c.votesReceived,
          totalVotes: c.totalVotesCast,
          pct: c.percentage,
          won: c.won,
          incumbent: c.partyName === "incumbent",
          acclaimed: c.source?.includes("_acclaimed") ?? false,
        })),
        winner: winner?.candidateName ?? null,
        winnerPct: winner?.percentage ?? null,
        margin,
        acclaimed,
        totalVotes: candidates[0]?.totalVotesCast ?? 0,
      });
    }

    // Sort races: Mayor first, then alphabetically
    races.sort((a, b) => {
      if (a.office.toLowerCase().includes("mayor") && !a.office.toLowerCase().includes("deputy")) return -1;
      if (b.office.toLowerCase().includes("mayor") && !b.office.toLowerCase().includes("deputy")) return 1;
      return a.office.localeCompare(b.office);
    });

    years[year] = {
      electionDate: `${year}-10-${year === "2022" ? "24" : year === "2018" ? "22" : "27"}`,
      electors,
      voted,
      turnoutPct,
      races,
    };
  }

  const sortedYears = Object.fromEntries(
    Object.entries(years).sort(([a], [b]) => parseInt(b) - parseInt(a))
  );

  return NextResponse.json({
    municipality,
    availableYears: Object.keys(sortedYears).sort((a, b) => parseInt(b) - parseInt(a)),
    years: sortedYears,
  });
}
