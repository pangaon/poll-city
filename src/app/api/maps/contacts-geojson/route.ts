import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";
import { parseBbox, buildGeoJsonFeatureCollection } from "@/lib/maps/geo";
import { fetchContactGeoPoints } from "@/lib/maps/data";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const bbox = parseBbox(sp.get("bbox"));
  const take = Number(sp.get("take") ?? "5000");
  const cursor = sp.get("cursor") ?? undefined;

  const { points, hasMore, nextCursor } = await fetchContactGeoPoints({
    campaignId,
    bbox,
    take: Math.min(10000, Math.max(1, take)),
    cursor,
  });

  return NextResponse.json(
    {
      ...buildGeoJsonFeatureCollection(points),
      count: points.length,
      hasMore,
      nextCursor,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
