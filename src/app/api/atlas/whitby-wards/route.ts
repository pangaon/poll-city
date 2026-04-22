import { NextResponse } from "next/server";

const ARCGIS_URL =
  "https://opendata.arcgis.com/datasets/223810efc31c40b3aff99dd74f809a97_0.geojson";

const REPRESENT_LIST_URL =
  "https://represent.opennorth.ca/boundaries/?sets=whitby-wards&limit=20&format=json";

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
  if (raw) return raw;
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

export async function GET() {
  // Primary: ArcGIS Open Data
  try {
    const res = await fetch(ARCGIS_URL, {
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

  // Fallback: Represent OpenNorth API
  try {
    const listRes = await fetch(REPRESENT_LIST_URL, {
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
          properties: { WARD_NAME: wardName } as Record<string, unknown>,
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
      { error: `Failed to load Whitby ward boundaries: ${message}` },
      { status: 502 },
    );
  }
}
