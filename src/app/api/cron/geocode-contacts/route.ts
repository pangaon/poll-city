/**
 * Cron: /api/cron/geocode-contacts — runs every hour.
 * Geocodes up to 500 households per run using Google Maps Geocoding API.
 * Falls back to Nominatim (1/sec) if GOOGLE_MAPS_API_KEY is not set.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { geocodeAddress, buildAddressString } from "@/lib/geocoding/geocoder";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 500;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function geocodeNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ca");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "PollCity/1.0 (campaign-platform)" },
  });
  if (!res.ok) return null;
  const results = await res.json() as Array<{ lat: string; lon: string }>;
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const households = await prisma.household.findMany({
    where: { lat: null },
    select: { id: true, address1: true, city: true, province: true, postalCode: true },
    take: BATCH_SIZE,
  });

  if (households.length === 0) {
    return NextResponse.json({ geocoded: 0, message: "No households need geocoding" });
  }

  let geocoded = 0;
  let failed = 0;

  for (const household of households) {
    const address = buildAddressString(household);
    if (!address.trim()) continue;

    try {
      let result: { lat: number; lng: number } | null = null;

      if (apiKey) {
        result = await geocodeAddress(address, apiKey);
      } else {
        result = await geocodeNominatim(address);
        await sleep(1100);
      }

      if (result) {
        await prisma.household.update({
          where: { id: household.id },
          data: { lat: result.lat, lng: result.lng },
        });
        geocoded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ geocoded, failed, total: households.length });
}
