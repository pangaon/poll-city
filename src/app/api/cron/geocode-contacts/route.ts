/**
 * Cron: /api/cron/geocode-contacts — runs every hour.
 * Geocodes up to 100 contacts per run using Nominatim (free, no API key).
 * Respects Nominatim rate limit: 1 request per second.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

const BATCH_SIZE = 100;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DELAY_MS = 1100; // slightly over 1s to respect rate limits

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Find households with an address but no lat/lng
  const contacts = await prisma.household.findMany({
    where: { lat: null },
    select: { id: true, address1: true, city: true, province: true, postalCode: true },
    take: BATCH_SIZE,
  });

  if (contacts.length === 0) {
    return NextResponse.json({ geocoded: 0, message: "No contacts need geocoding" });
  }

  let geocoded = 0;
  let failed = 0;

  for (const contact of contacts) {
    const parts = [contact.address1, contact.city, contact.province, contact.postalCode].filter(Boolean);
    const query = parts.join(", ");
    if (!query.trim()) continue;

    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "ca");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "PollCity/1.0 (campaign-platform)" },
      });

      if (res.ok) {
        const results = await res.json();
        if (results.length > 0) {
          const { lat, lon } = results[0];
          await prisma.household.update({
            where: { id: contact.id },
            data: { lat: parseFloat(lat), lng: parseFloat(lon) },
          });
          geocoded++;
        }
      }
    } catch {
      failed++;
    }

    await sleep(DELAY_MS);
  }

  return NextResponse.json({ geocoded, failed, total: contacts.length });
}
