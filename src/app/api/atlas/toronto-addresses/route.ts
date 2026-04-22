import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const CKAN_PACKAGE_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=address-points-municipal-toronto-one-address-repository";

// OSM Overpass fallback mirrors
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Hard bounds for City of Toronto — reject any bbox outside this
const TORONTO_HARD_BOUNDS = { south: 43.58, west: -79.64, north: 43.86, east: -79.12 };

type CKANResource = { format: string; url: string; name: string };
type CKANPackage = {
  success: boolean;
  result: { resources: CKANResource[] };
};

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
  const b = TORONTO_HARD_BOUNDS;
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

function isArcGISEndpoint(url: string): boolean {
  return url.includes("FeatureServer") || url.includes("MapServer");
}

function buildArcGISBboxQuery(baseUrl: string, bbox: BBox): string {
  // Strip trailing /query if present
  const base = baseUrl.replace(/\/query\/?$/, "");
  const { south, west, north, east } = bbox;
  const params = new URLSearchParams({
    where: "1=1",
    geometry: `${west},${south},${east},${north}`,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outSR: "4326",
    outFields: "*",
    f: "geojson",
    resultRecordCount: "5000",
  });
  return `${base}/query?${params.toString()}`;
}

// ─── property extraction ──────────────────────────────────────────────────────

function extractAddress(props: Record<string, unknown>) {
  const civic = String(
    props["ADDNUM"] ?? props["CIVIC_NUM"] ?? props["CIVIC"] ?? props["ADDRESS_NUM"] ??
    props["HouseNumber"] ?? props["ADDR_NUM"] ?? props["NUM"] ?? "",
  );
  const street = String(
    props["LNAME"] ?? props["STREET_NAME"] ?? props["STREET"] ?? props["FULL_STREET"] ??
    props["StreetName"] ?? props["ADDR_STREET"] ?? props["ST_NAME"] ?? "",
  );
  const suffix = String(
    props["LTYPE"] ?? props["STREET_TYPE"] ?? props["STREET_SFX"] ?? props["StreetType"] ??
    props["ST_TYPE"] ?? "",
  );
  const dir = String(
    props["LDIR"] ?? props["STREET_DIR"] ?? props["DIR"] ?? props["ST_DIR"] ?? "",
  );
  const streetFull = [street, suffix, dir].filter(Boolean).join(" ").trim();
  const address =
    [civic, streetFull].filter(Boolean).join(" ").trim() ||
    String(props["ADDRESS"] ?? props["LFNAME"] ?? props["FULL_ADDRESS"] ?? props["FullAddress"] ?? "");
  return {
    address,
    civic,
    street: streetFull || street,
    postalCode: String(props["POSTCODE"] ?? props["POSTAL_CODE"] ?? props["PostalCode"] ?? ""),
    city: String(props["MUNICIPALITY"] ?? props["CITY"] ?? props["City"] ?? "Toronto"),
    unit: String(props["UNIT_NUM"] ?? props["UNIT"] ?? props["SUITE"] ?? props["Unit"] ?? ""),
  };
}

// ─── handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams) ?? TORONTO_HARD_BOUNDS;

  // ── Primary: Toronto Open Data CKAN → ArcGIS bbox query ──────────────────
  try {
    const pkgRes = await fetch(CKAN_PACKAGE_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (pkgRes.ok) {
      const pkg = (await pkgRes.json()) as CKANPackage;
      if (pkg.success) {
        // Find a GeoJSON resource — prefer ones with ArcGIS FeatureServer URL
        const resources = pkg.result.resources;
        const arcGISResource = resources.find(
          (r) =>
            (r.format.toLowerCase().includes("geojson") ||
              r.format.toLowerCase() === "geo json" ||
              r.name.toLowerCase().includes("wgs84")) &&
            isArcGISEndpoint(r.url),
        );
        const gjResource = arcGISResource ??
          resources.find(
            (r) =>
              r.format.toLowerCase().includes("geojson") ||
              r.format.toLowerCase() === "geo json" ||
              r.name.toLowerCase().includes("wgs84"),
          );

        if (gjResource?.url) {
          // For ArcGIS endpoints, use native bbox query
          const fetchUrl = isArcGISEndpoint(gjResource.url)
            ? buildArcGISBboxQuery(gjResource.url, bbox)
            : gjResource.url;

          const dataRes = await fetch(fetchUrl, {
            signal: AbortSignal.timeout(25000),
            headers: {
              Accept: "application/json",
              "User-Agent": "PollCity/1.0 (contact@poll.city)",
            },
          });
          if (dataRes.ok) {
            const data = (await dataRes.json()) as { type: string; features: ArcGISFeature[] };
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
                    properties: { id: i, source: "toronto-opendata", ...addr },
                  };
                })
                .filter((f) => f.properties.address.length > 0);

              return NextResponse.json(
                {
                  type: "FeatureCollection",
                  features,
                  meta: { count: features.length, source: "toronto-opendata", bbox },
                },
                { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
              );
            }
          }
        }
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
      { error: "Address data temporarily unavailable. Both Toronto Open Data and OpenStreetMap are unreachable." },
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
          city: tags["addr:city"] ?? "Toronto",
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
