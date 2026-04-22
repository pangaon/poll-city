import { NextResponse } from "next/server";

const CKAN_PACKAGE_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=city-wards";

const REPRESENT_URL =
  "https://represent.opennorth.ca/boundaries/?sets=toronto-wards-2018&limit=30&format=json";

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

type CKANResource = { format: string; url: string; name: string };
type CKANPackage = {
  success: boolean;
  result: { resources: CKANResource[] };
};

function extractWardName(props: Record<string, unknown>, index: number): string {
  const raw =
    (props["AREA_NAME"] as string) ||
    (props["WARD_NAME"] as string) ||
    (props["Ward_Name"] as string) ||
    (props["NAME"] as string) ||
    (props["name"] as string) ||
    (props["WARD"] as string);
  if (raw) return raw;
  const num =
    (props["AREA_SHORT_CODE"] as number | string) ||
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

export async function GET() {
  // Primary: Toronto Open Data CKAN → GeoJSON resource
  try {
    const pkgRes = await fetch(CKAN_PACKAGE_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (pkgRes.ok) {
      const pkg = (await pkgRes.json()) as CKANPackage;
      if (pkg.success) {
        const gjResource = pkg.result.resources.find(
          (r) =>
            r.format.toLowerCase().includes("geojson") ||
            r.format.toLowerCase() === "geo json",
        );
        if (gjResource?.url) {
          const dataRes = await fetch(gjResource.url, {
            signal: AbortSignal.timeout(20000),
            headers: { Accept: "application/json" },
            next: { revalidate: 86400 },
          });
          if (dataRes.ok) {
            const data = await dataRes.json();
            if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
              return NextResponse.json(colorize(data));
            }
          }
        }
      }
    }
  } catch {
    // fall through
  }

  // Fallback: Represent OpenNorth API
  try {
    const listRes = await fetch(REPRESENT_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!listRes.ok) throw new Error("Represent list failed");
    const listData = (await listRes.json()) as {
      objects: Array<{ url: string; name: string }>;
    };

    const featureResults = await Promise.allSettled(
      listData.objects.map(async (b) => {
        const shapeRes = await fetch(
          `https://represent.opennorth.ca${b.url}simple_shape`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!shapeRes.ok) return null;
        const geometry = await shapeRes.json();
        const rawName = b.name.split("/").pop() ?? b.name;
        const wardName = rawName
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          type: "Feature",
          properties: { AREA_NAME: wardName } as Record<string, unknown>,
          geometry,
        };
      }),
    );

    type RawFeature = { type: string; properties: Record<string, unknown>; geometry: unknown };
    const features = featureResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<RawFeature | null>).value)
      .filter((v): v is RawFeature => v !== null);

    if (features.length === 0) throw new Error("No ward features returned");

    return NextResponse.json(colorize({ type: "FeatureCollection", features }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load Toronto ward boundaries: ${message}` },
      { status: 502 },
    );
  }
}
