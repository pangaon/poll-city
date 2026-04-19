import { chromium } from "playwright";
import type { RawCandidate, CkanPackage, CkanApiResponse } from "./types";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";

const SEARCH_TERMS = [
  "election candidates",
  "candidates election",
  "municipal election",
  "candidate list",
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

async function fetchJson<T>(browser: Awaited<ReturnType<typeof chromium.launch>>, url: string): Promise<T> {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);
    return JSON.parse(text) as T;
  } finally {
    await page.close();
  }
}

async function discoverElectionPackage(
  browser: Awaited<ReturnType<typeof chromium.launch>>
): Promise<CkanPackage | null> {
  for (const term of SEARCH_TERMS) {
    const url = `${CKAN_BASE}/api/3/action/package_search?q=${encodeURIComponent(term)}&rows=20`;
    const resp = await fetchJson<CkanApiResponse<{ results: CkanPackage[] }>>(browser, url);
    if (!resp.success) continue;

    const pkg = resp.result.results.find(
      (p) =>
        p.title.toLowerCase().includes("candidate") ||
        p.name.toLowerCase().includes("candidate")
    );
    if (pkg) return pkg;
  }
  return null;
}

function pickCsvResource(pkg: CkanPackage): { url: string; name: string } | null {
  const csv = pkg.resources.find(
    (r) => r.format.toLowerCase() === "csv"
  );
  if (!csv) return null;
  return { url: csv.url, name: csv.name };
}

function detectElectionYear(pkg: CkanPackage): number {
  const text = pkg.title + " " + pkg.name;
  const match = text.match(/20\d{2}/);
  return match ? parseInt(match[0], 10) : new Date().getFullYear();
}

async function downloadCsv(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  url: string
): Promise<string> {
  const page = await browser.newPage();
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response || !response.ok()) {
      throw new Error(`CSV download failed: HTTP ${response?.status()}`);
    }
    return await page.evaluate(() => document.body.innerText);
  } finally {
    await page.close();
  }
}

function parseCandidatesFromCsv(
  csv: string,
  municipality: string,
  electionYear: number
): RawCandidate[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const colMap = mapColumns(headers);

  const nameCol = colMap["candidate_name"] ?? colMap["name"] ?? colMap["candidate"] ?? null;
  const officeCol =
    colMap["office"] ?? colMap["position"] ?? colMap["office_name"] ?? colMap["contest_name"] ?? null;
  const wardCol = colMap["ward"] ?? colMap["ward_name"] ?? colMap["district"] ?? null;

  if (nameCol === null || officeCol === null) {
    throw new Error(
      `Cannot find required columns. Headers found: ${headers.join(", ")}`
    );
  }

  const candidates: RawCandidate[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;

    const rawData: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      rawData[h] = fields[idx] ?? null;
    });

    const wardStr = wardCol !== null ? (fields[wardCol] ?? null) : null;

    candidates.push({
      candidateName: fields[nameCol] ?? "",
      office: fields[officeCol] ?? "",
      ward: wardStr,
      wardNumber: extractWardNumber(wardStr),
      municipality,
      province: "ON",
      electionYear,
      rawData,
    });
  }

  return candidates.filter((c) => c.candidateName.length > 0 && c.office.length > 0);
}

export async function scrapeToronto(): Promise<{
  candidates: RawCandidate[];
  sourceUrl: string;
}> {
  const browser = await chromium.launch({ headless: true });
  try {
    const pkg = await discoverElectionPackage(browser);
    if (!pkg) {
      throw new Error("Could not discover election candidate dataset on Toronto CKAN");
    }

    const csv = pickCsvResource(pkg);
    if (!csv) {
      throw new Error(`No CSV resource found in package: ${pkg.name}`);
    }

    const electionYear = detectElectionYear(pkg);
    const rawCsv = await downloadCsv(browser, csv.url);
    const candidates = parseCandidatesFromCsv(rawCsv, "toronto", electionYear);

    return { candidates, sourceUrl: csv.url };
  } finally {
    await browser.close();
  }
}
