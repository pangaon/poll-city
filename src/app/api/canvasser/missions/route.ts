import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { missionService } from "@/lib/canvasser/service";

const querySchema = z.object({ campaignId: z.string().min(1).optional() });

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({ campaignId: req.nextUrl.searchParams.get("campaignId") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaignId" }, { status: 400 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:read");
  if (error || !ctx) return error;

  const data = await missionService.listAssignedMissions(ctx.userId, ctx.membershipId, ctx.campaignId, ctx.role);
  return NextResponse.json({ data });
}
