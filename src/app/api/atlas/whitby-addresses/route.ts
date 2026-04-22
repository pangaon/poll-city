import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Town of Whitby official address points — Whitby GeoHub (ArcGIS)
// https://geohub-whitby.hub.arcgis.com/datasets/5198a2ba0f0145e3a79db28045a4245d_0
const ARCGIS_URL =
  "https://opendata.arcgis.com/datasets/5198a2ba0f0145e3a79db28045a4245d_0.geojson";

// OSM Overpass fallback
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Hard bounds for Whitby, Ontario — reject any bbox outside this
const WHITBY_HARD_BOUNDS = { south: 43.80, west: -79.10, north: 44.05, east: -78.82 };

type ArcGISFeature = {
  type: string;
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: Record<string, unknown>;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

type BBox = { south: number; west: number; north: number; east: number };

// ─── validation ──────────────────────────────────────────────────────────────

function parseBbox(params: URLSearchParams): BBox | null {
  const keys = ["south", "west", "north", "east"] as const;
  const vals = keys.map((k) => parseFloat(params.get(k) ?? ""));
  if (vals.some((v) => isNaN(v))) return null;
  const [south, west, north, east] = vals;
  const b = WHITBY_HARD_BOUNDS;
  // Clamp to Whitby hard bounds — never fetch outside the municipality
  return {
    south: Math.max(south, b.south),
    west: Math.max(west, b.west),
    north: Math.min(north, b.north),
    east: Math.min(east, b.east),
  };
}

function inBbox(lng: number, lat: number, bbox: BBox): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

// ─── property extraction ──────────────────────────────────────────────────────

function extractAddress(props: Record<string, unknown>) {
  const civic = String(
    props["CIVIC_NUM"] ?? props["CIVIC"] ?? props["ADDRESS_NUM"] ??
    props["HouseNumber"] ?? props["ADDR_NUM"] ?? props["ADDNUM"] ?? "",
  );
  const street = String(
    props["STREET_NAME"] ?? props["STREET"] ?? props["FULL_STREET"] ??
    props["StreetName"] ?? props["ADDR_STREET"] ?? props["ST_NAME"] ?? "",
  );
  const suffix = String(
    props["STREET_TYPE"] ?? props["STREET_SFX"] ?? props["StreetType"] ??
    props["ST_TYPE"] ?? "",
  );
  const dir = String(props["STREET_DIR"] ?? props["DIR"] ?? props["ST_DIR"] ?? "");
  const streetFull = [street, suffix, dir].filter(Boolean).join(" ").trim();
  const address =
    [civic, streetFull].filter(Boolean).join(" ").trim() ||
    String(props["FULL_ADDRESS"] ?? props["ADDRESS"] ?? props["FullAddress"] ?? "");
  return {
    address,
    civic,
    street: streetFull || street,
    postalCode: String(props["POSTAL_CODE"] ?? props["PostalCode"] ?? props["POSTCODE"] ?? ""),
    city: String(props["MUNICIPALITY"] ?? props["CITY"] ?? props["City"] ?? "Whitby"),
    unit: String(props["UNIT"] ?? props["SUITE"] ?? props["Unit"] ?? ""),
  };
}

// ─── handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams) ?? WHITBY_HARD_BOUNDS;

  // ── Primary: Town of Whitby official ArcGIS dataset ──────────────────────
  try {
    const res = await fetch(ARCGIS_URL, {
      headers: { Accept: "application/json", "User-Agent": "PollCity/1.0 (contact@poll.city)" },
      signal: AbortSignal.timeout(30000),
      next: { revalidate: 86400 }, // cache the full dataset for 24h
    });

    if (res.ok) {
      const data = (await res.json()) as { type: string; features: ArcGISFeature[] };

      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        const features = data.features
          .filter((f) => {
            if (!f.geometry?.coordinates) return false;
            const [lng, lat] = f.geometry.coordinates;
            return inBbox(lng, lat, bbox);
          })
          .map((f, i) => {
            const addr = extractAddress(f.properties ?? {});
            return {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: f.geometry!.coordinates },
              properties: { id: i, source: "whitby-geohub", ...addr },
            };
          })
          .filter((f) => f.properties.address.length > 0);

        return NextResponse.json(
          {
            type: "FeatureCollection",
            features,
            meta: { count: features.length, source: "whitby-geohub", bbox },
          },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
        );
      }
    }
  } catch {
    // fall through to OSM
  }

  // ── Fallback: OpenStreetMap via Overpass ──────────────────────────────────
  const { south, west, north, east } = bbox;
  const query = `[out:json][timeout:45];(node["addr:housenumber"]["addr:street"](${south},${west},${north},${east}););out 5000;`;
  const enc = encodeURIComponent(query);

  let osmData: { elements: OverpassElement[] } | null = null;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const r = await fetch(`${mirror}?data=${enc}`, {
        headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)", Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        osmData = (await r.json()) as { elements: OverpassElement[] };
        break;
      }
    } catch { /* try next */ }
  }

  if (!osmData) {
    return NextResponse.json(
      { error: "Address data temporarily unavailable. Both Whitby GeoHub and OpenStreetMap are unreachable." },
      { status: 502 },
    );
  }

  const features = (osmData.elements ?? [])
    .filter((el) => el.lat != null && el.lon != null && inBbox(el.lon!, el.lat!, bbox))
    .map((el) => {
      const tags = el.tags ?? {};
      const civic = tags["addr:housenumber"] ?? "";
      const street = tags["addr:street"] ?? "";
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [el.lon!, el.lat!] },
        properties: {
          id: el.id, source: "osm",
          address: `${civic} ${street}`.trim(),
          civic, street,
          postalCode: tags["addr:postcode"] ?? "",
          city: tags["addr:city"] ?? "Whitby",
          unit: tags["addr:unit"] ?? "",
        },
      };
    })
    .filter((f) => f.properties.address.length > 0);

  return NextResponse.json(
    { type: "FeatureCollection", features, meta: { count: features.length, source: "osm-fallback", bbox } },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
