import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { voterService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  targetId: z.string().min(1),
  fieldId: z.string().min(1),
  valueText: z.string().optional(),
  valueBool: z.boolean().optional(),
  valueNum: z.number().optional(),
  valueDate: z.string().optional(),
  valueList: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await voterService.updateCustomField(ctx.userId, ctx.campaignId, parsed.data.targetId, parsed.data.fieldId, parsed.data);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Custom field update failed";
    return NextResponse.json({ error: message }, { status: message.includes("NOT_FOUND") ? 404 : 400 });
  }
}
