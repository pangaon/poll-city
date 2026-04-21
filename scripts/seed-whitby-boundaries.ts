/**
 * Poll City — Whitby Ward Boundary Seeder
 *
 * Fetches the official Whitby ward boundaries from OpenNorth Represent API
 * and stores them directly in each client's campaign customization.
 *
 * - Maleeha Shahid  → East Ward boundary
 * - Elizabeth Roy   → All 4 wards (Mayor covers the full Town of Whitby)
 *
 * Run once after provision-whitby-clients.ts:
 *   npx tsx scripts/seed-whitby-boundaries.ts
 */

import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const REPRESENT_API = "https://represent.opennorth.ca/boundaries/whitby-wards/shape?format=json";

interface RepresentShape {
  name: string;
  shape: {
    type: string;
    coordinates: unknown;
  };
}

interface RepresentResponse {
  objects: RepresentShape[];
}

interface GeoJSONFeature {
  type: "Feature";
  properties: { name: string };
  geometry: { type: string; coordinates: unknown };
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

async function fetchBoundaries(): Promise<GeoJSONFeatureCollection> {
  console.log("Fetching Whitby ward boundaries from OpenNorth Represent API…");
  const res = await fetch(REPRESENT_API);
  if (!res.ok) throw new Error(`Represent API returned ${res.status}`);

  const data = (await res.json()) as RepresentResponse;

  const features: GeoJSONFeature[] = data.objects.map((obj) => ({
    type: "Feature",
    properties: { name: obj.name },
    geometry: {
      type: obj.shape.type,
      coordinates: obj.shape.coordinates,
    },
  }));

  console.log(`  Received ${features.length} ward boundaries:`);
  features.forEach((f) => console.log(`    - ${f.properties.name}`));

  return { type: "FeatureCollection", features };
}

async function updateCampaignBoundary(
  slug: string,
  boundary: GeoJSONFeatureCollection | GeoJSONFeature,
  label: string
) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: { id: true, customization: true },
  });

  if (!campaign) {
    console.error(`  ✗ Campaign not found: ${slug} — run provision-whitby-clients.ts first`);
    return;
  }

  const existing = (campaign.customization && typeof campaign.customization === "object")
    ? campaign.customization as Record<string, unknown>
    : {};

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      customization: {
        ...existing,
        boundaryGeoJSON: boundary as unknown as Prisma.InputJsonValue,
        boundaryLabel: label,
        boundaryImportedAt: new Date().toISOString(),
        boundarySource: "OpenNorth Represent API — represent.opennorth.ca/boundaries/whitby-wards",
      } as Prisma.InputJsonValue,
    },
  });

  console.log(`  ✓ ${slug}: boundary saved (${label})`);
}

async function main() {
  console.log("\n=== Whitby Ward Boundary Seeder ===\n");

  const allWards = await fetchBoundaries();

  // East Ward → Maleeha Shahid (Regional Councillor, East Ward 4)
  const eastWardFeature = allWards.features.find(
    (f) => f.properties.name.toLowerCase().includes("east")
  );
  if (!eastWardFeature) throw new Error("East Ward not found in API response");

  // Build single-feature collection for Maleeha (just East Ward)
  const maleehaGeoJSON: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: [eastWardFeature],
  };

  // Full FeatureCollection for Elizabeth (Mayor = all wards)
  const elizabethGeoJSON = allWards;

  console.log("\nWriting boundaries to campaign records…");
  await updateCampaignBoundary("maleeha-shahid", maleehaGeoJSON, "East Ward — Town of Whitby");
  await updateCampaignBoundary("elizabeth-roy-whitby", elizabethGeoJSON, "Town of Whitby — All Wards");

  console.log("\n✓ Done. Both campaign boundaries are live.\n");
  console.log("The boundaries will appear on:");
  console.log("  poll.city/candidates/maleeha-shahid");
  console.log("  poll.city/candidates/elizabeth-roy-whitby");
  console.log("\nAnd in the canvassing map once address points are imported.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
