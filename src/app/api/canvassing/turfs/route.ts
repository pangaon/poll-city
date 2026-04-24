/**
 * GET /api/canvassing/turfs?campaignId=X
 * Returns the turfs assigned to the authenticated canvasser for a campaign.
 *
 * Supports both NextAuth cookie sessions (web) and mobile Bearer JWT tokens.
 * Used by the Poll City Canvasser mobile app.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  // Verify membership (SUPER_ADMIN bypasses — they can inspect any campaign)
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: {
          userId_campaignId: { userId: session!.user.id, campaignId },
        },
        select: { id: true, role: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Managers and admins see all turfs; volunteers only see their assigned turfs
  const isManager =
    isSuperAdmin ||
    ["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"].includes(
      membership?.role ?? "",
    );

  const turfs = await prisma.turf.findMany({
    where: {
      campaignId,
      ...(isManager
        ? {}
        : {
            OR: [
              { assignedUserId: session!.user.id },
              { assignedVolunteerId: membership?.id },
            ],
          }),
    },
    orderBy: { name: "asc" },
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
    },
  });

  return NextResponse.json({
    data: turfs.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      contactCount: t.totalDoors,
      completedCount: t.doorsKnocked,
      completionPercent: t.completionPercent,
      ward: t.ward,
      streets: t.streets,
      estimatedMinutes: t.estimatedMinutes,
      notes: t.notes,
    })),
  });
}
