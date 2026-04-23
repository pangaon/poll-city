/**
 * Poll City — Ontario Municipal Election Data Seeder
 *
 * Seeds 2014, 2018, 2022 Ontario municipal election results into the
 * ElectionResult table from the committed CSVs in data/ontario-elections/.
 *
 * Source: Ontario Open Data Catalogue (Open Government Licence – Ontario)
 * https://data.ontario.ca/dataset/municipal-election-results
 *
 * Run: npx tsx scripts/seed-ontario-elections.ts
 *      npx tsx scripts/seed-ontario-elections.ts --municipality "Whitby T"
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), "data", "ontario-elections");

const ELECTION_DATES: Record<string, Date> = {
  "2022": new Date("2022-10-24T00:00:00.000Z"),
  "2018": new Date("2018-10-22T00:00:00.000Z"),
  "2014": new Date("2014-10-27T00:00:00.000Z"),
};

// All years use same positional columns despite different header wording
// Col: 0=municipality, 1=lastName, 2=firstName, 3=office,
//      4=votesForCandidate, 5=votesForOffice, 6=electedOrAcclaimed, 7=incumbent
const C = { muni: 0, last: 1, first: 2, office: 3, votes: 4, total: 5, elected: 6, incumbent: 7 };

// Municipal stats CSV columns (same across all years)
// Col: 0=municipality, 1=totalElectors, 2=electorsWhoVoted
const S = { muni: 0, electors: 1, voted: 2 };

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function deterministicId(year: string, municipality: string, office: string, candidate: string): string {
  return `ont-${year}-${slug(municipality)}-${slug(office)}-${slug(candidate)}`;
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let inQuote = false;
  let cur = "";
  let row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (c === '"' && !inQuote) { inQuote = true; continue; }
    if (c === '"' && inQuote) {
      if (next === '"') { cur += '"'; i++; continue; } // escaped quote
      inQuote = false; continue;
    }
    if (c === ',' && !inQuote) { row.push(cur.trim()); cur = ""; continue; }
    if ((c === '\n' || c === '\r') && !inQuote) {
      if (c === '\r' && next === '\n') i++; // CRLF
      row.push(cur.trim());
      if (row.some(v => v.length > 0)) rows.push(row);
      row = []; cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim() || row.length) { row.push(cur.trim()); if (row.some(v => v.length > 0)) rows.push(row); }
  return rows;
}

function parseNum(s: string): number {
  if (!s) return 0;
  return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
}

async function seedCandidates(year: string, filterMuni?: string): Promise<number> {
  const file = path.join(DATA_DIR, `${year}_candidates.csv`);
  if (!fs.existsSync(file)) { console.error(`  ✗ ${year}_candidates.csv not found`); return 0; }

  const rows = parseCSV(fs.readFileSync(file, "utf-8"));
  const electionDate = ELECTION_DATES[year];
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;

    const municipality = row[C.muni]?.trim();
    if (!municipality) continue;
    if (filterMuni && municipality.toLowerCase() !== filterMuni.toLowerCase()) continue;

    const lastName = row[C.last]?.trim() ?? "";
    const firstName = row[C.first]?.trim() ?? "";
    const office = row[C.office]?.trim() ?? "";
    const votesReceived = parseNum(row[C.votes]);
    const totalVotesCast = parseNum(row[C.total]);
    const electedStr = (row[C.elected] ?? "").trim().toUpperCase();
    const won = electedStr === "ELECTED" || electedStr === "ACCLAIMED" || electedStr === "YES";
    const acclaimed = electedStr === "ACCLAIMED";
    const incumbentStr = (row[C.incumbent] ?? "").trim().toUpperCase();
    const incumbent = incumbentStr === "YES";

    if (!office) continue;

    const candidateName = `${firstName} ${lastName}`.trim();
    const jurisdiction = `${municipality} | ${office}`;
    const percentage =
      acclaimed ? 100 :
      totalVotesCast > 0 ? Math.round((votesReceived / totalVotesCast) * 1000) / 10 :
      0;

    const id = deterministicId(year, municipality, office, candidateName);

    await prisma.electionResult.upsert({
      where: { id },
      create: {
        id,
        electionDate,
        electionType: "municipal",
        jurisdiction,
        candidateName,
        votesReceived,
        totalVotesCast,
        percentage,
        won,
        province: "ON",
        source: acclaimed ? `ontario_open_data_${year}_acclaimed` : `ontario_open_data_${year}`,
        partyName: incumbent ? "incumbent" : null,
      },
      update: {
        electionDate,
        jurisdiction,
        candidateName,
        votesReceived,
        totalVotesCast,
        percentage,
        won,
        source: acclaimed ? `ontario_open_data_${year}_acclaimed` : `ontario_open_data_${year}`,
        partyName: incumbent ? "incumbent" : null,
      },
    });
    count++;
  }
  return count;
}

async function seedMunicipalStats(year: string, filterMuni?: string): Promise<number> {
  const file = path.join(DATA_DIR, `${year}_municipal.csv`);
  if (!fs.existsSync(file)) { console.error(`  ✗ ${year}_municipal.csv not found`); return 0; }

  const rows = parseCSV(fs.readFileSync(file, "utf-8"));
  const electionDate = ELECTION_DATES[year];
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const municipality = row[S.muni]?.trim();
    if (!municipality) continue;
    if (filterMuni && municipality.toLowerCase() !== filterMuni.toLowerCase()) continue;

    const electors = parseNum(row[S.electors]);
    const voted = parseNum(row[S.voted]);
    if (!electors || !voted) continue;

    const turnoutPct = Math.round((voted / electors) * 1000) / 10;
    const id = `ont-stats-${year}-${slug(municipality)}`;

    await prisma.electionResult.upsert({
      where: { id },
      create: {
        id,
        electionDate,
        electionType: "municipal",
        jurisdiction: `${municipality} | _STATS_`,
        candidateName: "_STATS_",
        votesReceived: voted,
        totalVotesCast: electors,
        percentage: turnoutPct,
        won: false,
        province: "ON",
        source: `ontario_open_data_${year}`,
      },
      update: {
        electionDate,
        jurisdiction: `${municipality} | _STATS_`,
        votesReceived: voted,
        totalVotesCast: electors,
        percentage: turnoutPct,
      },
    });
    count++;
  }
  return count;
}

async function main() {
  const filterMuni = process.argv.find(a => a.startsWith("--municipality="))?.split("=")[1]
    ?? (process.argv.indexOf("--municipality") !== -1 ? process.argv[process.argv.indexOf("--municipality") + 1] : undefined);

  console.log("\n=== Ontario Municipal Election Seeder ===");
  if (filterMuni) console.log(`  Filtering to: ${filterMuni}`);
  console.log("");

  for (const year of ["2014", "2018", "2022"]) {
    console.log(`[${year}] Candidates…`);
    const candidates = await seedCandidates(year, filterMuni);
    console.log(`  ✓ ${candidates} candidate records upserted`);

    console.log(`[${year}] Municipal stats…`);
    const stats = await seedMunicipalStats(year, filterMuni);
    console.log(`  ✓ ${stats} municipal stat records upserted`);
  }

  console.log("\n✓ Done. Election data is live in the DB.");
  console.log("  To seed all Ontario municipalities (takes ~2 min):");
  console.log("    npx tsx scripts/seed-ontario-elections.ts");
  console.log("  To seed Whitby only (fast):");
  console.log('    npx tsx scripts/seed-ontario-elections.ts --municipality "Whitby T"');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
