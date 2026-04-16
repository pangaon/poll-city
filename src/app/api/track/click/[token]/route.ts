/**
 * GET /api/track/click/[token]
 *
 * Email click-tracking redirect. Records the click and immediately 307-redirects
 * to the destination URL encoded in the token.
 *
 * On each hit:
 *   - Creates an EmailTrackingEvent record (clicks are not deduped)
 *   - Increments NotificationLog.clickCount by 1
 *
 * If the token is invalid or the destination URL is not an absolute http/https URL,
 * redirects to the campaign website or poll.city as a safe fallback.
 *
 * No authentication required — email client links cannot carry auth headers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/db/prisma";
import { decodeTrackingToken } from "@/lib/email/tracking-token";

const FALLBACK_URL = process.env.NEXTAUTH_URL ?? "https://poll.city";

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const payload = decodeTrackingToken(params.token);

  if (!payload || payload.t !== "k" || !isSafeUrl(payload.u)) {
    return NextResponse.redirect(FALLBACK_URL, { status: 307 });
  }

  const { c: campaignId, b: notificationLogId, co: contactId, u: linkUrl } = payload;

  // Fire-and-forget — redirect must be instant.
  recordClick(campaignId, notificationLogId, contactId, linkUrl, req).catch((e) =>
    console.error("[track/click] DB error:", e),
  );

  return NextResponse.redirect(linkUrl, { status: 307 });
}

async function recordClick(
  campaignId: string,
  notificationLogId: string,
  contactId: string,
  linkUrl: string,
  req: NextRequest,
): Promise<void> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  await prisma.$transaction([
    prisma.emailTrackingEvent.create({
      data: {
        campaignId,
        notificationLogId,
        contactId,
        eventType: "click",
        linkUrl,
        ipHash,
        userAgentSnip: ua,
      },
    }),
    prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { clickCount: { increment: 1 } },
    }),
  ]);
}
