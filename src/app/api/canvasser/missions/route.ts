/**
 * GET /api/canvasser/missions?campaignId=X
 * Lists turfs assigned to the authenticated canvasser — presented as "missions".
 * Supports both NextAuth cookie sessions and mobile Bearer JWT tokens.
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

  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true, role: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isManager =
    isSuperAdmin ||
    ["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"].includes(membership?.role ?? "");

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
      assignedUserId: true,
      assignedVolunteerId: true,
    },
  });

  return NextResponse.json({
    data: turfs.map((t) => ({
      id: t.id,
      name: t.name,
      type: "canvass" as const,
      status: t.status,
      totalDoors: t.totalDoors,
      doorsKnocked: t.doorsKnocked,
      completionPercent: t.completionPercent,
      ward: t.ward,
      streets: t.streets,
      estimatedMinutes: t.estimatedMinutes,
      notes: t.notes,
      assignedToMe:
        t.assignedUserId === session!.user.id ||
        (membership !== null && t.assignedVolunteerId === membership?.id),
    })),
  });
}
