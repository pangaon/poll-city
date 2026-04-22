import { NextResponse } from "next/server";
import type { Feature, FeatureCollection } from "geojson";

const WHITBY_ARCGIS_URL =
  "https://opendata.arcgis.com/datasets/223810efc31c40b3aff99dd74f809a97_0.geojson";
const WHITBY_REPRESENT_URL =
  "https://represent.opennorth.ca/boundaries/?sets=whitby-wards&limit=20&format=json";
const TORONTO_CKAN_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=city-wards";
const TORONTO_REPRESENT_URL =
  "https://represent.opennorth.ca/boundaries/?sets=toronto-wards-2018&limit=30&format=json";
const MARKHAM_ITEM_ID = "e18e684f2f004f0e98d707cad60234be";
const MARKHAM_FALLBACK_URL =
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
  { fill: "#EC4899", stroke: "#c7277a" },
  { fill: "#14B8A6", stroke: "#0d9488" },
  { fill: "#F97316", stroke: "#c2510f" },
  { fill: "#84CC16", stroke: "#5a8c0e" },
  { fill: "#06B6D4", stroke: "#0891b2" },
  { fill: "#A78BFA", stroke: "#7c5ed6" },
  { fill: "#FB7185", stroke: "#e11d48" },
  { fill: "#34D399", stroke: "#059669" },
  { fill: "#FBBF24", stroke: "#d97706" },
  { fill: "#60A5FA", stroke: "#2563eb" },
  { fill: "#C084FC", stroke: "#9333ea" },
  { fill: "#4ADE80", stroke: "#16a34a" },
  { fill: "#F472B6", stroke: "#db2777" },
  { fill: "#38BDF8", stroke: "#0284c7" },
  { fill: "#A3E635", stroke: "#65a30d" },
  { fill: "#FB923C", stroke: "#ea580c" },
  { fill: "#E879F9", stroke: "#c026d3" },
];

type RawFeature = {
  type: string;
  properties: Record<string, unknown> | null;
  geometry: unknown;
};

function extractWardName(props: Record<string, unknown>, index: number): string {
  const raw =
    (props["AREA_NAME"] as string) ||
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
    (props["AREA_SHORT_CODE"] as number | string) ||
    (props["WARD_NUM"] as number | string) ||
    (props["Ward_Num"] as number | string) ||
    (props["WARD_NUMBER"] as number | string);
  if (num != null) return `Ward ${num}`;
  return `Ward ${index + 1}`;
}

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

async function fetchWhitbyWards(): Promise<RawFeature[]> {
  // Primary: ArcGIS Open Data
  try {
    const res = await fetch(WHITBY_ARCGIS_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = (await res.json()) as { type?: string; features?: RawFeature[] };
      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        return data.features ?? [];
      }
    }
  } catch { /* fall through */ }

  // Fallback: Represent OpenNorth API
  try {
    const features = await fetchRepresentWards(WHITBY_REPRESENT_URL);
    if (features.length > 0) return features;
  } catch { /* give up */ }
  return [];
}

type CKANResource = { format: string; url: string; name: string };

async function fetchTorontoWards(): Promise<RawFeature[]> {
  try {
    const pkgRes = await fetch(TORONTO_CKAN_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!pkgRes.ok) return [];
    const pkg = (await pkgRes.json()) as {
      success: boolean;
      result: { resources: CKANResource[] };
    };
    if (!pkg.success) return [];
    const resources = pkg.result.resources;
    const gjResource =
      resources.find(
        (r) =>
          r.format.toUpperCase() === "GEOJSON" &&
          r.name.includes("4326") &&
          !r.url.includes("datastore/dump"),
      ) ??
      resources.find(
        (r) =>
          (r.format.toLowerCase().includes("geojson") ||
            r.format.toLowerCase() === "geo json") &&
          !r.url.includes("datastore/dump"),
      ) ??
      resources.find(
        (r) =>
          r.format.toLowerCase().includes("geojson") ||
          r.format.toLowerCase() === "geo json",
      );
    if (!gjResource?.url) return [];
    const dataRes = await fetch(gjResource.url, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!dataRes.ok) return [];
    const data = (await dataRes.json()) as { type?: string; features?: RawFeature[] };
    if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) >= 20) {
      return data.features ?? [];
    }
  } catch { /* fall through */ }

  // Fallback: Represent OpenNorth API
  try {
    const features = await fetchRepresentWards(TORONTO_REPRESENT_URL);
    if (features.length > 0) return features;
  } catch { /* give up */ }
  return [];
}

async function fetchMarkhamWards(): Promise<RawFeature[]> {
  try {
    const metaRes = await fetch(
      `https://www.arcgis.com/sharing/rest/content/items/${MARKHAM_ITEM_ID}?f=json`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) },
    );
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as { url?: string };
      if (meta.url) {
        const queryUrl = `${meta.url}/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=100`;
        const dataRes = await fetch(queryUrl, {
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(10000),
        });
        if (dataRes.ok) {
          const data = (await dataRes.json()) as { type?: string; features?: RawFeature[] };
          if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
            return data.features ?? [];
          }
        }
      }
    }
  } catch { /* fall through */ }

  try {
    const res = await fetch(MARKHAM_FALLBACK_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = (await res.json()) as { type?: string; features?: RawFeature[] };
      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        return data.features ?? [];
      }
    }
  } catch { /* give up */ }
  return [];
}

const MUNI_CONFIG = [
  { name: "Whitby",   addressesApi: "/api/atlas/whitby-addresses",  fetch: fetchWhitbyWards  },
  { name: "Toronto",  addressesApi: "/api/atlas/toronto-addresses",  fetch: fetchTorontoWards },
  { name: "Markham",  addressesApi: "/api/atlas/markham-addresses",  fetch: fetchMarkhamWards },
] as const;

export async function GET() {
  const results = await Promise.allSettled(MUNI_CONFIG.map((m) => m.fetch()));

  let globalIndex = 0;
  const allFeatures: Feature[] = [];

  for (let i = 0; i < MUNI_CONFIG.length; i++) {
    const muni = MUNI_CONFIG[i];
    const result = results[i];
    const rawFeatures: RawFeature[] =
      result.status === "fulfilled" ? result.value : [];

    for (const f of rawFeatures) {
      const color = WARD_COLORS[globalIndex % WARD_COLORS.length];
      const props = f.properties ?? {};
      allFeatures.push({
        ...(f as Feature),
        properties: {
          ...props,
          wardIndex: globalIndex,
          wardName: extractWardName(props, globalIndex),
          wardFill: color.fill,
          wardStroke: color.stroke,
          municipality: muni.name,
          addressesApi: muni.addressesApi,
        },
      });
      globalIndex++;
    }
  }

  if (allFeatures.length === 0) {
    return NextResponse.json(
      { error: "Failed to load ward boundaries from all sources" },
      { status: 502 },
    );
  }

  const fc: FeatureCollection = { type: "FeatureCollection", features: allFeatures };
  return NextResponse.json(fc);
}
