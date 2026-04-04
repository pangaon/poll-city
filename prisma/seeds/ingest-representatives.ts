/**
 * Ingest Ontario elected representatives from the Represent OpenNorth API.
 * For every official imported, auto-creates a public Campaign profile.
 *
 * Sources:
 *   - https://represent.opennorth.ca/ (representative sets, representatives)
 *   - Ontario MPP list via Ontario Legislative Assembly representative set
 *
 * Usage:  npx tsx prisma/seeds/ingest-representatives.ts
 */

import { PrismaClient, GovernmentLevel } from "@prisma/client";

const prisma = new PrismaClient();

const BASE = "https://represent.opennorth.ca";

// Ontario MPPs live in this representative set
const ONTARIO_MPP_SET = "ontario-legislative-assembly";

// Keywords that identify Ontario representative sets (case-insensitive)
const ONTARIO_KEYWORDS = [
  "ontario",
  "toronto",
  "ottawa",
  "hamilton",
  "london",
  "brampton",
  "mississauga",
  "markham",
  "vaughan",
  "richmond hill",
  "kingston",
  "windsor",
  "sudbury",
  "thunder bay",
  "barrie",
  "guelph",
  "kitchener",
  "waterloo",
  "cambridge",
  "oshawa",
  "ajax",
  "pickering",
  "whitby",
  "durham",
  "peel",
  "york",
  "halton",
  "niagara",
  "peterborough",
  "brantford",
  "belleville",
  "sault ste. marie",
];

interface RepresentativeSet {
  name: string;
  url: string;
  related: { representatives_url: string };
}

interface ApiList<T> {
  count: number;
  next: string | null;
  objects: T[];
}

interface Representative {
  name: string;
  elected_office: string;
  district_name: string;
  district_id: string;
  party_name?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  personal_url?: string;
  source_url?: string;
  extra?: {
    ward_name?: string;
    riding?: string;
  };
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
  return ONTARIO_KEYWORDS.some((kw) => lower.includes(kw));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

function detectLevel(setName: string, office: string): GovernmentLevel {
  const combined = (setName + " " + office).toLowerCase();
  if (combined.includes("mp ") || combined.includes("federal") || combined.includes("parliament") || combined.includes("house of commons")) {
    return "federal";
  }
  if (combined.includes("mpp") || combined.includes("provincial") || combined.includes("legislative assembly") || combined.includes("legislature")) {
    return "provincial";
  }
  return "municipal";
}

// ─── core logic ──────────────────────────────────────────────────────────────

async function paginateRepresentatives(url: string): Promise<Representative[]> {
  const allReps: Representative[] = [];
  let nextUrl: string | null = `${BASE}${url}&limit=200`;

  while (nextUrl) {
    const data = await fetchJson<ApiList<Representative>>(nextUrl);
    if (!data) break;
    allReps.push(...data.objects);
    nextUrl = data.next ? `${BASE}${data.next}` : null;
    if (nextUrl) await sleep(1000); // respect rate limiting
  }

  return allReps;
}

async function importRepresentativeSet(set: RepresentativeSet): Promise<number> {
  const reps = await paginateRepresentatives(set.related.representatives_url);
  let count = 0;

  for (const rep of reps) {
    if (!rep.name?.trim() || !rep.district_name?.trim()) continue;

    const level = detectLevel(set.name, rep.elected_office ?? "");
    const externalId = `${set.url.replace(/\//g, ":")}:${rep.district_id ?? rep.district_name}`;

    // Upsert Official
    const official = await prisma.official.upsert({
      where: { id: externalId },
      create: {
        id: externalId,
        name: rep.name.trim(),
        title: rep.elected_office?.trim() || "Councillor",
        level,
        district: rep.district_name.trim(),
        party: rep.party_name || null,
        email: rep.email || null,
        phone: rep.phone || null,
        photoUrl: rep.photo_url || null,
        website: rep.personal_url || rep.source_url || null,
        province: "ON",
        isClaimed: false,
        isActive: true,
        externalId: rep.district_id ?? null,
        externalSource: "represent_opennorth",
      },
      update: {
        name: rep.name.trim(),
        title: rep.elected_office?.trim() || "Councillor",
        district: rep.district_name.trim(),
        party: rep.party_name || null,
        email: rep.email || null,
        phone: rep.phone || null,
        photoUrl: rep.photo_url || null,
        website: rep.personal_url || rep.source_url || null,
      },
    });

    // Auto-create a public Campaign for this official (if not already exists)
    const existingCampaign = await prisma.campaign.findFirst({
      where: { officialId: official.id },
    });

    if (!existingCampaign) {
      const nameParts = rep.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "rep";
      const lastName = nameParts.slice(1).join(" ") || "unknown";
      const baseSlug = slugify(`${firstName} ${lastName} ${rep.district_name}`);
      const slug = await ensureUniqueSlug(baseSlug);

      await prisma.campaign.create({
        data: {
          name: rep.name.trim(),
          slug,
          candidateName: rep.name.trim(),
          candidateTitle: rep.elected_office?.trim() || "Councillor",
          jurisdiction: rep.district_name.trim(),
          isPublic: true,
          isActive: true,
          officialId: official.id,
          electionType: level === "federal" ? "federal" : level === "provincial" ? "provincial" : "municipal",
        },
      });

      count++;
    }
  }

  return count;
}

async function main() {
  console.log("🏛  Ontario Representatives Ingestion");
  console.log("══════════════════════════════════════");

  // 1) Paginate all representative sets
  console.log("\n📋 Fetching representative sets...");
  const allSets: RepresentativeSet[] = [];
  let nextUrl: string | null = `${BASE}/representative-sets/?limit=200`;

  while (nextUrl) {
    const data = await fetchJson<ApiList<RepresentativeSet>>(nextUrl);
    if (!data) break;
    allSets.push(...data.objects);
    nextUrl = data.next ? `${BASE}${data.next}` : null;
    if (nextUrl) await sleep(1000);
  }

  console.log(`  Found ${allSets.length} total representative sets`);

  // 2) Filter for Ontario sets
  const ontarioSets = allSets.filter((s) => isOntario(s.name));
  console.log(`  Filtered to ${ontarioSets.length} Ontario representative sets`);

  // 3) Also ensure provincial MPP set is included
  if (!ontarioSets.find((s) => s.url.includes(ONTARIO_MPP_SET))) {
    const mppSet = allSets.find((s) => s.url.includes(ONTARIO_MPP_SET));
    if (mppSet) {
      ontarioSets.unshift(mppSet);
      console.log(`  + Added Ontario MPP set explicitly`);
    }
  }

  // 4) Import each set
  let totalCreated = 0;

  for (const set of ontarioSets) {
    process.stdout.write(`  → ${set.name}... `);
    try {
      const created = await importRepresentativeSet(set);
      console.log(`${created} new profiles`);
      totalCreated += created;
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
    await sleep(1000); // respect rate limiting between sets
  }

  console.log(`\n✅ Total new Official + Campaign profiles created: ${totalCreated}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
