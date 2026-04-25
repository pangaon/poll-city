import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { doorService } from "@/lib/canvasser/service";

const bodySchema = z.object({ campaignId: z.string().min(1).optional(), reason: z.string().min(1).max(1000) });

export async function POST(req: NextRequest, { params }: { params: { stopId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await doorService.skipDoor({
      userId: ctx.userId,
      membershipId: ctx.membershipId,
      role: ctx.role,
      campaignId: ctx.campaignId,
      stopId: params.stopId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Door skip failed";
    const status = message.includes("NOT_FOUND") ? 404 : message.includes("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
