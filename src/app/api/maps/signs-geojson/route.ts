import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "signs:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const signs = await prisma.sign.findMany({
    where: { campaignId, deletedAt: null, lat: { not: null }, lng: { not: null } },
    select: {
      id: true,
      address1: true,
      city: true,
      postalCode: true,
      status: true,
      lat: true,
      lng: true,
      requestedAt: true,
      installedAt: true,
    },
  });

  return NextResponse.json({
    type: "FeatureCollection",
    features: signs.map((sign) => ({
      type: "Feature",
      properties: {
        id: sign.id,
        status: sign.status,
        address: sign.address1,
        city: sign.city,
        postalCode: sign.postalCode,
        requestedAt: sign.requestedAt,
        installedAt: sign.installedAt,
      },
      geometry: {
        type: "Point",
        coordinates: [sign.lng, sign.lat],
      },
    })),
  });
}
