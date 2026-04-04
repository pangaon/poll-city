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
import Papa from "papaparse";

const prisma = new PrismaClient();

// ─── direct CSV URLs from data.ontario.ca municipal election dataset ──────────
// Dataset: https://data.ontario.ca/dataset/municipal-election-results
const ELECTIONS = [
  {
    label: "2022 Ontario Municipal Election",
    csvUrl:
      "https://data.ontario.ca/dataset/a5871234-ed52-4c79-af33-b205aee59fd3/resource/7f408f5e-71c7-43fa-82bf-5eb8be77b9a7/download/2022_municipal_election_-_successful_candidate_data_as_of_voting_day.csv",
    electionDate: new Date("2022-10-24"),
    electionType: "municipal" as const,
    province: "ON",
  },
  {
    label: "2018 Ontario Municipal Election",
    csvUrl:
      "https://data.ontario.ca/dataset/a5871234-ed52-4c79-af33-b205aee59fd3/resource/80304bc4-1ab9-443e-876a-9f79dcbd2c98/download/2018_municipal_election_-_candidate_data_-_csv_for_release_-_2020-05-12.csv",
    electionDate: new Date("2018-10-22"),
    electionType: "municipal" as const,
    province: "ON",
  },
  {
    label: "2014 Ontario Municipal Election",
    csvUrl:
      "https://data.ontario.ca/dataset/a5871234-ed52-4c79-af33-b205aee59fd3/resource/562a2b81-b4b0-41ee-97dc-33f10c400f61/download/2014_municipal_election_-_candidate_data.csv",
    electionDate: new Date("2014-10-27"),
    electionType: "municipal" as const,
    province: "ON",
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fetchCsvText(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) {
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 3000 * attempt)); continue; }
        return null;
      }
      return res.text();
    } catch {
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 3000 * attempt)); continue; }
      return null;
    }
  }
  return null;
}

function parseCsv(csv: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/\s+/g, " ").trim(),
  });
  return result.data;
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
    [
      get(
        "First Name", "FirstName",
        "Name of Person Elected First Name",
        "Name Of Person Elected First Name",
        "FIRST_NAME"
      ),
      get(
        "Last Name", "LastName",
        "Name of Person Elected Last Name",
        "Name Of Person Elected Last Name",
        "LAST_NAME"
      ),
    ]
      .filter(Boolean)
      .join(" ");

  const jurisdiction = get(
    "Electoral District Name",
    "Riding",
    "RidingName",
    "constituency_name",
    "Municipality",
    "MUNICIPALITY",
    "Municipality Name",
    "MUNICIPALITY NAME",
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
    "Nombre de voix",
    "VOTES_FOR_CANDIDATE",
    "Votes For Candidate",
    "VotesForCandidate",
    "Number of Votes Cast for the Candidate",
    "Number Of Votes Cast For The Candidate"
  ).replace(/,/g, "");

  const totalStr = get(
    "Total Ballots Cast",
    "TotalVotes",
    "total_votes_cast",
    "Total Valid Ballots",
    "Votes Cast",
    "VOTES_FOR_OFFICE",
    "Votes For Office",
    "VotesForOffice",
    "Number of Votes Cast for the Office",
    "Number Of Votes Cast For The Office"
  ).replace(/,/g, "");

  const pctStr = get("Percentage", "VotePercentage", "Percent", "vote_percentage", "%")
    .replace("%", "")
    .replace(",", ".");

  const wonStr = get(
    "Elected",
    "Won",
    "is_elected",
    "Elected?",
    "Resulted",
    "Status",
    "ELECTED_OR_ACCLAIMED",
    "Elected Or Acclaimed",
    "ElectedOrAcclaimed"
  );

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
    /^(yes|true|1|elected|winner|x|acclaimed)$/i.test(wonStr.trim());

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

async function ingestElection(election: (typeof ELECTIONS)[0]) {
  console.log(`\n📥 ${election.label}`);
  console.log(`  ↓ ${election.csvUrl}`);

  const csv = await fetchCsvText(election.csvUrl);
  if (!csv) {
    console.warn(`  ⚠  Failed to download CSV. Skipping.`);
    return 0;
  }

  const rows = parseCsv(csv);
  console.log(`  Parsed ${rows.length} rows`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const extracted = extractResult(row, election.electionType);
    if (!extracted) { skipped++; continue; }

    try {
      await prisma.electionResult.create({
        data: {
          electionDate: election.electionDate,
          electionType: election.electionType,
          jurisdiction: extracted.jurisdiction,
          jurisdictionCode: extracted.jurisdictionCode,
          candidateName: extracted.candidateName,
          partyName: extracted.partyName,
          votesReceived: extracted.votesReceived,
          totalVotesCast: extracted.totalVotesCast,
          percentage: extracted.percentage,
          won: extracted.won,
          province: election.province,
          source: "ontario_open_data",
        },
      });
      inserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`  ✓ Inserted ${inserted}, skipped ${skipped}`);
  return inserted;
}

async function main() {
  console.log("🗳  Ontario Election Results Ingestion");
  console.log("══════════════════════════════════════");

  let grand = 0;
  for (const election of ELECTIONS) {
    grand += await ingestElection(election);
    await new Promise((r) => setTimeout(r, 2000)); // avoid rate limiting
  }

  console.log(`\n✅ Total inserted: ${grand} records`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
