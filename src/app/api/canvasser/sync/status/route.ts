import { NextRequest, NextResponse } from "next/server";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { offlineSyncService } from "@/lib/canvasser/service";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  const { ctx, error } = await resolveCanvasserContext(req, campaignId, "canvassing:read");
  if (error || !ctx) return error;

  const data = await offlineSyncService.getSyncStatus(ctx.userId, ctx.campaignId, deviceId);
  return NextResponse.json({ data });
}
