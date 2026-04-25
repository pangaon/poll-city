import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { missionService } from "@/lib/canvasser/service";

const bodySchema = z.object({ campaignId: z.string().min(1).optional() });

export async function POST(req: NextRequest, { params }: { params: { missionId: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await missionService.completeMission(ctx.userId, ctx.membershipId, ctx.campaignId, params.missionId, ctx.role);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mission complete failed";
    const status = message.includes("FORBIDDEN") ? 403 : message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
