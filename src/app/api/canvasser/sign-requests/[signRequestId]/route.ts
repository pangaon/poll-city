import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { signService } from "@/lib/canvasser/service";

const bodySchema = z.object({ campaignId: z.string().min(1).optional(), status: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: { signRequestId: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "signs:write");
  if (error || !ctx) return error;

  try {
    const data = await signService.updateSignRequestStatus(ctx.userId, ctx.campaignId, params.signRequestId, parsed.data.status);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign status update failed";
    return NextResponse.json({ error: message }, { status: message.includes("NOT_FOUND") ? 404 : 400 });
  }
}
