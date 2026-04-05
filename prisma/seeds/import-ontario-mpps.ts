// Imports 2023 Ontario MPP roster from
// prisma/seeds/2023-mpp-contact info-offices-all.csv
//
// The CSV has one row per office (legislative / constituency / ministry) —
// same MPP appears 2-3 times. We group by Member ID and pick the best
// contact info (constituency office preferred).
//
// Usage: npm run db:seed:mpps

import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MppRow {
  Honorific?: string;
  "First name": string;
  "Last name": string;
  Gender?: string;
  "Office type": string;
  Address?: string;
  City?: string;
  Province?: string;
  "Postal code"?: string;
  "Office email"?: string;
  Email?: string;
  Telephone?: string;
  "Riding name": string;
  Party: string;
  "Parliamentary role"?: string;
  "Member ID": string;
}

const PARTY_MAP: Record<string, string> = {
  "Progressive Conservative Party of Ontario": "Ontario PC Party",
  "Ontario Liberal Party": "Ontario Liberal Party",
  "Ontario New Democratic Party": "Ontario NDP",
  "New Democratic Party of Ontario": "Ontario NDP",
  "Green Party of Ontario": "Green Party of Ontario",
  Independent: "Independent",
};

const OFFICE_PRIORITY: Record<string, number> = {
  "Constituency office": 1,
  "Legislative office": 2,
  "Ministry office": 3,
};

function slugify(...parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const csvPath = path.join(
    process.cwd(),
    "prisma/seeds/2023-mpp-contact info-offices-all.csv",
  );
  const raw = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<MppRow>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  // Group by Member ID
  const byMember = new Map<string, MppRow[]>();
  for (const row of parsed.data) {
    const memberId = (row["Member ID"] ?? "").trim();
    if (!memberId) continue;
    if (!byMember.has(memberId)) byMember.set(memberId, []);
    byMember.get(memberId)!.push(row);
  }

  let created = 0;
  let updated = 0;

  for (const [memberId, rows] of byMember) {
    // Pick office with highest priority (constituency first)
    rows.sort(
      (a, b) =>
        (OFFICE_PRIORITY[a["Office type"]] ?? 99) -
        (OFFICE_PRIORITY[b["Office type"]] ?? 99),
    );
    const primary = rows[0];

    const firstName = (primary["First name"] ?? "").trim();
    const lastName = (primary["Last name"] ?? "").trim();
    const riding = (primary["Riding name"] ?? "").trim();
    if (!firstName || !lastName || !riding) continue;

    const name = `${firstName} ${lastName}`;
    const partyRaw = (primary.Party ?? "").trim();
    const partyName = PARTY_MAP[partyRaw] ?? partyRaw ?? null;

    // Collect best contact fields across office rows
    const email =
      rows.find((r) => r.Email?.trim())?.Email?.trim() ??
      rows.find((r) => r["Office email"]?.trim())?.["Office email"]?.trim() ??
      null;
    const phone = rows.find((r) => r.Telephone?.trim())?.Telephone?.trim() ?? null;
    const address =
      rows.find((r) => r["Office type"] === "Constituency office")?.Address?.trim() ??
      null;

    const existing = await prisma.official.findFirst({
      where: {
        level: "provincial",
        name: { equals: name, mode: "insensitive" },
        province: "ON",
      },
      select: { id: true },
    });

    const data = {
      name,
      firstName,
      lastName,
      title: "MPP",
      level: "provincial" as const,
      district: riding,
      province: "ON",
      party: partyName,
      partyName,
      email,
      phone,
      address,
      externalId: `ola-${memberId}-${slugify(firstName, lastName)}`,
      externalSource: "csv_2023_ola",
      isActive: true,
    };

    if (existing) {
      await prisma.official.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.official.create({ data: { ...data, isClaimed: false } });
      created += 1;
    }
  }

  console.log(`Ontario MPPs: created=${created} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
