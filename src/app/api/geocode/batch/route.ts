/**
 * POST /api/geocode/batch — manually trigger geocoding for a campaign.
 * Campaign members can call this after import to geocode up to 500 households.
 * GET /api/geocode/batch — returns pending/geocoded counts for the campaign.
 *
 * Fix 8: After geocoding a household, assign it to the matching ward boundary
 * using a point-in-polygon check against WardBoundary.geojsonFeature.
 * Fix 9: 5-second timeout per Nominatim request; emit progress every 100 addresses.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { geocodeAddress, buildAddressString } from "@/lib/geocoding/geocoder";
import * as turf from "@turf/turf";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 500;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Fix 9: 5-second timeout per geocoding request — prevents Nominatim from hanging indefinitely
const GEOCODE_TIMEOUT_MS = 5000;

async function geocodeNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ca");

  // Fix 9: AbortController-based timeout — 5 seconds max per request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "PollCity/1.0 (campaign-platform)" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const results = await res.json() as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fix 8: Ward boundary cache — loaded once per batch request, not per household
interface WardBoundaryRecord {
  wardName: string;
  geojsonFeature: unknown;
}

/**
 * Find the ward name for a geocoded point by testing it against all ward boundaries
 * for the campaign's municipality. Returns null if no match found or no boundaries exist.
 */
function findWardForPoint(
  lat: number,
  lng: number,
  wardBoundaries: WardBoundaryRecord[]
): string | null {
  if (wardBoundaries.length === 0) return null;
  for (const boundary of wardBoundaries) {
    try {
      const feature = boundary.geojsonFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
      if (turf.booleanPointInPolygon(turf.point([lng, lat]), feature)) {
        return boundary.wardName;
      }
    } catch {
      // Malformed geometry — skip this boundary silently
    }
  }
  return null;
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

// Fix 9: update progress in ImportLog every PROGRESS_INTERVAL geocoding steps
const PROGRESS_INTERVAL = 100;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { campaignId?: string; importLogId?: string } = {};
  try { body = await req.json() as { campaignId?: string; importLogId?: string }; } catch { /* empty body ok */ }

  const campaignId = body.campaignId;
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const hasAccess = await verifyCampaignAccess(session!.user.id, campaignId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const importLogId = body.importLogId ?? null;

  // Fix 8: load ward boundaries for this campaign's municipality once, not per household
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { jurisdiction: true },
  });
  const wardBoundaries: WardBoundaryRecord[] = campaign?.jurisdiction
    ? await prisma.wardBoundary.findMany({
        where: { municipality: campaign.jurisdiction },
        select: { wardName: true, geojsonFeature: true },
      })
    : [];

  const households = await prisma.household.findMany({
    where: { campaignId, lat: null },
    select: { id: true, address1: true, city: true, province: true, postalCode: true },
    take: BATCH_SIZE,
  });

  // Fix 9: get total pending count upfront for progress reporting
  const totalPending = await prisma.household.count({ where: { campaignId, lat: null } });

  let geocoded = 0;
  let failed = 0;
  let processedCount = 0;

  for (const household of households) {
    const address = buildAddressString(household);
    if (!address.trim()) { processedCount++; continue; }

    try {
      let result: { lat: number; lng: number } | null = null;

      if (apiKey) {
        result = await geocodeAddress(address, apiKey);
      } else {
        result = await geocodeNominatim(address);
        await sleep(1100);
      }

      if (result) {
        // Fix 8: assign ward from boundary lookup after geocoding
        const wardName = findWardForPoint(result.lat, result.lng, wardBoundaries);
        await prisma.household.update({
          where: { id: household.id },
          data: {
            lat: result.lat,
            lng: result.lng,
            ...(wardName ? { ward: wardName } : {}),
          },
        });
        // Fix 8: also update the ward on all contacts linked to this household
        if (wardName) {
          await prisma.contact.updateMany({
            where: { householdId: household.id, campaignId },
            data: { ward: wardName },
          });
        }
        geocoded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    processedCount++;

    // Fix 9: emit progress to ImportLog every PROGRESS_INTERVAL addresses
    if (importLogId && processedCount % PROGRESS_INTERVAL === 0) {
      await prisma.importLog.update({
        where: { id: importLogId },
        data: {
          warnings: {
            geocodingProgress: processedCount,
            geocodingTotal: totalPending,
          } as object,
        },
      }).catch(() => { /* non-blocking — never fail geocoding because of a progress update */ });
    }
  }

  const [totalCount, geocodedCount] = await Promise.all([
    prisma.household.count({ where: { campaignId } }),
    prisma.household.count({ where: { campaignId, lat: { not: null } } }),
  ]);

  // Fix 9: final progress update on ImportLog if linked
  if (importLogId) {
    await prisma.importLog.update({
      where: { id: importLogId },
      data: {
        warnings: {
          geocodingProgress: processedCount,
          geocodingTotal: totalPending,
          geocodingComplete: true,
          geocodingFailed: failed,
        } as object,
      },
    }).catch(() => { /* non-blocking */ });
  }

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
