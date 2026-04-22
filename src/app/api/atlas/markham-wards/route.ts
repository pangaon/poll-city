import { NextResponse } from "next/server";

const WARDS_ITEM_ID = "e18e684f2f004f0e98d707cad60234be";
const WARDS_GEOJSON_FALLBACK =
  "https://opendata.arcgis.com/datasets/e18e684f2f004f0e98d707cad60234be_0.geojson";

const WARD_COLORS = [
  { fill: "#1D9E75", stroke: "#0d7a5a" },
  { fill: "#EF9F27", stroke: "#c47e12" },
  { fill: "#6366F1", stroke: "#4f51c7" },
  { fill: "#E24B4A", stroke: "#b83a39" },
  { fill: "#8B5CF6", stroke: "#7040d4" },
  { fill: "#0EA5E9", stroke: "#0284c7" },
  { fill: "#10B981", stroke: "#059669" },
  { fill: "#F59E0B", stroke: "#d97706" },
];

function extractWardName(props: Record<string, unknown>, index: number): string {
  const raw =
    (props["WARD_NAME"] as string) ||
    (props["Ward_Name"] as string) ||
    (props["NAME"] as string) ||
    (props["name"] as string) ||
    (props["WARD"] as string);
  if (raw) {
    const s = String(raw).trim();
    return /^\d+$/.test(s) ? `Ward ${s}` : s;
  }
  const num =
    (props["WARD_NUM"] as number | string) ||
    (props["Ward_Num"] as number | string) ||
    (props["WARD_NUMBER"] as number | string);
  if (num != null) return `Ward ${num}`;
  return `Ward ${index + 1}`;
}

function colorize(
  fc: { type: string; features: Array<{ type: string; properties: Record<string, unknown> | null; geometry: unknown }> },
): GeoJSON.FeatureCollection {
  const features = fc.features.map((f, i) => {
    const color = WARD_COLORS[i % WARD_COLORS.length];
    const props = f.properties ?? {};
    return {
      ...f,
      properties: {
        ...props,
        wardIndex: i,
        wardName: extractWardName(props, i),
        wardFill: color.fill,
        wardStroke: color.stroke,
      },
    };
  });
  return { type: "FeatureCollection", features } as GeoJSON.FeatureCollection;
}

async function fetchFromRestApi(): Promise<GeoJSON.FeatureCollection | null> {
  const metaRes = await fetch(
    `https://www.arcgis.com/sharing/rest/content/items/${WARDS_ITEM_ID}?f=json`,
    { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) },
  );
  if (!metaRes.ok) return null;
  const meta = (await metaRes.json()) as { url?: string };
  if (!meta.url) return null;

  const queryUrl =
    `${meta.url}/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=100`;
  const dataRes = await fetch(queryUrl, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10000),
  });
  if (!dataRes.ok) return null;
  const data = (await dataRes.json()) as { type?: string; features?: unknown[] };
  if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
    return data as unknown as GeoJSON.FeatureCollection;
  }
  return null;
}

export async function GET() {
  try {
    const fc = await fetchFromRestApi();
    if (fc) {
      return NextResponse.json(
        colorize(fc as unknown as { type: string; features: Array<{ type: string; properties: Record<string, unknown> | null; geometry: unknown }> }),
      );
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(WARDS_GEOJSON_FALLBACK, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        return NextResponse.json(colorize(data));
      }
    }
  } catch {
    // fall through
  }

  return NextResponse.json(
    { error: "Failed to load Markham ward boundaries" },
    { status: 502 },
  );
}
