/**
 * ingest-officials-csv.ts
 *
 * Imports elected officials from the Open North / Represent API CSV export.
 * CSV: prisma/seeds/elected_official_open_north_april_2026.csv
 *
 * Run: npx tsx prisma/seeds/ingest-officials-csv.ts
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { PrismaClient, GovernmentLevel } from "@prisma/client";

const prisma = new PrismaClient();

// ── Province detection ────────────────────────────────────────────────────────

const PROVINCE_KEYWORDS: Array<[string, string]> = [
  ["legislative assembly of ontario",     "ON"],
  ["ontario",                              "ON"],
  ["legislative assembly of alberta",      "AB"],
  ["alberta",                              "AB"],
  ["british columbia",                     "BC"],
  ["bc legislature",                       "BC"],
  ["assemblée nationale",                  "QC"],
  ["national assembly",                    "QC"],
  ["québec",                               "QC"],
  ["quebec",                               "QC"],
  ["legislative assembly of saskatchewan", "SK"],
  ["saskatchewan",                         "SK"],
  ["legislative assembly of manitoba",     "MB"],
  ["manitoba",                             "MB"],
  ["nova scotia house of assembly",        "NS"],
  ["nova scotia",                          "NS"],
  ["legislative assembly of new brunswick","NB"],
  ["new brunswick",                        "NB"],
  ["prince edward island",                 "PE"],
  ["house of assembly of newfoundland",    "NL"],
  ["newfoundland",                         "NL"],
  ["legislative assembly of yukon",        "YT"],
  ["yukon",                                "YT"],
  ["northwest territories",                "NT"],
  ["nunavut",                              "NU"],
  // Municipalities — check Ontario cities before federal
  ["toronto",    "ON"], ["hamilton",   "ON"], ["ottawa",        "ON"],
  ["mississauga","ON"], ["brampton",   "ON"], ["london ontario","ON"],
  ["markham",    "ON"], ["vaughan",    "ON"], ["kitchener",     "ON"],
  ["windsor",    "ON"], ["barrie",     "ON"], ["oshawa",        "ON"],
  ["richmond hill","ON"],["oakville",  "ON"], ["burlington",    "ON"],
  ["st. catharines","ON"],["cambridge","ON"], ["kingston",      "ON"],
  ["waterloo",   "ON"], ["guelph",     "ON"], ["brantford",     "ON"],
  ["thunder bay","ON"], ["sudbury",    "ON"], ["peterborough",  "ON"],
  ["belleville", "ON"], ["north bay",  "ON"], ["sault ste. marie","ON"],
  ["niagara",    "ON"], ["peel",       "ON"], ["durham",        "ON"],
  ["halton",     "ON"], ["york region","ON"],["east gwillimbury","ON"],
  ["newmarket",  "ON"], ["whitby",     "ON"], ["ajax",          "ON"],
  ["pickering",  "ON"], ["clarington",  "ON"],["oshawa",        "ON"],
  // AB cities
  ["calgary",    "AB"], ["edmonton",   "AB"], ["red deer",      "AB"],
  ["lethbridge", "AB"], ["medicine hat","AB"],
  // BC cities
  ["vancouver",  "BC"], ["victoria",   "BC"], ["surrey",        "BC"],
  ["burnaby",    "BC"], ["richmond",   "BC"], ["kelowna",       "BC"],
  // QC cities
  ["montréal",   "QC"], ["montreal",   "QC"], ["laval",         "QC"],
  ["gatineau",   "QC"], ["longueuil",  "QC"], ["sherbrooke",    "QC"],
  // SK/MB
  ["regina",     "SK"], ["saskatoon",  "SK"], ["winnipeg",      "MB"],
  // NS/NB/NL
  ["halifax",    "NS"], ["fredericton","NB"], ["moncton",       "NB"],
  ["saint john", "NB"], ["st. john's", "NL"],
  // Federal — lowest priority
  ["house of commons",  "CA"],
  ["parliament",        "CA"],
];

function detectProvince(organization: string): string {
  const o = organization.toLowerCase().trim();
  for (const [keyword, province] of PROVINCE_KEYWORDS) {
    if (o.includes(keyword)) return province;
  }
  return "CA"; // Unknown / federal fallback
}

// ── Level detection from Primary role ────────────────────────────────────────

function detectLevel(role: string): GovernmentLevel {
  const r = role.toLowerCase().trim();
  // Provincial MLAs/MPPs/etc.
  if (["mpp", "mla", "mna", "mha", "member of provincial parliament",
       "member of the legislative assembly", "member of the national assembly",
       "member of the house of assembly"].some(k => r === k || r.startsWith(k + " "))) {
    return GovernmentLevel.provincial;
  }
  // Federal MPs
  if (r === "mp" || r === "member of parliament" || r.startsWith("mp ")) {
    return GovernmentLevel.federal;
  }
  // Everything else is municipal
  return GovernmentLevel.municipal;
}

// ── Slug generation ───────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

async function generateUniqueSlug(firstName: string, lastName: string, district: string): Promise<string> {
  const base = slugify(`${firstName}-${lastName}-${district}`);
  let slug = base;
  let attempt = 2;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    slug = `${base}-${attempt}`;
    attempt++;
  }
  return slug;
}

// ── Field sanitization ────────────────────────────────────────────────────────

function sanitizeStr(val: unknown, maxLen = 200): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function sanitizeEmail(val: unknown): string | null {
  const s = sanitizeStr(val, 254);
  if (!s) return null;
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

function sanitizeUrl(val: unknown): string | null {
  const s = sanitizeStr(val, 500);
  if (!s) return null;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href.slice(0, 500);
  } catch {
    return null;
  }
}

function sanitizePhone(val: unknown): string | null {
  return sanitizeStr(val, 30);
}

// ── CSV row interface ─────────────────────────────────────────────────────────

interface OfficialRow {
  Organization: string;
  "District name": string;
  "Primary role": string;
  Name: string;
  "First name": string;
  "Last name": string;
  Gender: string;
  "Party name": string;
  Email: string;
  "Photo URL": string;
  "Source URL": string;
  Website: string;
  Facebook: string;
  Instagram: string;
  Twitter: string;
  LinkedIn: string;
  YouTube: string;
  // Repeated office columns — PapaParse appends _1, _2 for duplicates
  "Office type": string;
  Address: string;
  Phone: string;
  Fax: string;
  "Office type_1"?: string;
  "Address_1"?: string;
  "Phone_1"?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(process.cwd(), "prisma", "seeds", "elected_official_open_north_april_2026.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, "utf-8");

  const { data, errors } = Papa.parse<OfficialRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} CSV parse warnings (non-fatal)`);
  }

  console.log(`\n📋 Found ${data.length} rows in CSV\n`);

  let inserted = 0;
  let skipped = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Progress every 50 records
    if (i > 0 && i % 50 === 0) {
      console.log(`  [${i}/${data.length}] inserted=${inserted} skipped=${skipped} errors=${errorCount}`);
    }

    try {
      // Sanitize core fields
      const firstName  = sanitizeStr(row["First name"], 100) ?? "";
      const lastName   = sanitizeStr(row["Last name"], 100)  ?? "";
      const fullName   = sanitizeStr(row["Name"], 200) ?? `${firstName} ${lastName}`.trim();
      const district   = sanitizeStr(row["District name"], 200) ?? "";
      const primaryRole = sanitizeStr(row["Primary role"], 100) ?? "";
      const org        = sanitizeStr(row["Organization"], 300) ?? "";

      // Skip rows without essential data
      if (!fullName || !district || !primaryRole) {
        skipped++;
        continue;
      }

      const level = detectLevel(primaryRole);
      const province = detectProvince(org);

      // Check for existing official with same name + district
      const existing = await prisma.official.findFirst({
        where: {
          name: fullName,
          district,
        },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Build sanitized record
      const officialData = {
        name:          fullName,
        firstName:     firstName || null,
        lastName:      lastName  || null,
        title:         primaryRole,
        district,
        level,
        province:      province !== "CA" ? province : null,
        party:         sanitizeStr(row["Party name"], 100),
        email:         sanitizeEmail(row["Email"]),
        photoUrl:      sanitizeUrl(row["Photo URL"]),
        website:       sanitizeUrl(row["Website"]),
        twitter:       sanitizeStr(row["Twitter"], 100),
        facebook:      sanitizeUrl(row["Facebook"]),
        instagram:     sanitizeStr(row["Instagram"], 100),
        linkedIn:      sanitizeUrl(row["LinkedIn"]),
        phone:         sanitizePhone(row["Phone"]),
        address:       sanitizeStr(row["Address"], 300),
        isClaimed:     false,
        claimedAt:     null,
        externalSource: "open_north",
        isActive:      true,
      };

      const official = await prisma.official.create({ data: officialData });

      // Generate slug for linked campaign
      const slug = await generateUniqueSlug(firstName || fullName, lastName || "", district);

      // Upsert linked campaign
      await prisma.campaign.upsert({
        where: { slug },
        create: {
          name:           `${fullName} — Official Profile`,
          slug,
          candidateName:  fullName,
          candidateTitle: primaryRole,
          jurisdiction:   district,
          isPublic:       true,
          isActive:       true,
          officialId:     official.id,
        },
        update: {
          officialId: official.id,
        },
      });

      inserted++;
    } catch (err) {
      errorCount++;
      const rowId = sanitizeStr(row["Name"], 60) ?? `row ${i + 2}`;
      console.error(`  ❌ Error on ${rowId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`
════════════════════════════════════════
✅ Import complete
   Total processed : ${data.length}
   Inserted        : ${inserted}
   Skipped         : ${skipped}
   Errors          : ${errorCount}
════════════════════════════════════════
`);
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
