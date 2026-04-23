import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Election dates for Ontario municipal elections
const ELECTION_DATES: Record<string, string> = {
  "2014": "2014-10-27",
  "2018": "2018-10-22",
  "2022": "2022-10-24",
};

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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/^﻿/, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    // Simple CSV parse — handles basic quoting
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").replace(/^"|"$/g, ""); });
    return row;
  });
}

function readYear(year: string, municipality: string): { candidates: Record<string, string>[]; stats: Record<string, string> | null } {
  const dir = path.join(process.cwd(), "data", "ontario-elections");

  const candidateFile = path.join(dir, `${year}_candidates.csv`);
  const municipalFile = path.join(dir, `${year}_municipal.csv`);

  if (!fs.existsSync(candidateFile)) return { candidates: [], stats: null };

  const muniLower = municipality.toLowerCase();

  const allCandidates = parseCSV(fs.readFileSync(candidateFile, "utf8"));
  const candidates = allCandidates.filter(r =>
    (r["MUNICIPALITY"] ?? "").toLowerCase().includes(muniLower)
  );

  let stats: Record<string, string> | null = null;
  if (fs.existsSync(municipalFile)) {
    const allStats = parseCSV(fs.readFileSync(municipalFile, "utf8"));
    stats = allStats.find(r =>
      (r["MUNICIPALITY"] ?? "").toLowerCase().includes(muniLower)
    ) ?? null;
  }

  return { candidates, stats };
}

export async function GET(req: NextRequest) {
  const municipality = req.nextUrl.searchParams.get("municipality");
  if (!municipality) {
    return NextResponse.json({ error: "municipality query param required" }, { status: 400 });
  }

  const years: Record<string, YearData> = {};

  for (const year of ["2022", "2018", "2014"]) {
    const { candidates, stats } = readYear(year, municipality);
    if (candidates.length === 0) continue;

    const electors = parseInt(stats?.["NUMBER_OF_ELECTORS"] ?? "0", 10);
    const voted = parseInt(stats?.["NUMBER_OF_ELECTORS_WHO_VOTED"] ?? "0", 10);
    const turnoutPct = electors > 0 ? Math.round((voted / electors) * 1000) / 10 : 0;

    // Group by office
    const byOffice = new Map<string, Record<string, string>[]>();
    for (const c of candidates) {
      const office = c["OFFICE_FILLED"] ?? "Unknown";
      if (!byOffice.has(office)) byOffice.set(office, []);
      byOffice.get(office)!.push(c);
    }

    const races: Race[] = [];
    for (const [office, offCandidates] of Array.from(byOffice.entries())) {
      const acclaimed = offCandidates.some(c => c["ELECTED_OR_ACCLAIMED"] === "Acclaimed");
      const sorted = [...offCandidates].sort(
        (a, b) => parseInt(b["VOTES_FOR_CANDIDATE"] ?? "0", 10) - parseInt(a["VOTES_FOR_CANDIDATE"] ?? "0", 10)
      );

      const totalVotes = parseInt(sorted[0]?.["VOTES_FOR_OFFICE"] ?? "0", 10);
      const top = sorted[0];
      const second = sorted[1];
      const topVotes = parseInt(top?.["VOTES_FOR_CANDIDATE"] ?? "0", 10);
      const secondVotes = parseInt(second?.["VOTES_FOR_CANDIDATE"] ?? "0", 10);
      const topPct = totalVotes > 0 ? Math.round((topVotes / totalVotes) * 1000) / 10 : 0;
      const secondPct = totalVotes > 0 ? Math.round((secondVotes / totalVotes) * 1000) / 10 : 0;
      const margin = second ? Math.round((topPct - secondPct) * 10) / 10 : null;

      const winner = sorted.find(c => c["ELECTED_OR_ACCLAIMED"] === "Elected" || c["ELECTED_OR_ACCLAIMED"] === "Acclaimed");

      races.push({
        office,
        candidates: sorted.map(c => {
          const votes = parseInt(c["VOTES_FOR_CANDIDATE"] ?? "0", 10);
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 1000) / 10 : 0;
          return {
            name: `${c["FIRST_NAME"] ?? ""} ${c["LAST_NAME"] ?? ""}`.trim(),
            votes,
            totalVotes,
            pct,
            won: c["ELECTED_OR_ACCLAIMED"] === "Elected" || c["ELECTED_OR_ACCLAIMED"] === "Acclaimed",
            incumbent: c["OFFICE_INCUMBENT"] === "Yes",
            acclaimed: c["ELECTED_OR_ACCLAIMED"] === "Acclaimed",
          };
        }),
        winner: winner ? `${winner["FIRST_NAME"] ?? ""} ${winner["LAST_NAME"] ?? ""}`.trim() : null,
        winnerPct: winner ? (totalVotes > 0 ? Math.round((parseInt(winner["VOTES_FOR_CANDIDATE"] ?? "0", 10) / totalVotes) * 1000) / 10 : 0) : null,
        margin,
        acclaimed,
        totalVotes,
      });
    }

    // Sort: Mayor first, then alphabetical
    races.sort((a, b) => {
      const aM = a.office.toLowerCase().includes("mayor") && !a.office.toLowerCase().includes("deputy");
      const bM = b.office.toLowerCase().includes("mayor") && !b.office.toLowerCase().includes("deputy");
      if (aM) return -1;
      if (bM) return 1;
      return a.office.localeCompare(b.office);
    });

    years[year] = {
      electionDate: ELECTION_DATES[year],
      electors,
      voted,
      turnoutPct,
      races,
    };
  }

  const availableYears = Object.keys(years).sort((a, b) => parseInt(b) - parseInt(a));

  if (availableYears.length === 0) {
    return NextResponse.json(
      { error: `No election data found for "${municipality}". Check that the municipality name matches Ontario open data spelling.` },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { municipality, availableYears, years },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
