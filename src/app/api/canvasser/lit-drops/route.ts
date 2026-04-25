import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { litService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  missionId: z.string().optional(),
  stopId: z.string().optional(),
  contactId: z.string().optional(),
  litPieceId: z.string().optional(),
  scope: z.string().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  const data = await litService.logLitDrop(ctx.userId, ctx.campaignId, parsed.data);
  return NextResponse.json({ data }, { status: 201 });
}
