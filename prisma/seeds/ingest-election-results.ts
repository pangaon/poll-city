/**
 * Ingest Ontario election results from data.ontario.ca open data.
 *
 * Sources:
 *   - Ontario 2022 provincial election results
 *   - Ontario 2018 provincial election results
 *   - Ontario 2023 municipal elections
 *
 * Usage:  npx tsx prisma/seeds/ingest-election-results.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── data.ontario.ca CKAN dataset IDs ────────────────────────────────────────
// Use the CKAN API to discover resource download URLs at runtime.
const DATASETS = [
  {
    datasetId: "2022-ontario-provincial-election-results",
    label: "2022 Ontario Provincial Election",
    electionDate: new Date("2022-06-02"),
    electionType: "provincial" as const,
    province: "ON",
  },
  {
    datasetId: "2018-ontario-provincial-election-results",
    label: "2018 Ontario Provincial Election",
    electionDate: new Date("2018-06-07"),
    electionType: "provincial" as const,
    province: "ON",
  },
  {
    datasetId: "ontario-municipal-elections",
    label: "Ontario Municipal Elections",
    electionDate: new Date("2022-10-24"),
    electionType: "municipal" as const,
    province: "ON",
  },
];

const CKAN_BASE = "https://data.ontario.ca/api/3/action";

interface CkanResource {
  id: string;
  format: string;
  url: string;
  name: string;
}

interface CkanPackage {
  success: boolean;
  result: { resources: CkanResource[] };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function getCsvResources(datasetId: string): Promise<CkanResource[]> {
  const data = await fetchJson<CkanPackage>(
    `${CKAN_BASE}/package_show?id=${datasetId}`
  );
  if (!data?.success) return [];
  return data.result.resources.filter((r) =>
    ["CSV", "csv"].includes(r.format)
  );
}

async function fetchCsvText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function parseSimpleCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? "").trim()]));
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/** Try to find the right column names for common Ontario election CSV formats */
function extractResult(row: Record<string, string>, electionType: string) {
  // Multiple possible column name variations across datasets
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(
        (r) => r.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase().replace(/[^a-z]/g, "")
      );
      if (found && row[found]) return row[found];
    }
    return "";
  };

  const candidateName =
    get("Candidate", "CandidateName", "Name", "candidate_name", "Nom/Name") ||
    [get("First Name", "FirstName"), get("Last Name", "LastName")]
      .filter(Boolean)
      .join(" ");

  const jurisdiction = get(
    "Electoral District Name",
    "Riding",
    "RidingName",
    "constituency_name",
    "Municipality",
    "Ward",
    "WardName",
    "Riding Name"
  );

  const jurisdictionCode = get(
    "Electoral District Number",
    "RidingNumber",
    "constituency_code",
    "electoral_district_number"
  );

  const partyName = get(
    "Political Affiliation",
    "Party",
    "PartyName",
    "Political Affiliation Name",
    "party_name"
  );

  const votesStr = get(
    "Votes",
    "VotesReceived",
    "Total Votes",
    "votes_received",
    "Candidate Vote Count",
    "Nombre de voix"
  ).replace(/,/g, "");

  const totalStr = get(
    "Total Ballots Cast",
    "TotalVotes",
    "total_votes_cast",
    "Total Valid Ballots",
    "Votes Cast"
  ).replace(/,/g, "");

  const pctStr = get("Percentage", "VotePercentage", "Percent", "vote_percentage", "%")
    .replace("%", "")
    .replace(",", ".");

  const wonStr = get("Elected", "Won", "is_elected", "Elected?", "Resulted", "Status");

  const votes = parseInt(votesStr, 10);
  const total = parseInt(totalStr, 10);
  const pct = parseFloat(pctStr);

  if (!candidateName || !jurisdiction || isNaN(votes)) return null;

  const percentage = !isNaN(pct)
    ? pct
    : !isNaN(total) && total > 0
    ? Math.round((votes / total) * 10000) / 100
    : 0;

  const won =
    /^(yes|true|1|elected|winner|x)$/i.test(wonStr.trim());

  return {
    candidateName: candidateName.trim(),
    jurisdiction: jurisdiction.trim(),
    jurisdictionCode: jurisdictionCode || null,
    partyName: partyName || null,
    votesReceived: votes,
    totalVotesCast: isNaN(total) ? 0 : total,
    percentage,
    won,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function ingestDataset(dataset: (typeof DATASETS)[0]) {
  console.log(`\n📥 ${dataset.label}`);

  const resources = await getCsvResources(dataset.datasetId);
  if (resources.length === 0) {
    console.warn(`  ⚠  No CSV resources found for dataset "${dataset.datasetId}". Skipping.`);
    console.warn(`     Check: https://data.ontario.ca/dataset/${dataset.datasetId}`);
    return 0;
  }

  let totalInserted = 0;

  for (const resource of resources) {
    console.log(`  ↓ ${resource.name}: ${resource.url}`);
    const csv = await fetchCsvText(resource.url);
    if (!csv) {
      console.warn(`  ⚠  Failed to download ${resource.url}`);
      continue;
    }

    const rows = parseSimpleCsv(csv);
    console.log(`    Parsed ${rows.length} rows`);

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const extracted = extractResult(row, dataset.electionType);
      if (!extracted) { skipped++; continue; }

      try {
        await prisma.electionResult.create({
          data: {
            electionDate: dataset.electionDate,
            electionType: dataset.electionType,
            jurisdiction: extracted.jurisdiction,
            jurisdictionCode: extracted.jurisdictionCode,
            candidateName: extracted.candidateName,
            partyName: extracted.partyName,
            votesReceived: extracted.votesReceived,
            totalVotesCast: extracted.totalVotesCast,
            percentage: extracted.percentage,
            won: extracted.won,
            province: dataset.province,
            source: "ontario_open_data",
          },
        });
        inserted++;
      } catch {
        skipped++;
      }
    }

    console.log(`    ✓ Inserted ${inserted}, skipped ${skipped}`);
    totalInserted += inserted;
  }

  return totalInserted;
}

async function main() {
  console.log("🗳  Ontario Election Results Ingestion");
  console.log("══════════════════════════════════════");

  let grand = 0;
  for (const dataset of DATASETS) {
    grand += await ingestDataset(dataset);
    // Brief pause between datasets
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ Total inserted: ${grand} records`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
