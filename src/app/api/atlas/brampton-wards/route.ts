import { NextResponse } from "next/server";

const BRAMPTON_ITEM_ID = "61b3e12fb4d74d078a15512dc3baf568";
const BRAMPTON_LAYER = 3;
// Brampton GeoHub meta endpoint returns HTML from server environments.
// Direct GeoJSON download returns EPSG:3857 — MapLibre requires WGS84.
// Represent OpenNorth is the reliable WGS84 source.
const BRAMPTON_REPRESENT_URL = "https://represent.opennorth.ca/boundaries/?sets=brampton-wards&limit=20&format=json";
const BRAMPTON_GEOHUB_META = `https://geohub.brampton.ca/sharing/rest/content/items/${BRAMPTON_ITEM_ID}?f=json`;

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

async function fetchRepresentWards(listUrl: string): Promise<RawFeature[]> {
  const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(8000) });
  if (!listRes.ok) return [];
  const listData = (await listRes.json()) as { objects: Array<{ url: string; name: string }> };
  const results = await Promise.allSettled(
    listData.objects.map(async (b) => {
      const shapeRes = await fetch(
        `https://represent.opennorth.ca${b.url}simple_shape`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!shapeRes.ok) return null;
      const geometry = await shapeRes.json();
      const rawName = b.name.split("/").pop() ?? b.name;
      const wardName = rawName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { type: "Feature", properties: { WARD_NAME: wardName } as Record<string, unknown>, geometry };
    }),
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<RawFeature | null>).value)
    .filter((v): v is RawFeature => v !== null);
}

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

export async function GET() {
  // Primary: Represent OpenNorth API — WGS84 guaranteed, reliable from Vercel
  try {
    const features = await fetchRepresentWards(BRAMPTON_REPRESENT_URL);
    if (features.length > 0) return NextResponse.json(colorize(features));
  } catch { /* fall through */ }

  // Secondary: Brampton GeoHub REST API with outSR=4326
  try {
    const metaRes = await fetch(BRAMPTON_GEOHUB_META, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000),
    });
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as { url?: string };
      if (meta.url) {
        const queryUrl = `${meta.url}/${BRAMPTON_LAYER}/query?where=1%3D1&outFields=*&f=geojson&outSR=4326&resultRecordCount=100`;
        const dataRes = await fetch(queryUrl, {
          next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000),
        });
        if (dataRes.ok) {
          const data = (await dataRes.json()) as { type?: string; features?: RawFeature[] };
          if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
            return NextResponse.json(colorize(data.features ?? []));
          }
        }
      }
    }
  } catch { /* give up */ }
  // NOTE: Direct GeoHub/hub.arcgis.com GeoJSON download omitted — returns EPSG:3857, not WGS84.

  return NextResponse.json(
    { error: "Failed to load Brampton ward boundaries" },
    { status: 502 },
  );
}
