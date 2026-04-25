import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { voterService } from "@/lib/canvasser/service";

const bodySchema = z.object({ campaignId: z.string().min(1).optional(), outcome: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { personId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await voterService.updateVoterOutcome(ctx.userId, ctx.campaignId, params.personId, parsed.data.outcome);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voter outcome failed";
    return NextResponse.json({ error: message }, { status: message.includes("NOT_FOUND") ? 404 : 400 });
  }
}
