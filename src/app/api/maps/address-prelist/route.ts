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

  let addresses: Array<{ id: string; civicNum: number; street: string; lat: number; lng: number; postalCode: string; households: number; source: string }> = [];
  try {
    addresses = await prisma.addressPreList.findMany({
      where: { campaignId },
      select: { id: true, civicNum: true, street: true, lat: true, lng: true, postalCode: true, households: true, source: true },
      take: 20000,
    });
  } catch {
    // Table may not exist in prod yet
  }

  return NextResponse.json({
    type: "FeatureCollection",
    features: addresses
      .filter((a) => a.lat !== 0 && a.lng !== 0)
      .map((a) => ({
        type: "Feature",
        properties: {
          id: a.id,
          address: `${a.civicNum} ${a.street}`,
          postalCode: a.postalCode,
          households: a.households,
          source: a.source,
        },
        geometry: { type: "Point", coordinates: [a.lng, a.lat] },
      })),
  });
}
