/**
 * update-officials-2025.ts — Poll City v2.0.0
 *
 * Updates the Official table to reflect the 2025 Canadian election results:
 *
 * 45th Federal Election — April 28, 2025 → Liberal minority government, 343 seats
 * Ontario Provincial Election — February 27, 2025 → PC Party majority, 124 MPPs, 44th Parliament
 *
 * Strategy:
 * 1. Fetch current Ontario MPPs from Represent API → upsert → set isActive=true, partyName
 * 2. Fetch current Canadian MPs from Represent API → upsert Ontario MPs → set isActive=true, partyName
 * 3. Any provincial/federal Official NOT seen in either call → set isActive=false
 * 4. Municipal officials are never touched (isActive left unchanged)
 *
 * NOTE: Represent API may not be reachable from dev machine (network restriction).
 * Run from Railway: npm run db:update-2025
 */

import prisma from "../../src/lib/db/prisma";

const TIMEOUT_MS = 30_000;
const ON_MPPS_URL = "https://represent.opennorth.ca/representatives/ontario-legislature/?limit=200&format=json";
const FEDERAL_MPS_URL = "https://represent.opennorth.ca/representatives/house-of-commons/?limit=400&format=json";

interface RepresentRep {
  name: string;
  first_name?: string;
  last_name?: string;
  district_name: string;
  elected_office: string;
  party_name?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  url?: string;
  extra?: { province?: string; [key: string]: unknown };
}

interface RepresentPage {
  objects: RepresentRep[];
  meta: { next: string | null; total_count: number };
}

async function fetchPage(url: string): Promise<RepresentPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return (await res.json()) as RepresentPage;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAll(startUrl: string): Promise<RepresentRep[]> {
  const all: RepresentRep[] = [];
  let next: string | null = startUrl;
  let page = 0;
  while (next) {
    page++;
    console.log(`    Page ${page}: ${next}`);
    let data: RepresentPage;
    try {
      data = await fetchPage(next);
    } catch (err) {
      console.error(`    ✗ Failed page ${page}:`, (err as Error).message);
      break;
    }
    all.push(...(data.objects ?? []));
    next = data.meta?.next ?? null;
  }
  return all;
}

async function upsertOfficial(
  rep: RepresentRep,
  level: "provincial" | "federal"
): Promise<boolean> {
  try {
    const name = rep.name?.trim();
    const district = rep.district_name?.trim();
    if (!name || !district) return false;

    const existing = await prisma.official.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        district: { equals: district, mode: "insensitive" },
        level,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.official.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          partyName: rep.party_name ?? null,
          party: rep.party_name ?? null,
          photoUrl: rep.photo_url ?? undefined,
          email: rep.email ?? undefined,
          phone: rep.phone ?? undefined,
          website: rep.url ?? undefined,
          firstName: rep.first_name ?? undefined,
          lastName: rep.last_name ?? undefined,
        },
      });
    } else {
      // Unique constraint hint: enforce (name, level, district) in code before insertion.
      await prisma.official.create({
        data: {
          name,
          title: rep.elected_office?.trim() ?? (level === "provincial" ? "MPP" : "MP"),
          level,
          district,
          partyName: rep.party_name ?? null,
          party: rep.party_name ?? null,
          photoUrl: rep.photo_url ?? null,
          email: rep.email ?? null,
          phone: rep.phone ?? null,
          website: rep.url ?? null,
          firstName: rep.first_name ?? null,
          lastName: rep.last_name ?? null,
          isActive: true,
          externalSource: "represent_opennorth",
        },
      });
    }
    return true;
  } catch (err) {
    console.error(`    ✗ Error upserting ${rep.name}:`, (err as Error).message);
    return false;
  }
}

async function main() {
  console.log("=== Officials 2025 Update Script — Poll City v2.0.0 ===");
  console.log(`Started: ${new Date().toISOString()}\n`);

  let mppUpdated = 0;
  let mpUpdated = 0;
  let markedInactive = 0;
  let errors = 0;

  const seenIds = new Set<string>();

  // ── 1. Ontario MPPs (2025 election results) ──
  console.log("1. Fetching Ontario MPPs from Represent API…");
  let mpps: RepresentRep[] = [];
  try {
    mpps = await fetchAll(ON_MPPS_URL);
    console.log(`   Found ${mpps.length} MPPs\n`);
  } catch (err) {
    console.error("   ✗ Ontario MPP fetch failed:", (err as Error).message);
    errors++;
  }

  for (const rep of mpps) {
    const ok = await upsertOfficial(rep, "provincial");
    if (ok) {
      mppUpdated++;
      // Track by name for inactive marking
      const existing = await prisma.official.findFirst({
        where: { name: { equals: rep.name?.trim(), mode: "insensitive" }, level: "provincial" },
        select: { id: true },
      }).catch(() => null);
      if (existing) seenIds.add(existing.id);
    } else {
      errors++;
    }
  }

  // ── 2. Canadian MPs — Ontario filter ──
  console.log("2. Fetching Canadian MPs from Represent API…");
  let mps: RepresentRep[] = [];
  try {
    mps = await fetchAll(FEDERAL_MPS_URL);
    console.log(`   Found ${mps.length} MPs total\n`);
  } catch (err) {
    console.error("   ✗ Federal MP fetch failed:", (err as Error).message);
    errors++;
  }

  // Filter Ontario MPs: district name contains "Ontario" or province field = "ON"
  const ontarioMps = mps.filter(
    (r) =>
      r.district_name?.toLowerCase().includes("ontario") ||
      String(r.extra?.province ?? "").toUpperCase() === "ON"
  );
  console.log(`   Ontario MPs: ${ontarioMps.length}`);

  for (const rep of ontarioMps) {
    const ok = await upsertOfficial(rep, "federal");
    if (ok) {
      mpUpdated++;
      const existing = await prisma.official.findFirst({
        where: { name: { equals: rep.name?.trim(), mode: "insensitive" }, level: "federal" },
        select: { id: true },
      }).catch(() => null);
      if (existing) seenIds.add(existing.id);
    } else {
      errors++;
    }
  }

  // ── 3. Mark provincial/federal officials not in API as inactive ──
  console.log("\n3. Marking inactive officials who were not in 2025 results…");
  try {
    const oldOfficials = await prisma.official.findMany({
      where: {
        level: { in: ["provincial", "federal"] },
        isActive: true,
      },
      select: { id: true },
    });

    const toDeactivate = oldOfficials
      .filter((o) => !seenIds.has(o.id))
      .map((o) => o.id);

    if (toDeactivate.length > 0) {
      await prisma.official.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
      markedInactive = toDeactivate.length;
    }
  } catch (err) {
    console.error("   ✗ Error marking inactive:", (err as Error).message);
    errors++;
  }

  // ── Summary ──
  console.log("\n=== Summary ===");
  console.log(`Ontario MPPs updated:   ${mppUpdated}`);
  console.log(`Federal MPs updated:    ${mpUpdated}`);
  console.log(`Marked inactive:        ${markedInactive}`);
  console.log(`Errors:                 ${errors}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
