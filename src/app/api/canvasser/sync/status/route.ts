/**
 * GET /api/canvasser/sync/status?campaignId=X
 * Returns a count of interactions and outcomes recorded by this user today.
 * Used by the mobile app to show the canvasser their day's progress.
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
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Interaction has no campaignId — filter via contact.campaignId join
  const [totalToday, supportersToday, signRequestsToday, volunteerLeadsToday] =
    await Promise.all([
      prisma.interaction.count({
        where: {
          userId: session!.user.id,
          type: "door_knock",
          createdAt: { gte: startOfDay },
          contact: { campaignId },
        },
      }),
      prisma.interaction.count({
        where: {
          userId: session!.user.id,
          type: "door_knock",
          supportLevel: { in: ["strong_support", "leaning_support"] },
          createdAt: { gte: startOfDay },
          contact: { campaignId },
        },
      }),
      prisma.signRequest.count({
        where: {
          campaignId,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.contact.count({
        where: {
          campaignId,
          volunteerInterest: true,
          lastContactedAt: { gte: startOfDay },
          deletedAt: null,
        },
      }),
    ]);

  return NextResponse.json({
    data: {
      date: startOfDay.toISOString().split("T")[0],
      doorsKnocked: totalToday,
      supportersFound: supportersToday,
      signRequests: signRequestsToday,
      volunteerLeads: volunteerLeadsToday,
      conversionRate:
        totalToday > 0 ? Math.round((supportersToday / totalToday) * 100) : 0,
    },
  });
}
