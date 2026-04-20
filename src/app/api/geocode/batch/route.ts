/**
 * POST /api/geocode/batch — manually trigger geocoding for a campaign.
 * Campaign members can call this after import to geocode up to 500 households.
 * GET /api/geocode/batch — returns pending/geocoded counts for the campaign.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
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

async function verifyCampaignAccess(userId: string, campaignId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { id: true },
  });
  return !!membership;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const hasAccess = await verifyCampaignAccess(session!.user.id, campaignId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [total, geocoded] = await Promise.all([
    prisma.household.count({ where: { campaignId } }),
    prisma.household.count({ where: { campaignId, lat: { not: null } } }),
  ]);

  return NextResponse.json({
    data: {
      total,
      geocoded,
      pending: total - geocoded,
      percentComplete: total > 0 ? Math.round((geocoded / total) * 100) : 100,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { campaignId?: string } = {};
  try { body = await req.json() as { campaignId?: string }; } catch { /* empty body ok */ }

  const campaignId = body.campaignId;
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const hasAccess = await verifyCampaignAccess(session!.user.id, campaignId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const households = await prisma.household.findMany({
    where: { campaignId, lat: null },
    select: { id: true, address1: true, city: true, province: true, postalCode: true },
    take: BATCH_SIZE,
  });

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

  const [totalCount, geocodedCount] = await Promise.all([
    prisma.household.count({ where: { campaignId } }),
    prisma.household.count({ where: { campaignId, lat: { not: null } } }),
  ]);

  return NextResponse.json({
    data: {
      geocoded,
      failed,
      processedThisBatch: households.length,
      total: totalCount,
      totalGeocoded: geocodedCount,
      pending: totalCount - geocodedCount,
      percentComplete: totalCount > 0 ? Math.round((geocodedCount / totalCount) * 100) : 100,
    },
  });
}
