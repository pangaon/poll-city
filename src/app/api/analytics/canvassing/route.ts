/**
 * GET /api/analytics/canvassing — Canvassing performance analytics.
 * Doors per day trend, volunteer performance, turf completion.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "analytics:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const days = Number(req.nextUrl.searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Daily door knock counts
  const interactions = await prisma.interaction.findMany({
    where: { contact: { campaignId }, createdAt: { gte: since } },
    select: { createdAt: true, userId: true },
  });

  const dailyCounts: Record<string, number> = {};
  const volunteerCounts: Record<string, number> = {};

  for (const i of interactions) {
    const day = i.createdAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
    if (i.userId) volunteerCounts[i.userId] = (volunteerCounts[i.userId] ?? 0) + 1;
  }

  // Top canvassers
  const userIds = Object.keys(volunteerCounts).slice(0, 20);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];

  const topCanvassers = users
    .map((u) => ({ name: u.name ?? "Unknown", doors: volunteerCounts[u.id] ?? 0 }))
    .sort((a, b) => b.doors - a.doors)
    .slice(0, 10);

  // Turf completion
  const turfs = await prisma.turf.findMany({
    where: { campaignId },
    select: { name: true, completionPercent: true },
    orderBy: { completionPercent: "desc" },
  });

  return NextResponse.json({
    dailyCounts: Object.entries(dailyCounts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    topCanvassers,
    turfCompletion: turfs,
    totalDoors: interactions.length,
    avgDoorsPerDay: Object.keys(dailyCounts).length > 0 ? Math.round(interactions.length / Object.keys(dailyCounts).length) : 0,
  });
}
