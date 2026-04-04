/**
 * GIS Boundaries Ingestion Script — Poll City v2.0.0
 *
 * Downloads and stores GIS boundary polygons for Ontario municipalities,
 * Ontario electoral districts, and federal electoral districts into the
 * GeoDistrict table so the analytics choropleth heat map can render real
 * geographic shapes.
 *
 * NOTE: Represent API (opennorth.ca) is not reachable from some dev machines
 * due to network/firewall restrictions. Run from Railway if local calls fail.
 *
 * Run with:   npx tsx prisma/seeds/ingest-gis-boundaries.ts
 * npm script: npm run db:seed:boundaries:gis
 */

import prisma from "../../src/lib/db/prisma";

const MUNICIPAL_BOUNDARIES_URL =
  "https://opendata.arcgis.com/datasets/a083b5af39664ccc94d0f9ae8d9d9e05_0.geojson";

const ON_ELECTORAL_URL =
  "https://represent.opennorth.ca/boundaries/ontario-electoral-districts-representation-act-2015/?limit=200&format=json";

const FED_ELECTORAL_URL =
  "https://represent.opennorth.ca/boundaries/federal-electoral-districts-2023/?limit=400&format=json";

const TIMEOUT_MS = 30_000;

interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface RepresentBoundary {
  name: string;
  external_id: string;
  boundary_sets: string[];
  shape?: unknown;
  simple_shape?: unknown;
}

interface RepresentResponse {
  objects: RepresentBoundary[];
  meta: { next: string | null; total_count: number };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function ingestMunicipalBoundaries(): Promise<number> {
  console.log("⬇  Downloading Ontario municipal boundaries from ArcGIS Open Data…");
  let count = 0;

  let data: GeoJsonCollection;
  try {
    data = await fetchJson<GeoJsonCollection>(MUNICIPAL_BOUNDARIES_URL);
  } catch (err) {
    console.error("  ✗ Failed to download municipal boundaries:", (err as Error).message);
    return 0;
  }

  console.log(`  Downloaded ${data.features?.length ?? 0} features`);

  for (const feature of data.features ?? []) {
    try {
      const props = feature.properties ?? {};
      // ArcGIS Ontario municipal dataset uses MUNIC_NAME or NAME_EN fields
      const name =
        String(props.MUNIC_NAME ?? props.NAME_EN ?? props.NAME ?? props.CSDNAME ?? "").trim();
      const externalId = String(props.OBJECTID ?? props.FID ?? props.CSDUID ?? "").trim();

      if (!name) continue;

      await prisma.geoDistrict.upsert({
        where: {
          // postalPrefix+level is the unique key; for boundary-only records use a synthetic key
          // We use a special sentinel postalPrefix of "BOUNDARY__<externalId>"
          postalPrefix_level: {
            postalPrefix: `BOUNDARY__${externalId || name.slice(0, 20)}`,
            level: "municipal",
          },
        },
        update: {
          name,
          districtType: "municipal",
          province: "ON",
          geoJson: feature.geometry as object,
          externalId,
        },
        create: {
          postalPrefix: `BOUNDARY__${externalId || name.slice(0, 20)}`,
          level: "municipal",
          name,
          districtType: "municipal",
          province: "ON",
          geoJson: feature.geometry as object,
          externalId,
        },
      });
      count++;
    } catch (err) {
      console.error(`  ✗ Error saving feature:`, (err as Error).message);
    }
  }

  return count;
}

async function ingestRepresentBoundaries(
  url: string,
  level: "provincial" | "federal",
  districtType: string,
  province: string
): Promise<number> {
  console.log(`⬇  Downloading ${districtType} boundaries from Represent API…`);
  let count = 0;
  let nextUrl: string | null = url;

  while (nextUrl) {
    let data: RepresentResponse;
    try {
      data = await fetchJson<RepresentResponse>(nextUrl);
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${nextUrl}:`, (err as Error).message);
      break;
    }

    console.log(`  Page: ${data.objects?.length ?? 0} records`);

    for (const boundary of data.objects ?? []) {
      try {
        const name = boundary.name?.trim();
        if (!name) continue;

        const geometry = boundary.shape ?? boundary.simple_shape;
        const postalKey = `BOUNDARY__${districtType}__${boundary.external_id || name.slice(0, 20)}`;

        await prisma.geoDistrict.upsert({
          where: {
            postalPrefix_level: {
              postalPrefix: postalKey,
              level,
            },
          },
          update: {
            name,
            districtType,
            province,
            geoJson: geometry ? (geometry as object) : undefined,
            externalId: boundary.external_id,
          },
          create: {
            postalPrefix: postalKey,
            level,
            name,
            districtType,
            province,
            geoJson: geometry ? (geometry as object) : null,
            externalId: boundary.external_id,
          },
        });
        count++;
      } catch (err) {
        console.error(`  ✗ Error saving boundary ${boundary.name}:`, (err as Error).message);
      }
    }

    nextUrl = data.meta?.next ?? null;
  }

  return count;
}

async function main() {
  console.log("=== GIS Boundaries Ingestion Script — Poll City v2.0.0 ===");
  console.log(`Started: ${new Date().toISOString()}\n`);

  let municipalCount = 0;
  let provincialCount = 0;
  let federalCount = 0;

  // 1. Ontario municipal boundaries
  try {
    municipalCount = await ingestMunicipalBoundaries();
    console.log(`  ✓ ${municipalCount} Ontario municipal boundaries saved\n`);
  } catch (err) {
    console.error("  ✗ Municipal boundaries failed:", (err as Error).message, "\n");
  }

  // 2. Ontario provincial electoral districts
  try {
    provincialCount = await ingestRepresentBoundaries(
      ON_ELECTORAL_URL,
      "provincial",
      "provincial",
      "ON"
    );
    console.log(`  ✓ ${provincialCount} Ontario electoral districts saved\n`);
  } catch (err) {
    console.error("  ✗ Provincial boundaries failed:", (err as Error).message, "\n");
  }

  // 3. Federal electoral districts (Canada-wide but filtered by Ontario usage)
  try {
    federalCount = await ingestRepresentBoundaries(
      FED_ELECTORAL_URL,
      "federal",
      "federal",
      "CA"
    );
    console.log(`  ✓ ${federalCount} federal electoral districts saved\n`);
  } catch (err) {
    console.error("  ✗ Federal boundaries failed:", (err as Error).message, "\n");
  }

  console.log("=== Summary ===");
  console.log(`Municipal boundaries:    ${municipalCount}`);
  console.log(`Provincial districts:    ${provincialCount}`);
  console.log(`Federal districts:       ${federalCount}`);
  console.log(`Total:                   ${municipalCount + provincialCount + federalCount}`);
  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
