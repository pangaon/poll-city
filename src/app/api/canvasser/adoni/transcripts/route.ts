import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { adoniFieldService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  missionId: z.string().optional(),
  stopId: z.string().optional(),
  personId: z.string().optional(),
  mode: z.enum(["voice", "text"]).optional(),
  transcript: z.string().min(1).max(20000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  const data = await adoniFieldService.createTranscript(ctx.userId, ctx.campaignId, parsed.data);
  return NextResponse.json({ data }, { status: 201 });
}
