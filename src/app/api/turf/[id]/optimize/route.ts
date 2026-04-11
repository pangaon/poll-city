import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { nearestNeighbor, routeDistanceMetres, estimateWalkMinutes } from "@/lib/route-optimization";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const turf = await prisma.turf.findUnique({
    where: { id: params.id },
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

  if (!turf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, turf.campaignId, "canvassing:manage");
  if (forbidden) return forbidden;

  // Build geocoded stops — use household lat/lng when available
  const geocodedStops = turf.stops
    .map((stop) => ({
      stopId: stop.id,
      contactId: stop.contact.id,
      lat: stop.contact.household?.lat ?? null,
      lng: stop.contact.household?.lng ?? null,
    }))
    .filter((s) => s.lat !== null && s.lng !== null) as {
      stopId: string;
      contactId: string;
      lat: number;
      lng: number;
    }[];

  // Stops without geo go at the end in their original order
  const noGeoStopIds = turf.stops
    .filter((s) => !s.contact.household?.lat)
    .map((s) => s.id);

  // Run nearest-neighbor optimization
  const optimizedContactIds = nearestNeighbor(
    geocodedStops.map((s) => ({ id: s.stopId, lat: s.lat, lng: s.lng }))
  );

  const allOrderedStopIds = [...optimizedContactIds, ...noGeoStopIds];

  // Calculate route stats
  const orderedGeoStops = optimizedContactIds
    .map((id) => geocodedStops.find((s) => s.stopId === id)!)
    .filter(Boolean);

  const distanceMetres = routeDistanceMetres(
    orderedGeoStops.map((s) => ({ id: s.stopId, lat: s.lat, lng: s.lng }))
  );
  const estimatedMinutes = estimateWalkMinutes(distanceMetres, turf.stops.length);

  // Update stop orders in DB
  await Promise.all(
    allOrderedStopIds.map((stopId, idx) =>
      prisma.turfStop.update({ where: { id: stopId }, data: { order: idx } })
    )
  );

  return NextResponse.json({
    data: {
      turfId: turf.id,
      optimizedStopCount: optimizedContactIds.length,
      noGeoStopCount: noGeoStopIds.length,
      distanceMetres: Math.round(distanceMetres),
      estimatedMinutes,
    },
  });
}
