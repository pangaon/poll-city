/**
 * GET /api/analytics/supporters — Support level trends and geographic distribution.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "analytics:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  // Support by ward
  const wardBreakdown = await prisma.contact.groupBy({
    by: ["ward", "supportLevel"],
    where: { campaignId, ward: { not: null } },
    _count: true,
  });

  const wards: Record<string, Record<string, number>> = {};
  for (const row of wardBreakdown) {
    const ward = row.ward ?? "Unknown";
    if (!wards[ward]) wards[ward] = {};
    wards[ward][row.supportLevel] = row._count;
  }

  // Support by poll
  const pollBreakdown = await prisma.contact.groupBy({
    by: ["municipalPoll", "supportLevel"],
    where: { campaignId, municipalPoll: { not: null } },
    _count: true,
    orderBy: { municipalPoll: "asc" },
  });

  const polls: Record<string, Record<string, number>> = {};
  for (const row of pollBreakdown) {
    const poll = row.municipalPoll ?? "Unknown";
    if (!polls[poll]) polls[poll] = {};
    polls[poll][row.supportLevel] = row._count;
  }

  // Conversion funnel: unknown -> undecided -> leaning -> supporter
  const funnel = await prisma.contact.groupBy({
    by: ["supportLevel"],
    where: { campaignId },
    _count: true,
  });

  return NextResponse.json({
    byWard: wards,
    byPoll: polls,
    funnel: funnel.map((f) => ({ level: f.supportLevel, count: f._count })),
  });
}
