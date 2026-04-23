import { NextResponse } from "next/server";

export const maxDuration = 30;

// City of Pickering — OpenData MapServer layer 5 (ward polygons)
// Fields: TEXT_ (ward name), RegionalCouncillor, LocalCouncillor, Mayor
// Service: https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer/5
const PICKERING_WARDS_SERVICE =
  "https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer/5";

const WARD_COLORS = [
  { fill: "#3B82F6", stroke: "#1d4ed8" },
  { fill: "#EF9F27", stroke: "#c47e12" },
  { fill: "#10B981", stroke: "#059669" },
  { fill: "#8B5CF6", stroke: "#7040d4" },
  { fill: "#F43F5E", stroke: "#be123c" },
];

type RawFeature = { type: string; properties: Record<string, unknown> | null; geometry: unknown };

function extractWardName(props: Record<string, unknown>, index: number): string {
  const raw =
    (props["TEXT_"] as string) ||
    (props["WARD_NAME"] as string) ||
    (props["NAME"] as string) ||
    (props["name"] as string);
  if (raw) return raw.trim();
  return `Ward ${index + 1}`;
}

function colorize(features: RawFeature[]): GeoJSON.FeatureCollection {
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
  // Primary: Pickering Open Data MapServer
  const queryUrl =
    `${PICKERING_WARDS_SERVICE}/query` +
    `?where=1%3D1` +
    `&outFields=*` +
    `&f=geojson` +
    `&outSR=4326` +
    `&resultRecordCount=100`;

  try {
    const res = await fetch(queryUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)", Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = (await res.json()) as { type?: string; features?: RawFeature[] };
      if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) > 0) {
        return NextResponse.json(colorize(data.features!), {
          headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
        });
      }
    }
  } catch {
    // fall through to Represent
  }

  // Fallback: Represent OpenNorth
  try {
    const listRes = await fetch(
      "https://represent.opennorth.ca/boundaries/?sets=pickering-wards&limit=20&format=json",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!listRes.ok) throw new Error("Represent list failed");
    const listData = (await listRes.json()) as { objects: Array<{ url: string; name: string }> };

    const featureResults = await Promise.allSettled(
      listData.objects.map(async (b) => {
        const shapeRes = await fetch(
          `https://represent.opennorth.ca${b.url}simple_shape`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!shapeRes.ok) return null;
        const geometry = await shapeRes.json();
        const rawName = b.name.split("/").pop() ?? b.name;
        const wardName = rawName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          type: "Feature",
          properties: { TEXT_: wardName } as Record<string, unknown>,
          geometry,
        } as RawFeature;
      }),
    );

    const features = featureResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<RawFeature | null>).value)
      .filter((v): v is RawFeature => v !== null);

    if (features.length > 0) {
      return NextResponse.json(colorize(features));
    }
  } catch {
    // fall through to error
  }

  return NextResponse.json(
    { error: "Failed to load Pickering ward boundaries — both primary (opendata.pickering.ca) and fallback (Represent) are unavailable" },
    { status: 502 },
  );
}
