/**
 * POST /api/q/[token]/intent — record intent from the landing page
 * No authentication required. Rate limited.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { recordIntent } from "@/lib/qr/capture";
import type { QrIntent } from "@prisma/client";

const NO_STORE = { "Cache-Control": "no-store" };

const VALID_INTENTS: QrIntent[] = [
  "support",
  "keep_updated",
  "request_sign",
  "volunteer",
  "more_info",
  "concern",
  "live_nearby",
  "help_at_location",
  "interested_in_issue",
  "just_browsing",
  "attend_event",
  "donate",
];

const bodySchema = z.object({
  scanId: z.string().min(1),
  intent: z.enum(VALID_INTENTS as [QrIntent, ...QrIntent[]]),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  geoGranted: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params: _params }: { params: { token: string } },
) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: NO_STORE });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400, headers: NO_STORE });
  }

  const { scanId, intent, lat, lng, geoGranted } = parsed.data;

  await recordIntent({
    scanId,
    intent,
    lat: lat ?? null,
    lng: lng ?? null,
    geoGranted: geoGranted ?? false,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
