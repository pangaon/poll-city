/**
 * Import civic address points from GeoJSON into the DB, chunked by ward.
 *
 * Usage:
 *   npx tsx scripts/import-address-points.ts \
 *     --file "C:/path/to/Address Points - 4326.geojson" \
 *     --municipality "Toronto"
 *
 * Expects GeoJSON in WGS84 (EPSG:4326 / CRS84).
 * Groups features by the WARD or ward_id property.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import type { Feature, FeatureCollection, Point, MultiPoint } from "geojson";

const prisma = new PrismaClient();

interface AddressProps {
  WARD?: string;
  ward?: string;
  WARD_ID?: string;
  ward_id?: string;
  ADDRESS_FULL?: string;
  address?: string;
  ADDRESS_NUMBER?: string;
  LINEAR_NAME_FULL?: string;
  MUNICIPALITY_NAME?: string;
  [key: string]: unknown;
}

function getWardId(props: AddressProps): string {
  return String(
    props.WARD ?? props.ward ?? props.WARD_ID ?? props.ward_id ?? "unknown"
  ).trim();
}

function normalizeToPoint(feature: Feature): Feature<Point> | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "Point") return feature as Feature<Point>;
  if (g.type === "MultiPoint" && (g as MultiPoint).coordinates.length > 0) {
    const coords = (g as MultiPoint).coordinates[0];
    return { ...feature, geometry: { type: "Point", coordinates: coords } } as Feature<Point>;
  }
  return null;
}

function parseArgs(): { filePath: string; municipality: string } {
  const args = process.argv.slice(2);
  let filePath = "";
  let municipality = "Toronto";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) filePath = args[++i];
    if (args[i] === "--municipality" && args[i + 1]) municipality = args[++i];
  }
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-address-points.ts --file <path.geojson> [--municipality "Toronto"]');
    process.exit(1);
  }
  return { filePath, municipality };
}

async function main() {
  const { filePath, municipality } = parseArgs();

  console.log(`Importing address points from: ${path.basename(filePath)}`);
  console.log(`Municipality: ${municipality}`);

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as FeatureCollection;
  console.log(`Read ${raw.features.length.toLocaleString()} features`);

  // Group by ward
  const byWard = new Map<string, Feature<Point>[]>();
  let skipped = 0;

  for (const f of raw.features) {
    const props = (f.properties ?? {}) as AddressProps;
    const wardId = getWardId(props);
    const point = normalizeToPoint(f);
    if (!point) { skipped++; continue; }

    // Simplify properties to keep DB size manageable
    point.properties = {
      address: props.ADDRESS_FULL ?? props.address ?? `${props.ADDRESS_NUMBER ?? ""} ${props.LINEAR_NAME_FULL ?? ""}`.trim(),
      ward: wardId,
    };

    if (!byWard.has(wardId)) byWard.set(wardId, []);
    byWard.get(wardId)!.push(point);
  }

  console.log(`Grouped into ${byWard.size} wards (${skipped} features skipped — no geometry)`);

  let saved = 0;
  const entries = Array.from(byWard.entries());

  for (let i = 0; i < entries.length; i++) {
    const [wardId, features] = entries[i];
    const fc: FeatureCollection = { type: "FeatureCollection", features };
    await prisma.addressPointLayer.upsert({
      where: { municipality_wardId: { municipality, wardId } },
      create: { municipality, wardId, featureCollection: fc as object, pointCount: features.length },
      update: { featureCollection: fc as object, pointCount: features.length, updatedAt: new Date() },
    });
    saved += features.length;
    process.stdout.write(`\r  Saved ${i + 1}/${entries.length} wards (${saved.toLocaleString()} points)...`);
  }

  console.log(`\n✓ ${saved.toLocaleString()} address points across ${byWard.size} wards saved for ${municipality}.`);
  console.log("Open Atlas → Map → enable Address Points toggle.");
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
