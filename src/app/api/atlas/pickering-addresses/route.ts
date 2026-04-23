import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

// Primary: City of Pickering address points — 42,610 points
// Service: https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer/0
// Fields: HOUSENUMBE, HOUSENUM_1, STREET, STREETTYPE, STREETDIRE, UNITTYPE, UNITNUMBER, CITY
const PICKERING_ADDR_SERVICE =
  "https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer/0";

// Secondary: Durham Region civic addresses — 253,329 points, includes postal codes
// Filter to Pickering only; useful as enriched fallback (has POSTAL_CODE)
const DURHAM_ADDR_SERVICE =
  "https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer/0";

// OSM Overpass mirrors
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Hard bounds for City of Pickering, Ontario
const PICKERING_BOUNDS = { south: 43.76, west: -79.25, north: 44.02, east: -78.98 };

type BBox = { south: number; west: number; north: number; east: number };
type ArcGISFeature = { type: string; geometry: { type: string; coordinates: [number, number] } | null; properties: Record<string, unknown> };
type OverpassElement = { id: number; lat?: number; lon?: number; tags?: Record<string, string> };

function parseBbox(params: URLSearchParams): BBox | null {
  const keys = ["south", "west", "north", "east"] as const;
  const vals = keys.map((k) => parseFloat(params.get(k) ?? ""));
  if (vals.some((v) => isNaN(v))) return null;
  const [south, west, north, east] = vals;
  const b = PICKERING_BOUNDS;
  return {
    south: Math.max(south, b.south),
    west:  Math.max(west,  b.west),
    north: Math.min(north, b.north),
    east:  Math.min(east,  b.east),
  };
}

function inBbox(lng: number, lat: number, bbox: BBox): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function buildGeometryParam(bbox: BBox): string {
  return encodeURIComponent(
    JSON.stringify({
      xmin: bbox.west, ymin: bbox.south, xmax: bbox.east, ymax: bbox.north,
      spatialReference: { wkid: 4326 },
    }),
  );
}

function normPickering(props: Record<string, unknown>): Record<string, unknown> {
  const civic    = String(props["HOUSENUMBE"] ?? props["HOUSENUM_1"] ?? "").trim();
  const street   = String(props["STREET"] ?? "").trim();
  const suffix   = String(props["STREETTYPE"] ?? "").trim();
  const dir      = String(props["STREETDIRE"] ?? "").trim();
  const unitType = String(props["UNITTYPE"] ?? "").trim();
  const unitNum  = String(props["UNITNUMBER"] ?? "").trim();
  const city     = String(props["CITY"] ?? "Pickering").trim() || "Pickering";

  const streetFull = [street, suffix, dir].filter(Boolean).join(" ").trim();
  const unit = unitNum ? [unitType, unitNum].filter(Boolean).join(" ") : "";
  const address = [civic, streetFull, unit ? `Unit ${unitNum}` : ""]
    .filter(Boolean).join(" ").trim();

  return { ...props, address, civic, street: streetFull || street, unit, postalCode: "", city, source: "pickering-opendata" };
}

function normDurham(props: Record<string, unknown>): Record<string, unknown> {
  const civic      = String(props["CIVIC_NUM"] ?? "").trim();
  const street     = String(props["ROAD_NAME"] ?? "").trim();
  const suffix     = String(props["ROAD_TYPE"] ?? "").trim();
  const city       = String(props["TOWN"] ?? "Pickering").trim() || "Pickering";
  const postalCode = String(props["POSTAL_CODE"] ?? "").trim();
  const unitType   = String(props["UNIT_TYPE"] ?? "").trim();

  const streetFull = [street, suffix].filter(Boolean).join(" ").trim();
  const address    = [civic, streetFull].filter(Boolean).join(" ").trim();

  return { ...props, address, civic, street: streetFull || street, unit: unitType, postalCode, city, source: "durham-opendata" };
}

async function fetchPickeringBbox(bbox: BBox): Promise<ArcGISFeature[] | null> {
  const geometry = buildGeometryParam(bbox);
  const url =
    `${PICKERING_ADDR_SERVICE}/query` +
    `?geometry=${geometry}` +
    `&geometryType=esriGeometryEnvelope` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*` +
    `&f=geojson` +
    `&outSR=4326` +
    `&resultRecordCount=3000`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { type?: string; features?: ArcGISFeature[] };
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) return data.features;
  } catch { /* fall through */ }
  return null;
}

async function fetchDurhamBbox(bbox: BBox): Promise<ArcGISFeature[] | null> {
  const geometry = buildGeometryParam(bbox);
  const where = encodeURIComponent("TOWN='Pickering'");
  const url =
    `${DURHAM_ADDR_SERVICE}/query` +
    `?where=${where}` +
    `&geometry=${geometry}` +
    `&geometryType=esriGeometryEnvelope` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*` +
    `&f=geojson` +
    `&outSR=4326` +
    `&resultRecordCount=3000`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { type?: string; features?: ArcGISFeature[] };
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) return data.features;
  } catch { /* fall through */ }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams) ?? PICKERING_BOUNDS;

  // ── Primary: Pickering Open Data address points ──────────────────────────────
  const pickeringFeatures = await fetchPickeringBbox(bbox);
  if (pickeringFeatures !== null) {
    const features = pickeringFeatures
      .filter((f) => {
        if (!f.geometry?.coordinates) return false;
        const [lng, lat] = f.geometry.coordinates;
        return inBbox(lng, lat, bbox);
      })
      .map((f, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: f.geometry!.coordinates },
        properties: { id: i, ...normPickering(f.properties ?? {}) },
      }))
      .filter((f) => ((f.properties as unknown as { address?: string }).address ?? "").length > 0);

    return NextResponse.json(
      { type: "FeatureCollection", features, meta: { count: features.length, source: "pickering-opendata", bbox } },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
    );
  }

  // ── Secondary: Durham Region addresses (filtered to Pickering, has postal codes) ─
  const durhamFeatures = await fetchDurhamBbox(bbox);
  if (durhamFeatures !== null) {
    const features = durhamFeatures
      .filter((f) => {
        if (!f.geometry?.coordinates) return false;
        const [lng, lat] = f.geometry.coordinates;
        return inBbox(lng, lat, bbox);
      })
      .map((f, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: f.geometry!.coordinates },
        properties: { id: i, ...normDurham(f.properties ?? {}) },
      }))
      .filter((f) => ((f.properties as unknown as { address?: string }).address ?? "").length > 0);

    return NextResponse.json(
      { type: "FeatureCollection", features, meta: { count: features.length, source: "durham-opendata", bbox } },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
    );
  }

  // ── Final fallback: OpenStreetMap Overpass ────────────────────────────────────
  const { south, west, north, east } = bbox;
  const query = `[out:json][timeout:45];(node["addr:housenumber"]["addr:street"](${south},${west},${north},${east}););out 3000;`;
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
      { error: "Address data unavailable — Pickering Open Data, Durham Region, and OpenStreetMap are all unreachable." },
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
          city: tags["addr:city"] ?? "Pickering",
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
