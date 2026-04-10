import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import {
  nearestNeighbor,
  routeDistanceMetres,
  estimateWalkMinutes,
} from "@/lib/route-optimization";

type Params = { params: Promise<{ turfId: string }> };

// ── POST /api/field/turf/[turfId]/optimize ────────────────────────────────────
// Runs nearest-neighbor TSP on the turf's stops, reorders them in DB,
// and returns distance/time estimates.

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { turfId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const turf = await prisma.turf.findFirst({
    where: { id: turfId, campaignId },
    include: {
      stops: {
        include: {
          contact: {
            select: {
              id: true,
              householdId: true,
              address1: true,
              household: { select: { lat: true, lng: true } },
            },
          },
        },
      },
    },
  });

  if (!turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  if (turf.stops.length === 0) {
    return NextResponse.json({ error: "Turf has no stops to optimize" }, { status: 400 });
  }

  // Build geocoded stops — use household lat/lng
  const geocodedStops = turf.stops
    .map((stop) => ({
      stopId: stop.id,
      lat: stop.contact.household?.lat ?? null,
      lng: stop.contact.household?.lng ?? null,
    }))
    .filter((s): s is { stopId: string; lat: number; lng: number } =>
      s.lat !== null && s.lng !== null,
    );

  // Stops without geo go at the end in original order
  const noGeoStopIds = turf.stops
    .filter((s) => !s.contact.household?.lat)
    .map((s) => s.id);

  if (geocodedStops.length === 0) {
    return NextResponse.json(
      { error: "No geocoded stops — add lat/lng to contacts before optimizing" },
      { status: 400 },
    );
  }

  // Run nearest-neighbor optimization
  const optimizedStopIds = nearestNeighbor(
    geocodedStops.map((s) => ({ id: s.stopId, lat: s.lat, lng: s.lng })),
  );

  const allOrderedStopIds = [...optimizedStopIds, ...noGeoStopIds];

  // Route stats
  const orderedGeoStops = optimizedStopIds
    .map((id) => geocodedStops.find((s) => s.stopId === id)!)
    .filter(Boolean);

  const distanceMetres = routeDistanceMetres(
    orderedGeoStops.map((s) => ({ id: s.stopId, lat: s.lat, lng: s.lng })),
  );
  const estimatedMinutes = estimateWalkMinutes(distanceMetres, turf.stops.length);

  // Update stop orders in DB
  await Promise.all(
    allOrderedStopIds.map((stopId, idx) =>
      prisma.turfStop.update({ where: { id: stopId }, data: { order: idx } }),
    ),
  );

  // Persist route stats on the turf record
  await prisma.turf.update({
    where: { id: turfId },
    data: {
      routeDistance: distanceMetres / 1000, // store in km
      estimatedMinutes,
    },
  });

  return NextResponse.json({
    data: {
      turfId,
      optimizedStopCount: optimizedStopIds.length,
      noGeoStopCount: noGeoStopIds.length,
      distanceMetres: Math.round(distanceMetres),
      distanceKm: Math.round((distanceMetres / 1000) * 10) / 10,
      estimatedMinutes,
    },
  });
}
