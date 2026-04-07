/**
 * POST /api/maps/area-analysis — Stats for a drawn polygon on the map.
 * Given a GeoJSON polygon, returns contact counts, support breakdown, doors knocked, etc.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "analytics:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const { bounds } = await req.json();
  if (!bounds || !bounds.south || !bounds.north || !bounds.west || !bounds.east) {
    return NextResponse.json({ error: "bounds (south, north, west, east) required" }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      household: {
        lat: { gte: bounds.south, lte: bounds.north },
        lng: { gte: bounds.west, lte: bounds.east },
      },
    },
    select: { supportLevel: true, phone: true, email: true },
  });

  const total = contacts.length;
  const supportBreakdown: Record<string, number> = {};
  let withPhone = 0;
  let withEmail = 0;

  for (const c of contacts) {
    const level = c.supportLevel ?? "unknown";
    supportBreakdown[level] = (supportBreakdown[level] ?? 0) + 1;
    if (c.phone) withPhone++;
    if (c.email) withEmail++;
  }

  const supporters = (supportBreakdown["strong_support"] ?? 0) + (supportBreakdown["leaning_support"] ?? 0);
  const supportRate = total > 0 ? Math.round((supporters / total) * 100) : 0;

  const interactions = await prisma.interaction.count({
    where: { contact: { campaignId, household: { lat: { gte: bounds.south, lte: bounds.north }, lng: { gte: bounds.west, lte: bounds.east } } } },
  });

  const signs = await prisma.sign.count({
    where: { campaignId, lat: { gte: bounds.south, lte: bounds.north }, lng: { gte: bounds.west, lte: bounds.east } },
  });

  return NextResponse.json({
    total,
    supportBreakdown,
    supporters,
    supportRate,
    withPhone,
    withEmail,
    doorsKnocked: interactions,
    signsInArea: signs,
  });
}
