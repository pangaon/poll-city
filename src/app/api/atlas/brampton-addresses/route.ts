import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Verified Brampton address service — maps1.brampton.ca
// Source CRS: WKID 2150 (NAD83 / Ontario MNR Lambert) — outSR=4326 forces WGS84 output
const BRAMPTON_ADDR_SERVICE =
  "https://maps1.brampton.ca/arcgis/rest/services/COB/OpenData_Address_Points/MapServer/14";

function normalizeProps(raw: Record<string, unknown>): Record<string, unknown> {
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

  const address =
    [civic, street, unit ? `Unit ${unit}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim() || String(raw["ADDRESS"] ?? raw["address"] ?? "");

  return { ...raw, address, civic, street, unit, postalCode, city, source: "brampton-city" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get("south") ?? "");
  const west  = parseFloat(searchParams.get("west")  ?? "");
  const north = parseFloat(searchParams.get("north") ?? "");
  const east  = parseFloat(searchParams.get("east")  ?? "");

  if ([south, west, north, east].some(isNaN)) {
    return NextResponse.json(
      { error: "bbox params required: south, west, north, east" },
      { status: 400 },
    );
  }

  const geometry = encodeURIComponent(
    JSON.stringify({ xmin: west, ymin: south, xmax: east, ymax: north, spatialReference: { wkid: 4326 } }),
  );

  const queryUrl =
    `${BRAMPTON_ADDR_SERVICE}/query` +
    `?geometry=${geometry}` +
    `&geometryType=esriGeometryEnvelope` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*` +
    `&f=geojson` +
    `&outSR=4326` +
    `&resultRecordCount=2000`;

  try {
    const res = await fetch(queryUrl, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Brampton address service returned HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      type?: string;
      features?: Array<{ properties: Record<string, unknown>; geometry: unknown; type: string }>;
    };
    if (data?.type !== "FeatureCollection") {
      return NextResponse.json(
        { error: "Unexpected response from Brampton address service" },
        { status: 502 },
      );
    }

    const normalized = {
      type: "FeatureCollection",
      features: (data.features ?? []).map((f) => ({
        ...f,
        properties: normalizeProps(f.properties ?? {}),
      })),
    };

    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Brampton address fetch failed: ${message}` },
      { status: 502 },
    );
  }
}
