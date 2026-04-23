import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import type { FeatureCollection, Feature, Point } from "geojson";

// Sign status → map color
const STATUS_COLOR: Record<string, string> = {
  requested:  "#EF9F27",
  approved:   "#6366F1",
  installed:  "#1D9E75",
  removed:    "#6B7280",
  declined:   "#E24B4A",
};

// Returns campaign signs (with lat/lng) as GeoJSON for the atlas overlay.
// 401 = silent no-op — anonymous users see base map only.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const wardName = searchParams.get("wardName") ?? undefined;

  const signs = await prisma.sign.findMany({
    where: {
      campaignId,
      deletedAt: null,
      lat: { not: null },
      lng: { not: null },
      ...(wardName
        ? {
            contact: {
              ward: { contains: wardName, mode: "insensitive" },
            },
          }
        : {}),
    },
    select: {
      id: true,
      address1: true,
      city: true,
      lat: true,
      lng: true,
      status: true,
      signType: true,
      isOpponent: true,
      quantity: true,
      installedAt: true,
      removedAt: true,
      notes: true,
    },
  });

  const features: Feature<Point>[] = signs
    .filter(s => s.lat != null && s.lng != null)
    .map(s => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [s.lng!, s.lat!],
      },
      properties: {
        id: s.id,
        address: s.address1,
        city: s.city ?? "",
        status: s.status,
        signType: s.signType,
        isOpponent: s.isOpponent,
        quantity: s.quantity,
        notes: s.notes ?? "",
        color: s.isOpponent ? "#E24B4A" : (STATUS_COLOR[s.status] ?? "#6366F1"),
        installedAt: s.installedAt?.toISOString() ?? null,
        removedAt: s.removedAt?.toISOString() ?? null,
      },
    }));

  const fc: FeatureCollection<Point> = { type: "FeatureCollection", features };

  const stats = {
    total: features.length,
    installed: features.filter(f => f.properties!.status === "installed").length,
    requested: features.filter(f => f.properties!.status === "requested").length,
    opponent: features.filter(f => f.properties!.isOpponent === true).length,
  };

  return NextResponse.json({ ...fc, stats });
}
