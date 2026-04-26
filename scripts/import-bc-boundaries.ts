/**
 * Import BC electoral district and municipal boundary shapefiles.
 *
 * Usage:
 *   npx tsx scripts/import-bc-boundaries.ts \
 *     --ridings "C:/path/to/electoral_districts.shp" \
 *     --municipal "C:/path/to/bc_municipalities.shp"
 *
 * Projection: BC Albers (EPSG:3005 / NAD83) → WGS84
 *
 * Download sources:
 *   Ridings:   https://elections.bc.ca/resources/maps/gis-spatial-data/
 *   Municipal: https://catalogue.data.gov.bc.ca/dataset/legally-defined-administrative-areas-of-bc
 */

import { PrismaClient } from "@prisma/client";
import * as shapefile from "shapefile";
import proj4 from "proj4";
import * as path from "path";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const prisma = new PrismaClient();

// BC Albers projection (EPSG:3005)
const BC_ALBERS = "+proj=aea +lat_0=45 +lon_0=-126 +lat_1=50 +lat_2=58.5 +x_0=1000000 +y_0=0 +datum=NAD83 +units=m +no_defs";
const WGS84 = "EPSG:4326";

function reprojectCoord(coord: number[]): number[] {
  const [x, y] = proj4(BC_ALBERS, WGS84, [coord[0], coord[1]]);
  return [x, y];
}

function reprojectGeometry(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(ring => ring.map(reprojectCoord)) };
  }
  if (geometry.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map(poly => poly.map(ring => ring.map(reprojectCoord))) };
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

function detectNeedsReprojection(firstFeature: Feature): boolean {
  // If coordinates look like metres (large numbers), needs reprojection
  // If they look like degrees (-180 to 180), already WGS84
  const g = firstFeature.geometry;
  if (!g || !("coordinates" in g)) return false;
  const coords = (g as { coordinates: unknown[] }).coordinates;
  function firstCoord(c: unknown): number[] | null {
    if (!Array.isArray(c)) return null;
    if (typeof c[0] === "number") return c as number[];
    return firstCoord(c[0]);
  }
  const coord = firstCoord(coords);
  if (!coord) return false;
  // BC Albers X is around 1,000,000+ metres; WGS84 lng is around -140 to -114
  return Math.abs(coord[0]) > 1000;
}

async function importRidings(shpPath: string): Promise<void> {
  console.log(`\nReading BC ridings from: ${path.basename(shpPath)}`);
  const rawFeatures = await readShapefile(shpPath);
  console.log(`  Read ${rawFeatures.length} features`);

  const needsReproject = rawFeatures.length > 0 && detectNeedsReprojection(rawFeatures[0]);
  console.log(`  Projection: ${needsReproject ? "BC Albers → reprojecting" : "already WGS84"}`);

  const features: Feature[] = rawFeatures.map(f => ({
    type: "Feature" as const,
    geometry: needsReproject ? reprojectGeometry(f.geometry as Geometry) : f.geometry as Geometry,
    properties: f.properties,
  }));

  const fc: FeatureCollection = { type: "FeatureCollection", features };

  await prisma.bCRidingLayer.upsert({
    where: { id: "bc-ridings-current" },
    create: { id: "bc-ridings-current", featureCollection: fc as object, ridingCount: features.length, electionYear: 2024 },
    update: { featureCollection: fc as object, ridingCount: features.length, updatedAt: new Date() },
  });

  console.log(`  ✓ ${features.length} BC ridings saved`);
}

async function importMunicipal(shpPath: string): Promise<void> {
  console.log(`\nReading BC municipalities from: ${path.basename(shpPath)}`);
  const rawFeatures = await readShapefile(shpPath);
  console.log(`  Read ${rawFeatures.length} features`);

  const needsReproject = rawFeatures.length > 0 && detectNeedsReprojection(rawFeatures[0]);
  console.log(`  Projection: ${needsReproject ? "BC Albers → reprojecting" : "already WGS84"}`);

  const features: Feature[] = rawFeatures.map(f => ({
    type: "Feature" as const,
    geometry: needsReproject ? reprojectGeometry(f.geometry as Geometry) : f.geometry as Geometry,
    properties: f.properties,
  }));

  const fc: FeatureCollection = { type: "FeatureCollection", features };

  await prisma.bCMunicipalBoundaryLayer.upsert({
    where: { id: "bc-municipal-current" },
    create: { id: "bc-municipal-current", featureCollection: fc as object, municipalityCount: features.length },
    update: { featureCollection: fc as object, municipalityCount: features.length, updatedAt: new Date() },
  });

  console.log(`  ✓ ${features.length} BC municipalities saved`);
}

function parseArgs(): { ridingsPath: string; municipalPath: string } {
  const args = process.argv.slice(2);
  let ridingsPath = "";
  let municipalPath = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ridings" && args[i + 1]) ridingsPath = args[++i];
    if (args[i] === "--municipal" && args[i + 1]) municipalPath = args[++i];
  }
  if (!ridingsPath && !municipalPath) {
    console.error("Usage: npx tsx scripts/import-bc-boundaries.ts [--ridings <path.shp>] [--municipal <path.shp>]");
    process.exit(1);
  }
  return { ridingsPath, municipalPath };
}

async function main() {
  const { ridingsPath, municipalPath } = parseArgs();
  try {
    console.log("Importing BC boundaries...");
    if (ridingsPath) await importRidings(ridingsPath);
    if (municipalPath) await importMunicipal(municipalPath);
    console.log("\nDone. Open Atlas → Map → enable BC layers.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
