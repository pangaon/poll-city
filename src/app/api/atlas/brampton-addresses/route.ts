import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BRAMPTON_ADDR_ITEM_ID = "56bd6b5ac117445db5e64d14b72e061e";
const BRAMPTON_ADDR_LAYER = 14;

// Resolve service URL from ArcGIS item metadata once and cache
let cachedServiceUrl: string | null = null;

async function getServiceUrl(): Promise<string | null> {
  if (cachedServiceUrl) return cachedServiceUrl;
  try {
    const metaRes = await fetch(
      `https://geohub.brampton.ca/sharing/rest/content/items/${BRAMPTON_ADDR_ITEM_ID}?f=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string };
    if (meta.url) {
      cachedServiceUrl = meta.url;
      return meta.url;
    }
  } catch { /* fall through */ }
  return null;
}

function normalizeProps(raw: Record<string, unknown>): Record<string, unknown> {
  // Map Brampton GeoHub field names to our standard address schema
  const civic =
    String(raw["CIVIC_NUM"] ?? raw["HOUSE_NUMBER"] ?? raw["ADDRESS_NUM"] ?? raw["ST_NUM"] ?? raw["civic"] ?? "").trim();
  const street =
    String(
      raw["STREET_FULL"] ??
      (raw["STREET_NAME"]
        ? [raw["STREET_NAME"], raw["STREET_TYPE"], raw["STREET_DIR"]].filter(Boolean).join(" ")
        : raw["STREET"] ?? raw["street"] ?? ""),
    ).trim();
  const unit =
    String(raw["UNIT_NUMBER"] ?? raw["SUITE"] ?? raw["APT"] ?? raw["unit"] ?? "").trim();
  const postalCode =
    String(raw["POSTAL_CODE"] ?? raw["POSTCODE"] ?? raw["postal_code"] ?? raw["postalCode"] ?? "").trim();
  const city = "Brampton";

  const address = [civic, street, unit ? `Unit ${unit}` : ""].filter(Boolean).join(" ").trim() || String(raw["ADDRESS"] ?? raw["address"] ?? "");

  return {
    ...raw,
    address,
    civic,
    street,
    unit,
    postalCode,
    city,
    source: "brampton-geohub",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get("south") ?? "");
  const west = parseFloat(searchParams.get("west") ?? "");
  const north = parseFloat(searchParams.get("north") ?? "");
  const east = parseFloat(searchParams.get("east") ?? "");

  if ([south, west, north, east].some(isNaN)) {
    return NextResponse.json({ error: "bbox params required: south, west, north, east" }, { status: 400 });
  }

  const serviceUrl = await getServiceUrl();
  if (!serviceUrl) {
    return NextResponse.json({ error: "Could not resolve Brampton address service URL" }, { status: 502 });
  }

  const geometry = encodeURIComponent(JSON.stringify({
    xmin: west, ymin: south, xmax: east, ymax: north,
    spatialReference: { wkid: 4326 },
  }));

  const queryUrl =
    `${serviceUrl}/${BRAMPTON_ADDR_LAYER}/query` +
    `?geometry=${geometry}` +
    `&geometryType=esriGeometryEnvelope` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*` +
    `&f=geojson` +
    `&resultRecordCount=2000` +
    `&outSR=4326`;

  try {
    const res = await fetch(queryUrl, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Brampton address service returned HTTP ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { type?: string; features?: Array<{ properties: Record<string, unknown>; geometry: unknown; type: string }> };
    if (data?.type !== "FeatureCollection") {
      return NextResponse.json({ error: "Unexpected response from Brampton address service" }, { status: 502 });
    }

    const normalized = {
      type: "FeatureCollection",
      features: (data.features ?? []).map((f) => ({
        ...f,
        properties: normalizeProps(f.properties ?? {}),
      })),
    };

    return NextResponse.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Brampton address fetch failed: ${message}` }, { status: 502 });
  }
}
