/**
 * GET  /api/q/[token] — get landing page context (no auth)
 * POST /api/q/[token] — record a scan event (no auth, rate limited)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getQrLandingContext } from "@/lib/qr/landing";
import { recordScan } from "@/lib/qr/capture";

const NO_STORE = { "Cache-Control": "no-store" };

const scanBodySchema = z.object({
  sessionToken: z.string().uuid().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const context = await getQrLandingContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(context, { headers: NO_STORE });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const limited = await rateLimit(req, "read"); // read tier: 100/min per IP
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const parsed = scanBodySchema.safeParse(body);
  const sessionToken = parsed.success ? (parsed.data.sessionToken ?? null) : null;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");

  const result = await recordScan({
    token: params.token,
    ip,
    userAgent,
    sessionToken,
    referrer,
  });

  if (!result) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(result, { headers: NO_STORE });
}
