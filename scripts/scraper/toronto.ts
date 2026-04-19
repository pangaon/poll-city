import type { RawCandidate, CkanPackage, CkanApiResponse } from "./types";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";

// Toronto CKAN has election RESULTS (not a separate candidates list).
// Results include every candidate who ran + their vote counts.
// Package IDs in order of preference (unofficial first — available faster post-election).
const RESULT_PACKAGE_IDS = [
  "election-results-unofficial",
  "election-results-official",
];

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    map[normalized] = i;
  });
  return map;
}

export function extractWardNumber(ward: string | null | undefined): number | null {
  if (!ward) return null;
  const match = ward.match(/ward\s+(\d+)/i) ?? ward.match(/^(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

interface CkanOfficeCandidate {
  name: string;
  votesReceived?: string;
  [key: string]: unknown;
}

interface CkanWard {
  num?: string;
  name?: string;
  candidate?: CkanOfficeCandidate[];
  [key: string]: unknown;
}

interface CkanOffice {
  id?: number;
  name: string;
  ward?: CkanWard[];
  candidate?: CkanOfficeCandidate[];
  [key: string]: unknown;
}

interface CkanResultsJson {
  electionDesc: string;
  office: CkanOffice[];
  seq?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

async function discoverResultsPackage(): Promise<CkanPackage | null> {
  for (const id of RESULT_PACKAGE_IDS) {
    const url = `${CKAN_BASE}/api/3/action/package_show?id=${id}`;
    const resp = await fetchJson<CkanApiResponse<CkanPackage>>(url);
    if (resp.success && resp.result) return resp.result;
  }
  return null;
}

function pickJsonResource(pkg: CkanPackage): { url: string; name: string } | null {
  const jsonResources = pkg.resources.filter((r) => r.format.toLowerCase() === "json");
  if (!jsonResources.length) return null;

  // The wardbyward JSON only has Mayor. The main results JSON has all offices.
  // Prefer the one WITHOUT "wardbyward" in the name.
  const mainResult = jsonResources.find(
    (r) => !r.name.toLowerCase().includes("wardbyward")
  ) ?? jsonResources[0];

  return { url: mainResult.url, name: mainResult.name };
}

function detectElectionYear(pkg: CkanPackage): number {
  const text = pkg.title + " " + pkg.name;
  const resources = pkg.resources.map((r) => r.name).join(" ");
  const match = (text + " " + resources).match(/20\d{2}/);
  return match ? parseInt(match[0], 10) : new Date().getFullYear();
}

function parseResultsJson(
  data: CkanResultsJson,
  municipality: string,
  electionYear: number
): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  const offices = Array.isArray(data.office) ? data.office : [data.office];

  for (const office of offices) {
    if (!office?.name) continue;

    const officeName = office.name;
    const wards = office.ward && office.ward.length > 0 ? office.ward : [null];

    for (const ward of wards) {
      const wardName = ward?.name ?? null;
      const wardNum = ward?.num ? parseInt(ward.num, 10) : null;
      const candidateList = ward?.candidate ?? office.candidate ?? [];

      for (const c of candidateList) {
        if (!c.name) continue;
        const rawData: Record<string, unknown> = {
          officeName,
          wardName,
          wardNum,
          ...c,
        };
        candidates.push({
          candidateName: c.name,
          office: officeName,
          ward: wardName,
          wardNumber: wardNum,
          municipality,
          province: "ON",
          electionYear,
          rawData,
        });
      }
    }
  }

  return candidates;
}

export async function scrapeToronto(): Promise<{
  candidates: RawCandidate[];
  sourceUrl: string;
}> {
  const pkg = await discoverResultsPackage();
  if (!pkg) {
    throw new Error("Could not find election results package on Toronto CKAN");
  }

  const resource = pickJsonResource(pkg);
  if (!resource) {
    throw new Error(`No JSON resource found in package: ${pkg.name}`);
  }

  const electionYear = detectElectionYear(pkg);
  const data = await fetchJson<CkanResultsJson>(resource.url);
  const candidates = parseResultsJson(data, "toronto", electionYear);

  return { candidates, sourceUrl: resource.url };
}
