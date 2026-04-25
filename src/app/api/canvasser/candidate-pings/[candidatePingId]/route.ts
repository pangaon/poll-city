import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { candidatePingService } from "@/lib/canvasser/service";

const bodySchema = z.object({ campaignId: z.string().min(1).optional(), status: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: { candidatePingId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await candidatePingService.updateCandidatePingStatus(ctx.userId, ctx.campaignId, params.candidatePingId, parsed.data.status);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Candidate ping update failed";
    return NextResponse.json({ error: message }, { status: message.includes("NOT_FOUND") ? 404 : 400 });
  }
}
