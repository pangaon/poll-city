import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stopId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const stop = await prisma.turfStop.findUnique({
    where: { id: params.stopId },
    include: { turf: true },
  });

  if (!stop || stop.turfId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, stop.turf.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  let body: { visited: boolean; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updated = await prisma.turfStop.update({
    where: { id: params.stopId },
    data: {
      visited: body.visited,
      visitedAt: body.visited ? new Date() : null,
      notes: body.notes ?? stop.notes,
    },
  });

  // Recount completed stops on the turf
  const completedCount = await prisma.turfStop.count({
    where: { turfId: params.id, visited: true },
  });
  const totalCount = await prisma.turfStop.count({ where: { turfId: params.id } });

  const newStatus =
    completedCount === 0
      ? stop.turf.assignedUserId
        ? "assigned"
        : "draft"
      : completedCount >= totalCount
      ? "completed"
      : "in_progress";

  await prisma.turf.update({
    where: { id: params.id },
    data: {
      completedStops: completedCount,
      status: newStatus as "assigned" | "draft" | "in_progress" | "completed",
    },
  });

  return NextResponse.json({ data: updated, completedStops: completedCount, totalStops: totalCount });
}
