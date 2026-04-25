import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { offlineSyncService } from "@/lib/canvasser/service";

const eventSchema = z.object({
  clientEventId: z.string().min(1),
  entityType: z.string().min(1),
  actionType: z.string().min(1),
  payload: z.record(z.unknown()),
  createdAt: z.string().optional(),
  localVersion: z.number().int().optional(),
});

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  deviceId: z.string().min(1),
  lastSyncAt: z.string().optional(),
  events: z.array(eventSchema).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "canvassing:write");
  if (error || !ctx) return error;

  const data = await offlineSyncService.processOfflineSyncBatch(ctx.userId, ctx.campaignId, parsed.data);
  return NextResponse.json(data);
}
