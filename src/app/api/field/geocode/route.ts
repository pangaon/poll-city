import { NextRequest, NextResponse } from "next/server";

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "No geocoding key configured" }, { status: 503 });

  const body = await req.json() as { addresses?: string[] };
  const addresses = body.addresses ?? [];
  if (!addresses.length) return NextResponse.json({ results: {} });

  const results: Record<string, { lat: number; lng: number }> = {};

  await Promise.all(
    addresses.map(async (address) => {
      try {
        const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(address + ", Toronto, ON, Canada")}&key=${key}`;
        const res = await fetch(url);
        const data = await res.json() as {
          status: string;
          results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
        };
        if (data.status === "OK" && data.results[0]) {
          results[address] = data.results[0].geometry.location;
        }
      } catch {
        // fall through — caller uses approximate coords as fallback
      }
    })
  );

  return NextResponse.json({ results });
}
