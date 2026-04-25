import { NextRequest, NextResponse } from "next/server";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { doorService } from "@/lib/canvasser/service";

export async function GET(req: NextRequest, { params }: { params: { missionId: string } }) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { ctx, error } = await resolveCanvasserContext(req, campaignId, "canvassing:read");
  if (error || !ctx) return error;

  try {
    const data = await doorService.getCurrentStop(ctx.userId, ctx.membershipId, ctx.campaignId, params.missionId, ctx.role);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Current stop failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
