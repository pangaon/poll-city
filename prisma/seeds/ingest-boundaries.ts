import { GovernmentLevel, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REPRESENT_BASE = "https://represent.opennorth.ca";
const BOUNDARY_SET_LIMIT = 200;
const BOUNDARY_LIMIT = 500;
const REQUEST_DELAY_MS = 300;

const ELECTIONS_CANADA_INDEX_URL = "https://www.elections.ca/content.aspx?section=res&dir=rep/off/303_rocf&document=index&lang=e";

interface RepresentMeta {
  next: string | null;
  previous: string | null;
  limit: number;
  offset: number;
  total_count: number;
}

interface RepresentListResponse<T> {
  meta: RepresentMeta;
  objects: T[];
}

interface BoundarySet {
  name: string;
  slug: string;
  domain?: string;
  related?: {
    boundaries_url?: string;
  };
}

interface Boundary {
  name: string;
  slug: string;
  external_id?: string;
  boundary_set_name?: string;
  area_id?: string;
  metadata?: Record<string, unknown>;
  centroid?: [number, number] | { coordinates?: [number, number] } | null;
  simple_shape?: unknown;
}

interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 120);
}

function detectLevel(boundarySetName: string): GovernmentLevel {
  const text = boundarySetName.toLowerCase();

  if (text.includes("federal") || text.includes("house of commons") || text.includes("electoral district")) {
    return "federal";
  }

  if (text.includes("provincial") || text.includes("assembly") || text.includes("legislature")) {
    return "provincial";
  }

  return "municipal";
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

function detectProvince(boundarySetName: string): string {
  const lower = boundarySetName.toLowerCase();

  for (const [name, code] of Object.entries(PROVINCE_NAME_TO_CODE)) {
    if (lower.includes(name)) {
      return code;
    }
  }

  const codeMatch = boundarySetName.match(/\b(AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\b/i);
  if (codeMatch?.[1]) {
    return codeMatch[1].toUpperCase();
  }

  if (lower.includes("federal") || lower.includes("canada")) {
    return "CA";
  }

  return "CA";
}

function extractCentroid(centroid: Boundary["centroid"]): { lat: number; lng: number } | null {
  if (!centroid) return null;

  if (Array.isArray(centroid) && centroid.length >= 2) {
    const lng = Number(centroid[0]);
    const lat = Number(centroid[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  if (typeof centroid === "object" && centroid !== null && Array.isArray(centroid.coordinates)) {
    const lng = Number(centroid.coordinates[0]);
    const lat = Number(centroid.coordinates[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

async function fetchRepresentJson<T>(url: string, attempts = 4): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Represent API request failed (${response.status}) for ${url}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await sleep(600 * (i + 1));
    }
  }

  throw lastError;
}

async function fetchAllBoundarySets(): Promise<BoundarySet[]> {
  const all: BoundarySet[] = [];
  let nextUrl: string | null = `${REPRESENT_BASE}/boundary-sets/?limit=${BOUNDARY_SET_LIMIT}`;

  while (nextUrl) {
    const page = await fetchRepresentJson<RepresentListResponse<BoundarySet>>(nextUrl);
    all.push(...page.objects);
    nextUrl = page.meta.next ? `${REPRESENT_BASE}${page.meta.next}` : null;
    if (nextUrl) await sleep(REQUEST_DELAY_MS);
  }

  return all;
}

function buildBoundariesUrl(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `${REPRESENT_BASE}${raw}`;
}

async function fetchAllBoundariesForSet(boundariesUrl: string): Promise<Boundary[]> {
  const all: Boundary[] = [];
  const delimiter = boundariesUrl.includes("?") ? "&" : "?";
  let nextUrl: string | null = `${boundariesUrl}${delimiter}limit=${BOUNDARY_LIMIT}`;

  while (nextUrl) {
    const page = await fetchRepresentJson<RepresentListResponse<Boundary>>(nextUrl);
    all.push(...page.objects);
    nextUrl = page.meta.next ? `${REPRESENT_BASE}${page.meta.next}` : null;
    if (nextUrl) await sleep(REQUEST_DELAY_MS);
  }

  return all;
}

async function upsertBoundary(boundary: Boundary, boundarySetName: string): Promise<"created" | "updated" | "skipped"> {
  const name = normalizeWhitespace(boundary.name);
  if (!name) return "skipped";

  const level = detectLevel(boundarySetName);
  const province = detectProvince(boundarySetName);
  const slug = normalizeWhitespace(boundary.slug) || slugify(name);
  const centroid = extractCentroid(boundary.centroid);
  const externalId = normalizeWhitespace(boundary.external_id) || null;
  const metadata = {
    area_id: boundary.area_id ?? null,
    external_id: boundary.external_id ?? null,
    boundary_set_name: boundarySetName,
  };

  const postalPrefix = `BOUNDARY__${slug}`.slice(0, 140);

  const existing = await prisma.geoDistrict.findUnique({
    where: {
      postalPrefix_level: {
        postalPrefix,
        level,
      },
    },
    select: { id: true },
  });

  const payload = {
    name,
    slug,
    level,
    province,
    districtType: boundarySetName,
    externalId,
    centroid: centroid as unknown as object | null,
    metadata: metadata as unknown as object,
    geoJson: (boundary.simple_shape ?? null) as unknown as object | null,
  };

  if (existing) {
    await prisma.geoDistrict.update({
      where: { id: existing.id },
      data: payload,
    });
    return "updated";
  }

  await prisma.geoDistrict.create({
    data: {
      postalPrefix,
      ...payload,
    },
  });
  return "created";
}

function boundariesToGeoJsonCollection(boundaries: Boundary[], boundarySetName: string): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];

  for (const boundary of boundaries) {
    if (!boundary.simple_shape || typeof boundary.simple_shape !== "object") {
      continue;
    }

    const shape = boundary.simple_shape as Record<string, unknown>;
    const type = typeof shape.type === "string" ? shape.type : null;

    if (!type || !Array.isArray(shape.coordinates)) {
      continue;
    }

    features.push({
      type: "Feature",
      properties: {
        name: boundary.name,
        slug: boundary.slug,
        external_id: boundary.external_id ?? null,
        area_id: boundary.area_id ?? null,
        boundary_set_name: boundarySetName,
      },
      geometry: {
        type,
        coordinates: shape.coordinates,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

async function fetchElectionsCanadaPage(): Promise<string | null> {
  try {
    const response = await fetch(ELECTIONS_CANADA_INDEX_URL, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function extractCandidateGeoJsonLinksFromHtml(html: string): string[] {
  const matches = [...html.matchAll(/https?:\/\/[^\"'\s>]+/gi)].map((m) => m[0]);
  return [...new Set(matches.filter((url) => /geojson|\.json/i.test(url)))];
}

async function fetchFirstWorkingGeoJson(links: string[]): Promise<GeoJsonFeatureCollection | null> {
  for (const link of links) {
    try {
      const response = await fetch(link, { cache: "no-store" });
      if (!response.ok) continue;
      const data = (await response.json()) as GeoJsonFeatureCollection;
      if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
        return data;
      }
    } catch {
      // continue trying next link
    }
  }

  return null;
}

async function storeElectionsCanadaGeoJson(geoJson: GeoJsonFeatureCollection, sourceUrl: string) {
  const level: GovernmentLevel = "federal";
  const postalPrefix = "BOUNDARY__elections-canada-federal-collection";

  const existing = await prisma.geoDistrict.findUnique({
    where: {
      postalPrefix_level: {
        postalPrefix,
        level,
      },
    },
    select: { id: true },
  });

  const payload = {
    name: "Federal Electoral Districts (Elections Canada)",
    slug: "federal-electoral-districts-elections-canada",
    districtType: "elections-canada-federal-electoral-districts",
    province: "CA",
    externalId: "elections-canada-federal-collection",
    centroid: null,
    metadata: {
      source_page: ELECTIONS_CANADA_INDEX_URL,
      source_geojson_url: sourceUrl,
      feature_count: geoJson.features.length,
    } as object,
    geoJson: geoJson as unknown as object,
  };

  if (existing) {
    await prisma.geoDistrict.update({
      where: { id: existing.id },
      data: payload,
    });
    return "updated" as const;
  }

  await prisma.geoDistrict.create({
    data: {
      postalPrefix,
      level,
      ...payload,
    },
  });
  return "created" as const;
}

async function main() {
  console.log("Starting full Canada boundary ingestion...");

  const boundarySets = await fetchAllBoundarySets();
  console.log(`Fetched ${boundarySets.length} boundary sets`);

  let setCounter = 0;
  let boundaryFetched = 0;
  let boundaryCreated = 0;
  let boundaryUpdated = 0;
  let boundarySkipped = 0;

  const federalBoundaryBuckets: Array<{ setName: string; boundaries: Boundary[] }> = [];

  for (const boundarySet of boundarySets) {
    setCounter += 1;

    const setSlug = normalizeWhitespace(boundarySet.slug);
    const setName = normalizeWhitespace(boundarySet.name) || setSlug;
    const boundariesUrl = normalizeWhitespace(boundarySet.related?.boundaries_url);

    if (!setSlug || !boundariesUrl) {
      continue;
    }

    const boundaries = await fetchAllBoundariesForSet(buildBoundariesUrl(boundariesUrl));
    boundaryFetched += boundaries.length;

    if (detectLevel(setName) === "federal") {
      federalBoundaryBuckets.push({ setName, boundaries });
    }

    for (const boundary of boundaries) {
      const result = await upsertBoundary(boundary, setName);
      if (result === "created") boundaryCreated += 1;
      if (result === "updated") boundaryUpdated += 1;
      if (result === "skipped") boundarySkipped += 1;
    }

    console.log(`Processed boundary set ${setCounter}/${boundarySets.length}: ${setName} (${boundaries.length} boundaries)`);
    await sleep(REQUEST_DELAY_MS);
  }

  const electionsCanadaHtml = await fetchElectionsCanadaPage();
  let electionsCanadaStatus = "skipped";

  if (electionsCanadaHtml) {
    const links = extractCandidateGeoJsonLinksFromHtml(electionsCanadaHtml);
    const electionsGeoJson = await fetchFirstWorkingGeoJson(links);

    if (electionsGeoJson && links.length > 0) {
      const storeResult = await storeElectionsCanadaGeoJson(electionsGeoJson, links[0]);
      electionsCanadaStatus = `${storeResult} (${electionsGeoJson.features.length} features)`;
    }
  }

  if (electionsCanadaStatus === "skipped" && federalBoundaryBuckets.length > 0) {
    // Fallback: build federal GeoJSON collection from Represent boundaries when Elections Canada source is unavailable.
    const flattened = federalBoundaryBuckets.flatMap((bucket) =>
      bucket.boundaries.map((boundary) => ({ boundary, setName: bucket.setName }))
    );

    const fallbackCollection = boundariesToGeoJsonCollection(
      flattened.map((row) => row.boundary),
      flattened[0]?.setName ?? "federal-boundaries"
    );

    if (fallbackCollection.features.length > 0) {
      const storeResult = await storeElectionsCanadaGeoJson(fallbackCollection, "represent-opennorth-fallback");
      electionsCanadaStatus = `fallback-${storeResult} (${fallbackCollection.features.length} features)`;
    }
  }

  const totalGeoDistricts = await prisma.geoDistrict.count();

  console.log("--- Boundaries ingestion complete ---");
  console.log(`Boundary sets processed: ${boundarySets.length}`);
  console.log(`Boundaries fetched: ${boundaryFetched}`);
  console.log(`Boundaries created: ${boundaryCreated}`);
  console.log(`Boundaries updated: ${boundaryUpdated}`);
  console.log(`Boundaries skipped: ${boundarySkipped}`);
  console.log(`Elections Canada federal GeoJSON status: ${electionsCanadaStatus}`);
  console.log(`GeoDistrict rows currently in DB: ${totalGeoDistricts}`);
}

main()
  .catch((error) => {
    console.error("Boundaries ingestion failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
