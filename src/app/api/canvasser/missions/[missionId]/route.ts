/**
 * GET /api/canvasser/missions/[missionId]?campaignId=X
 * Returns a single mission (turf) with stop count breakdown.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { missionId: string } },
) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true, role: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const turf = await prisma.turf.findFirst({
    where: { id: params.missionId, campaignId },
    select: {
      id: true,
      name: true,
      status: true,
      totalDoors: true,
      doorsKnocked: true,
      completionPercent: true,
      ward: true,
      streets: true,
      estimatedMinutes: true,
      notes: true,
      assignedUserId: true,
      assignedVolunteerId: true,
      _count: { select: { stops: true } },
    },
  });

  if (!turf) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const visitedCount = await prisma.turfStop.count({
    where: { turfId: params.missionId, visited: true },
  });

  return NextResponse.json({
    data: {
      id: turf.id,
      name: turf.name,
      type: "canvass" as const,
      status: turf.status,
      totalStops: turf._count.stops,
      visitedStops: visitedCount,
      pendingStops: turf._count.stops - visitedCount,
      completionPercent: turf.completionPercent,
      ward: turf.ward,
      streets: turf.streets,
      estimatedMinutes: turf.estimatedMinutes,
      notes: turf.notes,
    },
  });
}
