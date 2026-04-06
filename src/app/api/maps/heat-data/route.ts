import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";
import { parseBbox, supportIntensity, canvassingIntensity, gotvIntensity } from "@/lib/maps/geo";
import { fetchContactGeoPoints } from "@/lib/maps/data";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const layer = (sp.get("layer") ?? "support").toLowerCase();
  const bbox = parseBbox(sp.get("bbox"));

  const { points } = await fetchContactGeoPoints({
    campaignId,
    bbox,
    take: 10000,
  });

  const data = points.map((point) => {
    let intensity = 0.2;
    if (layer === "canvassing") {
      intensity = canvassingIntensity(point.doorsKnocked);
    } else if (layer === "gotv") {
      intensity = gotvIntensity(point.gotvScore, point.voted);
    } else {
      intensity = supportIntensity(point.supportLevel);
    }

    return [point.lat, point.lng, Number(intensity.toFixed(3))];
  });

  return NextResponse.json({
    layer,
    count: data.length,
    data,
  });
}
