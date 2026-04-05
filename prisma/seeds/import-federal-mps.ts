// Imports 2023 federal MP roster from
// prisma/seeds/2023 MP CPNTACT NO EMAILS.csv
//
// Usage: npm run db:seed:mps

import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MpRow {
  "Honorific Title"?: string;
  "First Name": string;
  "Last Name": string;
  Constituency: string;
  "Province / Territory": string;
  "Political Affiliation": string;
  "Start Date"?: string;
  "End Date"?: string;
}

const PROVINCE_MAP: Record<string, string> = {
  Ontario: "ON",
  Quebec: "QC",
  "British Columbia": "BC",
  Alberta: "AB",
  Manitoba: "MB",
  Saskatchewan: "SK",
  "Nova Scotia": "NS",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Prince Edward Island": "PE",
  "Northwest Territories": "NT",
  Yukon: "YT",
  Nunavut: "NU",
};

const PARTY_MAP: Record<string, string> = {
  Liberal: "Liberal Party of Canada",
  Conservative: "Conservative Party of Canada",
  NDP: "New Democratic Party",
  "Bloc Québécois": "Bloc Québécois",
  "Green Party": "Green Party of Canada",
  Independent: "Independent",
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
    "prisma/seeds/2023 MP CPNTACT NO EMAILS.csv",
  );
  const raw = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<MpRow>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const firstName = (row["First Name"] ?? "").trim();
    const lastName = (row["Last Name"] ?? "").trim();
    const constituency = (row.Constituency ?? "").trim();
    if (!firstName || !lastName || !constituency) {
      skipped += 1;
      continue;
    }
    if (row["End Date"] && row["End Date"].trim()) {
      skipped += 1;
      continue;
    }

    const name = `${firstName} ${lastName}`;
    const province =
      PROVINCE_MAP[(row["Province / Territory"] ?? "").trim()] ?? null;
    const partyName =
      PARTY_MAP[(row["Political Affiliation"] ?? "").trim()] ??
      row["Political Affiliation"]?.trim() ??
      null;
    const externalId = slugify(firstName, lastName, constituency);

    const existing = await prisma.official.findFirst({
      where: {
        level: "federal",
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    });

    const data = {
      name,
      firstName,
      lastName,
      title: "MP",
      level: "federal" as const,
      district: constituency,
      province,
      party: partyName,
      partyName,
      externalId,
      externalSource: "csv_2023_mps",
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

  console.log(`Federal MPs: created=${created} updated=${updated} skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
