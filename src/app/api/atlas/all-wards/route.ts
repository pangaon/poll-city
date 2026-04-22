import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Feature, FeatureCollection } from "geojson";
import prisma from "@/lib/db/prisma";
import { WARD_ASSET_REGISTRY } from "@/config/ward-asset-registry";
import { ingestVerifiedMunicipalities } from "@/lib/atlas/ward-ingestor";

// Allow enough time for the lazy-seed path (verified municipalities only — ~5 sources)
export const maxDuration = 60;

// addressesApi lookup — keyed by municipality display name
const ADDRESSES_API = Object.fromEntries(
  WARD_ASSET_REGISTRY.map((e) => [e.municipality, e.addressesApi]),
);

// Accent colours keyed by municipality display name
const MUNI_FILL = Object.fromEntries(
  WARD_ASSET_REGISTRY.map((e) => [e.municipality, e.accentColor]),
);
const MUNI_STROKE = Object.fromEntries(
  WARD_ASSET_REGISTRY.map((e) => [e.municipality, e.accentStroke]),
);

function buildFeatureCollection(
  rows: Array<{
    municipality: string;
    wardName: string;
    wardNumber: number | null;
    wardIndex: number;
    geojsonFeature: unknown;
    updatedAt: Date;
  }>,
): FeatureCollection {
  const features: Feature[] = rows.map((row) => {
    const stored = row.geojsonFeature as Record<string, unknown>;
    return {
      ...(stored as unknown as Feature),
      properties: {
        ...((stored.properties as Record<string, unknown>) ?? {}),
        wardName: row.wardName,
        wardNumber: row.wardNumber,
        wardIndex: row.wardIndex,
        municipality: row.municipality,
        addressesApi: ADDRESSES_API[row.municipality] ?? `/api/atlas/${row.municipality.toLowerCase().replace(/\s+/g, "-")}-addresses`,
        wardFill: MUNI_FILL[row.municipality] ?? "#6366F1",
        wardStroke: MUNI_STROKE[row.municipality] ?? "#4f51c7",
      },
    };
  });

  return { type: "FeatureCollection", features };
}

export async function GET(req: NextRequest) {
  try {
    // ── Layer 2: DB ────────────────────────────────────────────────────────────
    let rows = await prisma.wardBoundary.findMany({
      orderBy: [
        { municipality: "asc" },
        { wardNumber: "asc" },
        { wardName: "asc" },
      ],
      select: {
        municipality: true,
        wardName: true,
        wardNumber: true,
        wardIndex: true,
        geojsonFeature: true,
        updatedAt: true,
      },
    });

    // ── Lazy seed: if DB is empty, seed verified municipalities only ─────────
    // Full 28-municipality ingest is too slow for a live request — use the
    // seed-wards endpoint for that. Here we only seed the ~5 verified sources
    // which completes well within maxDuration.
    if (rows.length === 0) {
      await ingestVerifiedMunicipalities();
      rows = await prisma.wardBoundary.findMany({
        orderBy: [
          { municipality: "asc" },
          { wardNumber: "asc" },
          { wardName: "asc" },
        ],
        select: {
          municipality: true,
          wardName: true,
          wardNumber: true,
          wardIndex: true,
          geojsonFeature: true,
          updatedAt: true,
        },
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Ward boundary data unavailable — run /api/atlas/seed-wards first" },
        { status: 503 },
      );
    }

    const fc = buildFeatureCollection(rows);
    const lastUpdated = rows.reduce((max, r) => r.updatedAt > max ? r.updatedAt : max, rows[0].updatedAt);
    const etag = `"wards-${lastUpdated.getTime()}"`;

    // Conditional GET — return 304 if client already has current data (great for mobile apps)
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(fc, {
      headers: {
        // Edge cache: serve from CDN for 1 hour, allow stale for 24h while revalidating
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "ETag": etag,
        "X-Ward-Count": String(rows.length),
        "X-Last-Refreshed": lastUpdated.toISOString(),
        "X-Municipalities": Array.from(new Set(rows.map((r) => r.municipality))).join(", "),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Ward boundary service error: ${message}` },
      { status: 502 },
    );
  }
}
