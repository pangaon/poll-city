import { NextRequest, NextResponse } from "next/server";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { missionService } from "@/lib/canvasser/service";

export async function GET(req: NextRequest, { params }: { params: { missionId: string } }) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { ctx, error } = await resolveCanvasserContext(req, campaignId, "canvassing:read");
  if (error || !ctx) return error;

  try {
    const data = await missionService.getMissionDetail(ctx.userId, ctx.membershipId, ctx.campaignId, params.missionId, ctx.role);
    if (!data) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mission fetch failed";
    const status = message.includes("FORBIDDEN") ? 403 : message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
