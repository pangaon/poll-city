/**
 * Ingest Ontario boundary / geo-district data from the Represent OpenNorth API.
 * Populates the GeoDistrict table with ward/riding → postal prefix mappings
 * using the Represent postcodes endpoint as a lookup layer.
 *
 * Strategy:
 *   - Fetch Ontario boundary sets from Represent
 *   - Pre-populate known Ontario postal prefixes via the postcodes endpoint
 *   - The /api/geo route will also call Represent live and cache results here
 *
 * Usage:  npx tsx prisma/seeds/ingest-boundaries.ts
 */

import { PrismaClient, GovernmentLevel } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://represent.opennorth.ca";

// Sample of Ontario FSA (forward sortation area) postal prefixes to pre-seed.
// Full Ontario FSA list: L, M, K, N, P prefixes.
// We'll fetch the most populous ones covering Toronto, Ottawa, Hamilton, etc.
const ONTARIO_POSTAL_PREFIXES = [
  // Toronto (M)
  "M1B","M1C","M1E","M1G","M1H","M1J","M1K","M1L","M1M","M1N","M1P","M1R",
  "M1S","M1T","M1V","M1W","M1X","M2H","M2J","M2K","M2L","M2M","M2N","M2P",
  "M2R","M3A","M3B","M3C","M3H","M3J","M3K","M3L","M3M","M3N","M4A","M4B",
  "M4C","M4E","M4G","M4H","M4J","M4K","M4L","M4M","M4N","M4P","M4R","M4S",
  "M4T","M4V","M4W","M4X","M4Y","M5A","M5B","M5C","M5E","M5G","M5H","M5J",
  "M5K","M5L","M5M","M5N","M5P","M5R","M5S","M5T","M5V","M5W","M5X","M6A",
  "M6B","M6C","M6E","M6G","M6H","M6J","M6K","M6L","M6M","M6N","M6P","M6R",
  "M6S","M7A","M7Y","M8V","M8W","M8X","M8Y","M8Z","M9A","M9B","M9C","M9L",
  "M9M","M9N","M9P","M9R","M9V","M9W",
  // Ottawa (K)
  "K1A","K1B","K1C","K1E","K1G","K1H","K1J","K1K","K1L","K1M","K1N","K1P",
  "K1R","K1S","K1T","K1V","K1W","K1X","K1Y","K1Z","K2A","K2B","K2C","K2E",
  "K2G","K2H","K2J","K2K","K2L","K2M","K2P","K2R","K2S","K2T","K2V","K2W",
  // Hamilton/Niagara (L)
  "L8E","L8G","L8H","L8J","L8K","L8L","L8M","L8N","L8P","L8R","L8S","L8T",
  "L8V","L8W","L9A","L9B","L9C","L9G","L9H","L9K","L6P","L6R","L6S","L6T",
  // London/Windsor (N)
  "N5W","N5X","N5Y","N5Z","N6A","N6B","N6C","N6E","N6G","N6H","N6J","N6K",
  "N8H","N8M","N8N","N8P","N8R","N8S","N8T","N8W","N8X","N8Y","N9A","N9B",
  "N9C","N9E","N9G","N9H","N9J","N9K","N9V","N9W","N9Y",
  // Northern Ontario (P)
  "P3A","P3B","P3C","P3E","P3G","P3L","P3N","P3P","P3Y","P6A","P6B","P6C",
];

interface BoundarySet {
  name: string;
  url: string;
  related: {
    boundaries_url: string;
    boundaries_centroid_url?: string;
  };
}

interface ApiList<T> {
  count: number;
  next: string | null;
  objects: T[];
}

interface PostcodeResult {
  code: string;
  representatives: Array<{
    name: string;
    elected_office: string;
    district_name: string;
    representative_set_name: string;
    related?: {
      boundary_url?: string;
    };
  }>;
  boundaries_centroid?: Array<{
    name: string;
    set: string;
    related: { boundary_set_url?: string };
  }>;
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOntario(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("ontario") ||
    lower.includes("toronto") ||
    lower.includes("ottawa") ||
    lower.includes("hamilton") ||
    lower.includes("-on-") ||
    lower.startsWith("on-") ||
    lower.endsWith("-on")
  );
}

function detectLevel(setName: string): GovernmentLevel {
  const lower = setName.toLowerCase();
  if (lower.includes("federal") || lower.includes("electoral district") || lower.includes("riding")) return "federal";
  if (lower.includes("provincial") || lower.includes("legislative")) return "provincial";
  return "municipal";
}

// ─── core logic ──────────────────────────────────────────────────────────────

async function processPostalPrefix(prefix: string): Promise<{ municipal: boolean; federal: boolean; provincial: boolean }> {
  const data = await fetchJson<PostcodeResult>(`${BASE}/postcodes/${prefix}1A1/`);
  if (!data) return { municipal: false, federal: false, provincial: false };

  const results = { municipal: false, federal: false, provincial: false };

  let ward: string | undefined;
  let wardCode: string | undefined;
  let riding: string | undefined;
  let ridingCode: string | undefined;
  let city: string | undefined;

  for (const rep of data.representatives ?? []) {
    const setName = rep.representative_set_name ?? "";
    const level = detectLevel(setName);

    if (level === "municipal" && !ward) {
      ward = rep.district_name;
      city = setName.replace(/city council/i, "").trim();
    } else if (level === "federal" && !riding) {
      riding = rep.district_name;
      ridingCode = rep.related?.boundary_url?.split("/").filter(Boolean).pop();
    }
  }

  // Also try boundaries_centroid for provincial
  for (const b of data.boundaries_centroid ?? []) {
    const level = detectLevel(b.set ?? "");
    if (level === "provincial" && !riding) {
      riding = b.name;
    }
  }

  // Upsert municipal record
  if (ward || city) {
    try {
      await prisma.geoDistrict.upsert({
        where: { postalPrefix_level: { postalPrefix: prefix, level: "municipal" } },
        create: { postalPrefix: prefix, ward, wardCode, province: "ON", city, level: "municipal" },
        update: { ward, wardCode, city },
      });
      results.municipal = true;
    } catch { /* skip */ }
  }

  // Upsert federal record
  if (riding) {
    try {
      await prisma.geoDistrict.upsert({
        where: { postalPrefix_level: { postalPrefix: prefix, level: "federal" } },
        create: { postalPrefix: prefix, riding, ridingCode, province: "ON", level: "federal" },
        update: { riding, ridingCode },
      });
      results.federal = true;
    } catch { /* skip */ }
  }

  return results;
}

async function main() {
  console.log("🗺  Ontario Geo-District / Boundaries Ingestion");
  console.log("══════════════════════════════════════════════");

  console.log(`\nSeeding ${ONTARIO_POSTAL_PREFIXES.length} Ontario postal prefixes via Represent API...`);
  console.log("(Rate: 1 request/sec to respect API limits)\n");

  let municipal = 0;
  let federal = 0;
  let failed = 0;

  for (let i = 0; i < ONTARIO_POSTAL_PREFIXES.length; i++) {
    const prefix = ONTARIO_POSTAL_PREFIXES[i];
    process.stdout.write(`  [${i + 1}/${ONTARIO_POSTAL_PREFIXES.length}] ${prefix}... `);

    try {
      const result = await processPostalPrefix(prefix);
      if (result.municipal) municipal++;
      if (result.federal) federal++;
      console.log(`✓ (municipal: ${result.municipal}, federal: ${result.federal})`);
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      failed++;
    }

    await sleep(1000); // 1 req/s rate limit
  }

  console.log(`\n✅ Done`);
  console.log(`   Municipal records: ${municipal}`);
  console.log(`   Federal records: ${federal}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n💡 The /api/geo route will cache additional lookups in GeoDistrict on demand.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
