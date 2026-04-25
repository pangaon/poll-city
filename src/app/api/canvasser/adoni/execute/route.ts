import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { adoniFieldService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  transcriptId: z.string().min(1),
  approvedActionIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  try {
    const data = await adoniFieldService.executeConfirmedActions(
      ctx.userId,
      ctx.campaignId,
      parsed.data.transcriptId,
      parsed.data.approvedActionIds,
    );
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Adoni execution failed";
    return NextResponse.json({ error: message }, { status: message.includes("NOT_FOUND") ? 404 : 400 });
  }
}
