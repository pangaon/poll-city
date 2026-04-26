/**
 * Import Ontario municipal boundaries from OMAFRA open data shapefile.
 *
 * Usage:
 *   npx tsx scripts/import-ontario-municipal-boundaries.ts \
 *     --lower "C:/path/to/MUNICIPAL_BOUNDARY_LOWER_AND_SINGLE_TIER.shp" \
 *     --upper "C:/path/to/MUNICIPAL_BOUNDARY_UPPER_TIER_AND_DISTRICT.shp"
 *
 * Projection: NAD83 Geographic (essentially WGS84 — no reprojection needed)
 * Data source: OMAFRA Open Data — Ontario Municipal Boundaries
 */

import { PrismaClient } from "@prisma/client";
import * as shapefile from "shapefile";
import * as path from "path";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const prisma = new PrismaClient();

interface MuniBoundaryProps {
  MUNID?: number;
  LEGAL_NAME?: string;
  NAME?: string;
  STATUS?: string;
  EXTENT?: string;
  UPPER_TIER?: string;
  MSO?: string;
  [key: string]: unknown;
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

async function importBoundaries(shpPath: string, tierType: string): Promise<void> {
  console.log(`\nReading ${tierType} from: ${path.basename(shpPath)}`);
  const rawFeatures = await readShapefile(shpPath);
  console.log(`  Read ${rawFeatures.length} raw features`);

  // Keep LAND extent only (skip ISLANDS and WATER to avoid visual noise)
  const landFeatures = rawFeatures.filter(f => {
    const p = f.properties as MuniBoundaryProps;
    return !p.EXTENT || p.EXTENT === "LAND" || p.EXTENT === "MAINLAND";
  });

  console.log(`  ${landFeatures.length} land features after filtering`);

  // Clean up properties
  const features: Feature[] = landFeatures.map(f => {
    const p = f.properties as MuniBoundaryProps;
    return {
      type: "Feature" as const,
      geometry: f.geometry as Geometry,
      properties: {
        MUNID: p.MUNID ?? 0,
        LEGAL_NAME: p.LEGAL_NAME ?? p.NAME ?? "",
        NAME: p.NAME ?? "",
        STATUS: p.STATUS ?? "",
        UPPER_TIER: p.UPPER_TIER ?? "",
        MSO: p.MSO ?? "",
      },
    };
  });

  const fc: FeatureCollection = { type: "FeatureCollection", features };

  // Count unique municipalities by MUNID
  const uniqueIds = new Set(features.map(f => (f.properties as MuniBoundaryProps).MUNID));

  await prisma.ontarioMunicipalBoundaryLayer.upsert({
    where: { tierType },
    create: {
      tierType,
      featureCollection: fc as object,
      municipalityCount: uniqueIds.size,
    },
    update: {
      featureCollection: fc as object,
      municipalityCount: uniqueIds.size,
      updatedAt: new Date(),
    },
  });

  console.log(`  ✓ ${features.length} features (${uniqueIds.size} unique municipalities) saved`);
}

function parseArgs(): { lowerPath: string; upperPath: string } {
  const args = process.argv.slice(2);
  let lowerPath = "";
  let upperPath = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lower" && args[i + 1]) lowerPath = args[++i];
    if (args[i] === "--upper" && args[i + 1]) upperPath = args[++i];
  }
  if (!lowerPath) {
    console.error("Usage: npx tsx scripts/import-ontario-municipal-boundaries.ts --lower <path.shp> [--upper <path.shp>]");
    process.exit(1);
  }
  return { lowerPath, upperPath };
}

async function main() {
  const { lowerPath, upperPath } = parseArgs();

  try {
    console.log("Importing Ontario municipal boundaries...");
    await importBoundaries(lowerPath, "lower_and_single");
    if (upperPath) {
      await importBoundaries(upperPath, "upper_and_district");
    }
    console.log("\nDone. Open Atlas → Map → enable Municipal Boundaries toggle.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
