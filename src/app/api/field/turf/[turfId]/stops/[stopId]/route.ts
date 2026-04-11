import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

type Params = { params: Promise<{ turfId: string; stopId: string }> };

// ── PATCH /api/field/turf/[turfId]/stops/[stopId] ───────────────────────────
// Mark a turf stop as visited or unvisited, then roll up completion stats.

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { turfId, stopId } = await params;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    visited?: boolean;
    notes?: string | null;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const turf = await prisma.turf.findFirst({
    where: { id: turfId, campaignId: body.campaignId },
    select: { id: true, totalStops: true },
  });
  if (!turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  const stop = await prisma.turfStop.findFirst({
    where: { id: stopId, turfId },
  });
  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedStop = await tx.turfStop.update({
      where: { id: stopId },
      data: {
        ...(body.visited !== undefined
          ? {
              visited: body.visited,
              visitedAt: body.visited ? new Date() : null,
            }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      },
    });

    // Recount all visited stops for this turf
    const completedCount = await tx.turfStop.count({
      where: { turfId, visited: true },
    });

    const completionPercent =
      turf.totalStops > 0 ? Math.round((completedCount / turf.totalStops) * 100) : 0;

    const updatedTurf = await tx.turf.update({
      where: { id: turfId },
      data: {
        completedStops: completedCount,
        doorsKnocked: completedCount,
        completionPercent,
      },
      select: {
        id: true,
        completedStops: true,
        doorsKnocked: true,
        completionPercent: true,
        totalStops: true,
      },
    });

    return { stop: updatedStop, turf: updatedTurf };
  });

  return NextResponse.json({ data: result });
}
