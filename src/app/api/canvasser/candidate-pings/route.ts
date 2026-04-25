import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { candidatePingService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  stopId: z.string().optional(),
  contactId: z.string().optional(),
  candidateId: z.string().optional(),
  priority: z.string().optional(),
  safeNote: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  const data = await candidatePingService.createCandidatePing(ctx.userId, ctx.campaignId, parsed.data);
  return NextResponse.json({ data }, { status: 201 });
}
