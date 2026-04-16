/**
 * GET /api/track/open/[token]
 *
 * Email open-tracking pixel. Returns a 1×1 transparent GIF with no-cache
 * headers so mail clients fetch it fresh on each open.
 *
 * On first hit per (notificationLogId, contactId) pair:
 *   - Creates an EmailTrackingEvent record
 *   - Increments NotificationLog.openedCount by 1
 *
 * Subsequent hits from the same recipient are silently ignored (idempotent).
 * No authentication required — email clients cannot send auth headers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/db/prisma";
import { decodeTrackingToken } from "@/lib/email/tracking-token";

// 1×1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const PIXEL_HEADERS = {
  "Content-Type": "image/gif",
  "Content-Length": String(PIXEL.length),
  "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const payload = decodeTrackingToken(params.token);

  // Always return the pixel — never reveal a decode failure to the client.
  if (!payload || payload.t !== "o") {
    return new NextResponse(PIXEL, { headers: PIXEL_HEADERS });
  }

  const { c: campaignId, b: notificationLogId, co: contactId } = payload;

  // Fire-and-forget — never block the pixel response on DB latency.
  recordOpen(campaignId, notificationLogId, contactId, req).catch((e) =>
    console.error("[track/open] DB error:", e),
  );

  return new NextResponse(PIXEL, { headers: PIXEL_HEADERS });
}

async function recordOpen(
  campaignId: string,
  notificationLogId: string,
  contactId: string,
  req: NextRequest,
): Promise<void> {
  // Idempotent: only count one open per recipient per blast.
  const existing = await prisma.emailTrackingEvent.findFirst({
    where: { notificationLogId, contactId, eventType: "open" },
    select: { id: true },
  });
  if (existing) return;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  await prisma.$transaction([
    prisma.emailTrackingEvent.create({
      data: {
        campaignId,
        notificationLogId,
        contactId,
        eventType: "open",
        ipHash,
        userAgentSnip: ua,
      },
    }),
    prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { openedCount: { increment: 1 } },
    }),
  ]);
}
