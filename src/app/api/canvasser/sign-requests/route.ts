import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { signService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  contactId: z.string().optional(),
  address: z.string().min(1),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  signType: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "signs:write");
  if (error || !ctx) return error;

  try {
    const data = await signService.createSignRequest(ctx.userId, ctx.campaignId, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign request failed";
    const status = message.includes("DUPLICATE") ? 409 : message.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
