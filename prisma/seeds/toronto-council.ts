/**
 * toronto-council.ts
 *
 * Seeds the Official table with Toronto City Council for the 2022-2026 term.
 * Includes Mayor Olivia Chow and all 25 ward councillors.
 *
 * Run: npx tsx prisma/seeds/toronto-council.ts
 */

import { PrismaClient, GovernmentLevel } from "@prisma/client";

const prisma = new PrismaClient();

interface TorontoOfficial {
  firstName: string;
  lastName: string;
  title: string;
  wardNumber: number | null;
  wardName: string;
  party?: string;
}

const TERM_START = new Date("2022-11-15T00:00:00Z");
const TERM_END = new Date("2026-11-14T00:00:00Z");

// Toronto 2022-2026 Council (Mayor elected June 2023 by-election)
const TORONTO_COUNCIL: TorontoOfficial[] = [
  // Mayor
  { firstName: "Olivia", lastName: "Chow", title: "Mayor", wardNumber: null, wardName: "City of Toronto", party: "Independent" },

  // Ward 1 – Etobicoke North
  { firstName: "Vincent", lastName: "Crisanti", title: "Councillor", wardNumber: 1, wardName: "Etobicoke North", party: "Independent" },
  // Ward 2 – Etobicoke Centre
  { firstName: "Stephen", lastName: "Holyday", title: "Councillor", wardNumber: 2, wardName: "Etobicoke Centre", party: "Independent" },
  // Ward 3 – Etobicoke—Lakeshore
  { firstName: "Amber", lastName: "Morley", title: "Councillor", wardNumber: 3, wardName: "Etobicoke—Lakeshore", party: "Independent" },
  // Ward 4 – Parkdale—High Park
  { firstName: "Gord", lastName: "Perks", title: "Councillor", wardNumber: 4, wardName: "Parkdale—High Park", party: "Independent" },
  // Ward 5 – York South—Weston
  { firstName: "Frances", lastName: "Nunziata", title: "Councillor", wardNumber: 5, wardName: "York South—Weston", party: "Independent" },
  // Ward 6 – York Centre
  { firstName: "James", lastName: "Pasternak", title: "Councillor", wardNumber: 6, wardName: "York Centre", party: "Independent" },
  // Ward 7 – Humber River—Black Creek
  { firstName: "Anthony", lastName: "Perruzza", title: "Councillor", wardNumber: 7, wardName: "Humber River—Black Creek", party: "Independent" },
  // Ward 8 – Eglinton—Lawrence
  { firstName: "Mike", lastName: "Colle", title: "Councillor", wardNumber: 8, wardName: "Eglinton—Lawrence", party: "Independent" },
  // Ward 9 – Davenport
  { firstName: "Alejandra", lastName: "Bravo", title: "Councillor", wardNumber: 9, wardName: "Davenport", party: "Independent" },
  // Ward 10 – Spadina—Fort York
  { firstName: "Ausma", lastName: "Malik", title: "Councillor", wardNumber: 10, wardName: "Spadina—Fort York", party: "Independent" },
  // Ward 11 – University—Rosedale
  { firstName: "Dianne", lastName: "Saxe", title: "Councillor", wardNumber: 11, wardName: "University—Rosedale", party: "Independent" },
  // Ward 12 – Toronto—St. Paul's
  { firstName: "Josh", lastName: "Matlow", title: "Councillor", wardNumber: 12, wardName: "Toronto—St. Paul's", party: "Independent" },
  // Ward 13 – Toronto Centre
  { firstName: "Chris", lastName: "Moise", title: "Councillor", wardNumber: 13, wardName: "Toronto Centre", party: "Independent" },
  // Ward 14 – Toronto—Danforth
  { firstName: "Paula", lastName: "Fletcher", title: "Councillor", wardNumber: 14, wardName: "Toronto—Danforth", party: "Independent" },
  // Ward 15 – Don Valley West
  { firstName: "Jaye", lastName: "Robinson", title: "Councillor", wardNumber: 15, wardName: "Don Valley West", party: "Independent" },
  // Ward 16 – Don Valley East
  { firstName: "Jon", lastName: "Burnside", title: "Councillor", wardNumber: 16, wardName: "Don Valley East", party: "Independent" },
  // Ward 17 – Don Valley North
  { firstName: "Shelley", lastName: "Carroll", title: "Councillor", wardNumber: 17, wardName: "Don Valley North", party: "Independent" },
  // Ward 18 – Willowdale
  { firstName: "Lily", lastName: "Cheng", title: "Councillor", wardNumber: 18, wardName: "Willowdale", party: "Independent" },
  // Ward 19 – Beaches—East York
  { firstName: "Brad", lastName: "Bradford", title: "Councillor", wardNumber: 19, wardName: "Beaches—East York", party: "Independent" },
  // Ward 20 – Scarborough Southwest
  { firstName: "Parthi", lastName: "Kandavel", title: "Councillor", wardNumber: 20, wardName: "Scarborough Southwest", party: "Independent" },
  // Ward 21 – Scarborough Centre
  { firstName: "Michael", lastName: "Thompson", title: "Councillor", wardNumber: 21, wardName: "Scarborough Centre", party: "Independent" },
  // Ward 22 – Scarborough—Agincourt
  { firstName: "Nick", lastName: "Mantas", title: "Councillor", wardNumber: 22, wardName: "Scarborough—Agincourt", party: "Independent" },
  // Ward 23 – Scarborough North
  { firstName: "Jamaal", lastName: "Myers", title: "Councillor", wardNumber: 23, wardName: "Scarborough North", party: "Independent" },
  // Ward 24 – Scarborough—Guildwood
  { firstName: "Paul", lastName: "Ainslie", title: "Councillor", wardNumber: 24, wardName: "Scarborough—Guildwood", party: "Independent" },
  // Ward 25 – Scarborough—Rouge Park
  { firstName: "Jennifer", lastName: "McKelvie", title: "Councillor", wardNumber: 25, wardName: "Scarborough—Rouge Park", party: "Independent" },
];

function slugify(firstName: string, lastName: string, wardNumber: number | null): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return wardNumber !== null ? `toronto-ward-${wardNumber}-${base}` : `toronto-mayor-${base}`;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  console.error(`❌ ${label} (${attempts} attempts):`, (lastErr as Error).message.split("\n")[0]);
  throw lastErr;
}

async function main() {
  console.log("🏛️  Seeding Toronto City Council 2022-2026...\n");

  // Warm up the connection
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`, "warm-up");
  } catch {
    console.error("⚠️  Warm-up failed, continuing anyway...");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const o of TORONTO_COUNCIL) {
    const name = `${o.firstName} ${o.lastName}`;
    const district = o.wardNumber !== null
      ? `Ward ${o.wardNumber} — ${o.wardName}`
      : o.wardName;
    const districtCode = o.wardNumber !== null ? `toronto-ward-${o.wardNumber}` : "toronto-mayor";
    const externalId = slugify(o.firstName, o.lastName, o.wardNumber);

    try {
      const existing = await withRetry(
        () => prisma.official.findFirst({ where: { externalId } }),
        `lookup ${name}`
      );

      const existingByIdentity = existing
        ? null
        : await withRetry(
            () =>
              prisma.official.findFirst({
                where: {
                  name,
                  district,
                  level: GovernmentLevel.municipal,
                },
                select: { id: true },
              }),
            `lookup by identity ${name}`
          );

      const targetId = existing?.id ?? existingByIdentity?.id ?? null;

      if (targetId) {
        await prisma.official.update({
          where: { id: targetId },
          data: {
            name,
            firstName: o.firstName,
            lastName: o.lastName,
            title: o.title,
            level: GovernmentLevel.municipal,
            district,
            districtCode,
            party: o.party ?? "Independent",
            partyName: o.party ?? "Independent",
            province: "ON",
            isActive: true,
            termStart: TERM_START,
            termEnd: TERM_END,
            externalSource: "manual",
          },
        });
        console.log(`🔄 Updated: ${name} — ${district}`);
        updated++;
      } else {
        // Unique constraint hint: enforce (name, level, district) in code before insertion.
        await prisma.official.create({
          data: {
            name,
            firstName: o.firstName,
            lastName: o.lastName,
            title: o.title,
            level: GovernmentLevel.municipal,
            district,
            districtCode,
            party: o.party ?? "Independent",
            partyName: o.party ?? "Independent",
            province: "ON",
            isActive: true,
            termStart: TERM_START,
            termEnd: TERM_END,
            externalId,
            externalSource: "manual",
          },
        });
        console.log(`✨ Created: ${name} — ${district}`);
        created++;
      }
    } catch (err) {
      console.error(`❌ Failed for ${name}:`, (err as Error).message);
      skipped++;
    }
  }

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Created:  ${created}`);
  console.log(`🔄 Updated:  ${updated}`);
  console.log(`❌ Skipped:  ${skipped}`);
  console.log(`📊 Total:    ${TORONTO_COUNCIL.length}`);
  console.log("─────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
