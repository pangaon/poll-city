import { NextResponse } from "next/server";

const BRAMPTON_ITEM_ID = "61b3e12fb4d74d078a15512dc3baf568";
const BRAMPTON_LAYER = 3;
const BRAMPTON_FALLBACK_URL = `https://opendata.arcgis.com/datasets/${BRAMPTON_ITEM_ID}_${BRAMPTON_LAYER}.geojson`;

const WARD_COLORS = [
  { fill: "#8B5CF6", stroke: "#7040d4" },
  { fill: "#EC4899", stroke: "#c7277a" },
  { fill: "#14B8A6", stroke: "#0d9488" },
  { fill: "#F97316", stroke: "#c2510f" },
  { fill: "#84CC16", stroke: "#5a8c0e" },
  { fill: "#06B6D4", stroke: "#0891b2" },
  { fill: "#A78BFA", stroke: "#7c5ed6" },
  { fill: "#FB7185", stroke: "#e11d48" },
  { fill: "#34D399", stroke: "#059669" },
  { fill: "#FBBF24", stroke: "#d97706" },
];

type RawFeature = {
  type: string;
  properties: Record<string, unknown> | null;
  geometry: unknown;
};

function extractWardName(props: Record<string, unknown>, index: number): string {
  const raw =
    (props["WARD_NAME"] as string) ||
    (props["Ward_Name"] as string) ||
    (props["NAME"] as string) ||
    (props["name"] as string) ||
    (props["WARD_NUM"] as string) ||
    (props["WARD"] as string);
  if (raw) {
    const s = String(raw).trim();
    return /^\d+$/.test(s) ? `Ward ${s}` : s;
  }
  return `Ward ${index + 1}`;
}

function colorize(
  features: RawFeature[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f, i) => {
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
    }),
  } as GeoJSON.FeatureCollection;
}

async function fetchViaRestApi(): Promise<RawFeature[] | null> {
  const metaRes = await fetch(
    `https://www.arcgis.com/sharing/rest/content/items/${BRAMPTON_ITEM_ID}?f=json`,
    { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) },
  );
  if (!metaRes.ok) return null;
  const meta = (await metaRes.json()) as { url?: string };
  if (!meta.url) return null;

  const queryUrl = `${meta.url}/${BRAMPTON_LAYER}/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=100`;
  const dataRes = await fetch(queryUrl, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(12000),
  });
  if (!dataRes.ok) return null;
  const data = (await dataRes.json()) as { type?: string; features?: RawFeature[] };
  if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
    return data.features ?? [];
  }
  return null;
}

export async function GET() {
  // Primary: ArcGIS REST API (via item metadata → service URL)
  try {
    const features = await fetchViaRestApi();
    if (features && features.length > 0) {
      return NextResponse.json(colorize(features));
    }
  } catch { /* fall through */ }

  // Fallback: direct GeoJSON URL
  try {
    const res = await fetch(BRAMPTON_FALLBACK_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = (await res.json()) as { type?: string; features?: RawFeature[] };
      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        return NextResponse.json(colorize(data.features ?? []));
      }
    }
  } catch { /* give up */ }

  return NextResponse.json(
    { error: "Failed to load Brampton ward boundaries" },
    { status: 502 },
  );
}
