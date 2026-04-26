/**
 * Import Elections Ontario shapefiles into the DB.
 *
 * Usage:
 *   npx tsx scripts/import-provincial-shapefiles.ts \
 *     --ridings "/path/to/ELECTORAL_DISTRICT.shp" \
 *     --polling "/path/to/POLLING_DIVISION.shp"
 *
 * Projection: EO Lambert Conformal Conic → WGS84
 * Storage: one row for all ridings FeatureCollection, one row per riding for PDs
 */

import { PrismaClient } from "@prisma/client";
import * as shapefile from "shapefile";
import proj4 from "proj4";
import * as path from "path";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const prisma = new PrismaClient();

// Elections Ontario Lambert Conformal Conic projection definition
const EO_LCC =
  "+proj=lcc +lat_0=0 +lon_0=-84 +lat_1=44.5 +lat_2=54.5 +x_0=1000000 +y_0=0 +datum=NAD83 +units=m +no_defs";
const WGS84 = "EPSG:4326";

interface EODistrictProperties {
  ED_ID?: number;
  ED_NAME_EN?: string;
  ED_NAME_FR?: string;
  [key: string]: unknown;
}

interface EOPollDivProperties {
  ED_ID?: number;
  PD_NUMBER?: string | number;
  [key: string]: unknown;
}

function reprojectCoord(coord: number[]): number[] {
  const [x, y] = proj4(EO_LCC, WGS84, [coord[0], coord[1]]);
  return [x, y];
}

function reprojectGeometry(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map(reprojectCoord)
      ),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map(reprojectCoord))
      ),
    };
  }
  return geometry;
}

async function readShapefile(shpPath: string): Promise<Feature[]> {
  const features: Feature[] = [];
  const dbfPath = shpPath.replace(/\.shp$/i, ".dbf");
  const source = await shapefile.open(shpPath, dbfPath);
  let result = await source.read();
  while (!result.done) {
    if (result.value) features.push(result.value as Feature);
    result = await source.read();
  }
  return features;
}

function parseArgs(): { ridingsPath: string; pollingPath: string } {
  const args = process.argv.slice(2);
  let ridingsPath = "";
  let pollingPath = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ridings" && args[i + 1]) ridingsPath = args[++i];
    if (args[i] === "--polling" && args[i + 1]) pollingPath = args[++i];
  }
  if (!ridingsPath || !pollingPath) {
    console.error(
      "Usage: npx tsx scripts/import-provincial-shapefiles.ts --ridings <path.shp> --polling <path.shp>"
    );
    process.exit(1);
  }
  return { ridingsPath, pollingPath };
}

async function importRidings(shpPath: string): Promise<Map<number, string>> {
  console.log(`Reading ridings from: ${path.basename(shpPath)}`);
  const rawFeatures = await readShapefile(shpPath);
  console.log(`  Read ${rawFeatures.length} raw features`);

  const features: Feature[] = rawFeatures.map((f, idx) => {
    const props = (f.properties ?? {}) as EODistrictProperties;
    return {
      type: "Feature" as const,
      geometry: reprojectGeometry(f.geometry as Geometry),
      properties: {
        ED_ID: props.ED_ID ?? idx,
        ED_NAME_EN: props.ED_NAME_EN ?? "",
        ED_NAME_FR: props.ED_NAME_FR ?? "",
      },
    };
  });

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  await prisma.ontarioRidingLayer.upsert({
    where: { id: "ontario-ridings-2022" },
    create: {
      id: "ontario-ridings-2022",
      featureCollection: featureCollection as object,
      ridingCount: features.length,
      electionYear: 2022,
    },
    update: {
      featureCollection: featureCollection as object,
      ridingCount: features.length,
      electionYear: 2022,
      updatedAt: new Date(),
    },
  });

  console.log(`  ✓ ${features.length} ridings saved`);

  // Build edId → edName map for PD grouping
  const ridingMap = new Map<number, string>();
  features.forEach((f) => {
    const p = f.properties as EODistrictProperties;
    if (p.ED_ID !== undefined) ridingMap.set(p.ED_ID, p.ED_NAME_EN ?? "");
  });
  return ridingMap;
}

async function importPollingDivisions(
  shpPath: string,
  ridingMap: Map<number, string>
): Promise<void> {
  console.log(`Reading polling divisions from: ${path.basename(shpPath)}`);
  const rawFeatures = await readShapefile(shpPath);
  console.log(`  Read ${rawFeatures.length} raw features`);

  // Group PDs by ED_ID
  const byRiding = new Map<number, Feature[]>();
  for (const f of rawFeatures) {
    const props = (f.properties ?? {}) as EOPollDivProperties;
    const edId = props.ED_ID;
    if (edId === undefined || edId === null) continue;
    if (!byRiding.has(edId)) byRiding.set(edId, []);
    byRiding.get(edId)!.push({
      type: "Feature" as const,
      geometry: reprojectGeometry(f.geometry as Geometry),
      properties: {
        ED_ID: edId,
        PD_NUMBER: props.PD_NUMBER ?? "",
      },
    });
  }

  console.log(`  Grouped into ${byRiding.size} ridings`);

  let totalPDs = 0;
  const upserts = Array.from(byRiding.entries()).map(([edId, features]) => {
    totalPDs += features.length;
    const fc: FeatureCollection = { type: "FeatureCollection", features };
    const edName = ridingMap.get(edId) ?? "";
    return prisma.ontarioPollingDivisionLayer.upsert({
      where: { edId_electionYear: { edId, electionYear: 2025 } },
      create: {
        edId,
        edNameEnglish: edName,
        featureCollection: fc as object,
        pdCount: features.length,
        electionYear: 2025,
      },
      update: {
        edNameEnglish: edName,
        featureCollection: fc as object,
        pdCount: features.length,
        updatedAt: new Date(),
      },
    });
  });

  // Batch in chunks of 10 to avoid overwhelming the DB connection
  const CHUNK = 10;
  for (let i = 0; i < upserts.length; i += CHUNK) {
    await Promise.all(upserts.slice(i, i + CHUNK));
    process.stdout.write(
      `\r  Saved ${Math.min(i + CHUNK, upserts.length)}/${upserts.length} ridings...`
    );
  }
  console.log(`\n  ✓ ${totalPDs} polling divisions across ${upserts.length} ridings saved`);
}

async function main() {
  const { ridingsPath, pollingPath } = parseArgs();

  try {
    console.log("Importing Elections Ontario provincial boundaries...\n");
    const ridingMap = await importRidings(ridingsPath);
    await importPollingDivisions(pollingPath, ridingMap);
    console.log("\nDone. Open Atlas → Map → enable ON Ridings or Polling Divs toggle.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
