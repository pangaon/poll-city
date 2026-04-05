/**
 * Ingest representatives from the Represent OpenNorth API.
 *
 * Fetches:
 *   - All 338 federal MPs (House of Commons)
 *   - All Ontario MPPs (Ontario Legislature)
 *   - All Toronto City Councillors
 *
 * Upserts each into the Official table with correct level and province.
 *
 * Usage: npx tsx prisma/seeds/ingest-representatives.ts
 */

import { PrismaClient, GovernmentLevel } from "@prisma/client";

const prisma = new PrismaClient();

const BASE = "https://represent.opennorth.ca";

interface Office {
  tel?: string;
  fax?: string;
  postal?: string;
  type?: string;
}

interface Representative {
  name: string;
  first_name?: string;
  last_name?: string;
  elected_office: string;
  district_name: string;
  district_id?: string;
  party_name?: string;
  email?: string;
  photo_url?: string;
  personal_url?: string;
  url?: string;
  source_url?: string;
  offices?: Office[];
  representative_set_name?: string;
}

interface ApiMeta {
  offset: number;
  limit: number;
  total_count: number;
  previous: string | null;
  next: string | null;
}

interface ApiList<T> {
  objects: T[];
  meta: ApiMeta;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, attempts = 3): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) {
        console.error(`  HTTP ${res.status} for ${url}`);
        if (i === attempts - 1) return null;
        await sleep(2000);
        continue;
      }
      return (await res.json()) as T;
    } catch (err) {
      console.error(`  fetch error: ${(err as Error).message}`);
      if (i === attempts - 1) return null;
      await sleep(2000);
    }
  }
  return null;
}

/**
 * Fetch every representative from a set, paginating via meta.next.
 */
async function fetchAllReps(setSlug: string): Promise<Representative[]> {
  const all: Representative[] = [];
  let nextUrl: string | null = `${BASE}/representatives/${setSlug}/?limit=200`;
  let page = 0;

  while (nextUrl) {
    page++;
    console.log(`  Fetching page ${page}: ${nextUrl}`);
    const data = await fetchJson<ApiList<Representative>>(nextUrl);
    if (!data) {
      console.error(`  Failed to fetch page ${page}, stopping.`);
      break;
    }
    console.log(`    Got ${data.objects.length} records (total so far: ${all.length + data.objects.length} / ${data.meta.total_count})`);
    all.push(...data.objects);
    nextUrl = data.meta?.next ? `${BASE}${data.meta.next}` : null;
    if (nextUrl) await sleep(600);
  }

  return all;
}

function extractPhone(offices: Office[] | undefined): string | null {
  if (!offices || offices.length === 0) return null;
  const constit = offices.find((o) => o.type === "constituency" && o.tel);
  if (constit?.tel) return constit.tel;
  const first = offices.find((o) => o.tel);
  return first?.tel ?? null;
}

function extractAddress(offices: Office[] | undefined): string | null {
  if (!offices || offices.length === 0) return null;
  const constit = offices.find((o) => o.type === "constituency" && o.postal);
  if (constit?.postal) return constit.postal.replace(/\n/g, ", ");
  const first = offices.find((o) => o.postal);
  return first?.postal ? first.postal.replace(/\n/g, ", ") : null;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(2000 * (i + 1));
    }
  }
  throw lastErr;
}

async function upsertRep(
  rep: Representative,
  setSlug: string,
  level: GovernmentLevel,
  province: string | null
): Promise<"created" | "updated" | "skipped"> {
  if (!rep.name?.trim() || !rep.district_name?.trim()) return "skipped";

  const districtKey = rep.district_id ?? rep.district_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const externalId = `${setSlug}-${districtKey}`.slice(0, 180);

  const phone = extractPhone(rep.offices);
  const address = extractAddress(rep.offices);

  try {
    const existing = await withRetry(() =>
      prisma.official.findFirst({ where: { externalId } })
    );

    const data = {
      name: rep.name.trim(),
      firstName: rep.first_name?.trim() || null,
      lastName: rep.last_name?.trim() || null,
      title: rep.elected_office?.trim() || "Councillor",
      level,
      district: rep.district_name.trim(),
      districtCode: rep.district_id ?? null,
      party: rep.party_name || null,
      partyName: rep.party_name || null,
      email: rep.email || null,
      phone,
      address,
      photoUrl: rep.photo_url || null,
      website: rep.personal_url || rep.url || rep.source_url || null,
      province,
      isActive: true,
      externalSource: "represent_opennorth",
    };

    if (existing) {
      await withRetry(() =>
        prisma.official.update({ where: { id: existing.id }, data })
      );
      return "updated";
    } else {
      await withRetry(() =>
        prisma.official.create({
          data: { ...data, isClaimed: false, externalId },
        })
      );
      return "created";
    }
  } catch (err) {
    console.error(`  ❌ ${rep.name}: ${(err as Error).message.split("\n")[0]}`);
    return "skipped";
  }
}

interface IngestJob {
  slug: string;
  label: string;
  level: GovernmentLevel;
  province: string | null;
}

const JOBS: IngestJob[] = [
  { slug: "house-of-commons", label: "Federal MPs (House of Commons)", level: "federal", province: null },
  { slug: "ontario-legislature", label: "Ontario MPPs (Legislative Assembly)", level: "provincial", province: "ON" },
  { slug: "bc-legislature", label: "BC MLAs (Legislative Assembly)", level: "provincial", province: "BC" },
  { slug: "toronto-city-council", label: "Toronto City Council", level: "municipal", province: "ON" },
];

async function main() {
  console.log("🏛  Canadian Representatives Ingestion");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  let grandCreated = 0;
  let grandUpdated = 0;
  let grandSkipped = 0;

  for (const job of JOBS) {
    console.log(`\n📋 ${job.label}`);
    console.log("───────────────────────────────────────────────────────────────────");

    const reps = await fetchAllReps(job.slug);
    console.log(`  Total fetched: ${reps.length}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rep of reps) {
      const result = await upsertRep(rep, job.slug, job.level, job.province);
      if (result === "created") created++;
      else if (result === "updated") updated++;
      else skipped++;
    }

    console.log(`  ✅ ${created} created, ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ""}`);

    grandCreated += created;
    grandUpdated += updated;
    grandSkipped += skipped;
  }

  const totalInDb = await prisma.official.count();

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log(`✅ Created:  ${grandCreated}`);
  console.log(`🔄 Updated:  ${grandUpdated}`);
  console.log(`⏭  Skipped:  ${grandSkipped}`);
  console.log(`📊 Total officials in database: ${totalInDb}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("Ingestion failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
