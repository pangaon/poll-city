import { GovernmentLevel, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = "https://represent.opennorth.ca";
const PAGE_SIZE = 200;
const REQUEST_DELAY_MS = 300;

interface RepresentMeta {
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  total_count: number;
}

interface Office {
  postal?: string;
}

interface Representative {
  name: string;
  first_name?: string;
  last_name?: string;
  elected_office?: string;
  district_name?: string;
  district_id?: string;
  party_name?: string;
  photo_url?: string;
  email?: string;
  url?: string;
  representative_set_name?: string;
  offices?: Office[];
}

interface RepresentativeListResponse {
  meta: RepresentMeta;
  objects: Representative[];
}

const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

const PROVINCE_CODES = ["AB", "BC", "MB", "NB", "NL", "NT", "NS", "NU", "ON", "PE", "QC", "SK", "YT"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseProvinceFromPostal(postal?: string): string | null {
  if (!postal) return null;
  const normalized = postal.replace(/\s+/g, " ").trim();

  const lineMatch = normalized.match(/,\s*([A-Z]{2})\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
  if (lineMatch?.[1] && PROVINCE_CODES.includes(lineMatch[1].toUpperCase())) {
    return lineMatch[1].toUpperCase();
  }

  const tokenMatch = normalized.match(/\b(AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\b/i);
  if (tokenMatch?.[1]) {
    return tokenMatch[1].toUpperCase();
  }

  return null;
}

function parseProvinceFromSetName(setName?: string): string | null {
  if (!setName) return null;
  const lower = setName.toLowerCase();

  for (const [provinceName, provinceCode] of Object.entries(PROVINCE_NAME_TO_CODE)) {
    if (lower.includes(provinceName)) {
      return provinceCode;
    }
  }

  const codeMatch = setName.match(/\b(AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\b/i);
  if (codeMatch?.[1]) {
    return codeMatch[1].toUpperCase();
  }

  return null;
}

function detectLevel(rep: Representative): GovernmentLevel {
  const electedOffice = normalizeWhitespace(rep.elected_office).toUpperCase();
  const setName = normalizeWhitespace(rep.representative_set_name).toLowerCase();

  if (electedOffice.includes("MP")) {
    return "federal";
  }

  if (
    electedOffice.includes("MPP") ||
    electedOffice.includes("MLA") ||
    electedOffice.includes("MNA") ||
    electedOffice.includes("MHA")
  ) {
    return "provincial";
  }

  if (
    electedOffice.includes("MAYOR") ||
    electedOffice.includes("COUNCILLOR") ||
    electedOffice.includes("REEVE") ||
    electedOffice.includes("TRUSTEE")
  ) {
    return "municipal";
  }

  if (setName.includes("house of commons") || setName.includes("federal")) {
    return "federal";
  }

  if (setName.includes("legislature") || setName.includes("assembly") || setName.includes("provincial")) {
    return "provincial";
  }

  return "municipal";
}

function detectProvince(rep: Representative): string | null {
  for (const office of rep.offices ?? []) {
    const province = parseProvinceFromPostal(office.postal);
    if (province) return province;
  }

  return parseProvinceFromSetName(rep.representative_set_name);
}

function buildExternalId(rep: Representative): string {
  const urlPart = normalizeWhitespace(rep.url);
  if (urlPart) {
    return `represent:${urlPart}`;
  }

  const name = normalizeWhitespace(rep.name).toLowerCase();
  const district = normalizeWhitespace(rep.district_name).toLowerCase();
  const title = normalizeWhitespace(rep.elected_office).toLowerCase();
  return `represent:${name}|${district}|${title}`.slice(0, 255);
}

async function fetchRepresentativesPage(offset: number, attempts = 5): Promise<RepresentativeListResponse> {
  const url = `${BASE_URL}/representatives/?limit=${PAGE_SIZE}&offset=${offset}`;
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Represent API request failed (offset=${offset}): HTTP ${response.status}`);
      }

      return (await response.json()) as RepresentativeListResponse;
    } catch (error) {
      lastError = error;
      await sleep(700 * (i + 1));
    }
  }

  throw lastError;
}

async function ingestRepresentative(rep: Representative, seenIds: Set<string>): Promise<"created" | "updated" | "skipped"> {
  const name = normalizeWhitespace(rep.name);
  const title = normalizeWhitespace(rep.elected_office);
  const district = normalizeWhitespace(rep.district_name);

  if (!name || !title || !district) {
    return "skipped";
  }

  const level = detectLevel(rep);
  const province = detectProvince(rep);
  const externalId = buildExternalId(rep);
  seenIds.add(externalId);

  const payload = {
    name,
    firstName: normalizeWhitespace(rep.first_name) || null,
    lastName: normalizeWhitespace(rep.last_name) || null,
    title,
    district,
    districtCode: normalizeWhitespace(rep.district_id) || null,
    level,
    party: normalizeWhitespace(rep.party_name) || null,
    partyName: normalizeWhitespace(rep.party_name) || null,
    photoUrl: normalizeWhitespace(rep.photo_url) || null,
    email: normalizeWhitespace(rep.email) || null,
    website: normalizeWhitespace(rep.url) || null,
    externalId,
    externalSource: "represent_opennorth",
    province,
    isActive: true,
  };

  const existing = await prisma.official.findFirst({
    where: {
      OR: [
        { externalId },
        {
          name,
          district,
          level,
        },
        {
          name,
          district,
          title,
          level,
        },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.official.update({
      where: { id: existing.id },
      data: payload,
    });
    return "updated";
  }

  // Unique constraint hint: enforce (name, level, district) check before insertion.
  await prisma.official.create({
    data: {
      ...payload,
      isClaimed: false,
    },
  });
  return "created";
}

async function main() {
  console.log("Starting full Canada representatives ingestion...");

  const seenIds = new Set<string>();
  let offset = 0;
  let totalFetched = 0;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let totalExpected = 0;

  while (true) {
    const page = await fetchRepresentativesPage(offset);
    totalExpected = page.meta.total_count;
    totalFetched += page.objects.length;

    for (const rep of page.objects) {
      const result = await ingestRepresentative(rep, seenIds);
      processed += 1;

      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
      if (result === "skipped") skipped += 1;

      if (processed % 100 === 0) {
        console.log(`Processed ${processed} representatives (created=${created}, updated=${updated}, skipped=${skipped})`);
      }
    }

    if (!page.meta.next) {
      break;
    }

    offset += PAGE_SIZE;
    await sleep(REQUEST_DELAY_MS);
  }

  // Deactivate officials from Represent that were NOT returned in this run —
  // these are people who retired, lost a seat, or moved to a different office.
  const { count: deactivated } = await prisma.official.updateMany({
    where: {
      externalSource: "represent_opennorth",
      isActive: true,
      externalId: { notIn: Array.from(seenIds) },
    },
    data: { isActive: false },
  });

  const totalOfficials = await prisma.official.count({ where: { isActive: true } });

  console.log("--- Representatives ingestion complete ---");
  console.log(`Expected from API: ${totalExpected}`);
  console.log(`Fetched: ${totalFetched}`);
  console.log(`Processed: ${processed}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Deactivated (no longer serving): ${deactivated}`);
  console.log(`Active officials in DB: ${totalOfficials}`);
}

main()
  .catch((error) => {
    console.error("Representatives ingestion failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
