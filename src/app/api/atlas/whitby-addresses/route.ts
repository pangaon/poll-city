import { NextResponse } from "next/server";

export const maxDuration = 60;

// Whitby, Ontario bounding box (Town of Whitby, Durham Region)
const BBOX = { south: 43.833, west: -79.050, north: 44.030, east: -78.880 };

const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

export async function GET() {
  const { south, west, north, east } = BBOX;
  const query = `[out:json][timeout:45];(node["addr:housenumber"]["addr:street"](${south},${west},${north},${east}););out 5000;`;
  const enc = encodeURIComponent(query);

  let data: { elements: OverpassElement[] } | null = null;

  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${enc}`, {
        headers: {
          "User-Agent": "PollCity/1.0 (contact@poll.city)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        data = (await res.json()) as { elements: OverpassElement[] };
        break;
      }
    } catch {
      // try next mirror
    }
  }

  if (!data) {
    return NextResponse.json(
      { error: "Could not reach OpenStreetMap servers. Try again in a moment." },
      { status: 502 },
    );
  }

  const features = (data.elements ?? [])
    .filter((el) => el.lat != null && el.lon != null)
    .map((el) => {
      const tags = el.tags ?? {};
      const civic = tags["addr:housenumber"] ?? "";
      const street = tags["addr:street"] ?? "";
      const address = `${civic} ${street}`.trim();
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [el.lon!, el.lat!] },
        properties: {
          id: el.id,
          address,
          civic,
          street,
          postalCode: tags["addr:postcode"] ?? "",
          city: tags["addr:city"] ?? "Whitby",
          unit: tags["addr:unit"] ?? "",
        },
      };
    })
    .filter((f) => f.properties.address.length > 0);

  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
  );
}
