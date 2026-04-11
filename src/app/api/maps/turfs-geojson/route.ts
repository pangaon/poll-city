import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const turfs = await prisma.turf.findMany({
    where: { campaignId },
    include: {
      assignedVolunteer: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      assignedUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const features = turfs
    .filter((turf) => Boolean(turf.boundary))
    .map((turf) => ({
      type: "Feature",
      properties: {
        id: turf.id,
        name: turf.name,
        status: turf.status,
        completionPercent: turf.completionPercent,
        assignedVolunteer:
          turf.assignedVolunteer?.user?.name ??
          turf.assignedUser?.name ??
          turf.assignedVolunteer?.user?.email ??
          turf.assignedUser?.email ??
          null,
        totalDoors: turf.totalDoors || turf.totalStops,
        doorsKnocked: turf.doorsKnocked || turf.completedStops,
        supporters: turf.supporters,
        undecided: turf.undecided,
      },
      geometry: turf.boundary,
    }));

  return NextResponse.json({
    type: "FeatureCollection",
    features,
    count: features.length,
  });
}
