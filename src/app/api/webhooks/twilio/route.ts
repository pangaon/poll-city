import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/twilio
 * Handles inbound SMS from Twilio: STOP/UNSUBSCRIBE opt-out, START opt-in.
 *
 * Configure in Twilio Console → Phone Numbers → your number → Messaging →
 *   "A message comes in" → Webhook → https://app.poll.city/api/webhooks/twilio
 *
 * Twilio signature validation uses HMAC-SHA1 over the full webhook URL +
 * sorted POST parameters using the account auth token.
 *
 * CASL / TCPA compliance:
 *   STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT → smsOptOut = true for all matching contacts
 *   START/UNSTOP/YES → smsOptOut = false (re-subscribe)
 */

const OPT_OUT_KEYWORDS = new Set([
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
]);
const OPT_IN_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

/** Return a TwiML response with an SMS reply. */
function twiml(message: string): NextResponse {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message>`,
    "</Response>",
  ].join("\n");
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Return an empty TwiML response (no reply SMS sent). */
function twimlSilent(): NextResponse {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } },
  );
}

/**
 * Validates Twilio's HMAC-SHA1 request signature.
 * Twilio spec: HMAC-SHA1( authToken, url + sorted(key+value pairs) )
 */
function validateSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  const payload = url + sortedKeys.map((k) => `${k}${params[k]}`).join("");
  const expected = createHmac("sha1", authToken).update(payload).digest("base64");
  // Constant-time compare to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // ── Signature validation ─────────────────────────────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    // Reconstruct the full URL Twilio signed — use the forwarded proto/host if behind a proxy
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "app.poll.city";
    const url = `${proto}://${host}/api/webhooks/twilio`;

    if (!signature || !validateSignature(authToken, url, params, signature)) {
      console.warn("[webhooks/twilio] Signature validation failed — rejecting request");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // ── Parse inbound message ────────────────────────────────────────────────
  const from = (params.From ?? "").trim();
  const body = (params.Body ?? "").trim().toUpperCase().split(/\s+/)[0]; // first word only

  if (!from) return twimlSilent();

  const isOptOut = OPT_OUT_KEYWORDS.has(body);
  const isOptIn = OPT_IN_KEYWORDS.has(body);

  if (!isOptOut && !isOptIn) {
    // Non-keyword inbound SMS — acknowledge silently.
    // Unrecognized messages should not trigger any state change.
    return twimlSilent();
  }

  // Normalise phone for lookup — try both with and without + prefix to handle
  // format inconsistencies in imported voter files.
  const withPlus = from.startsWith("+") ? from : `+${from}`;
  const withoutPlus = from.startsWith("+") ? from.slice(1) : from;

  try {
    if (isOptOut) {
      // Set smsOptOut = true for every contact sharing this phone across all campaigns.
      // We do NOT set doNotContact=true — STOP is SMS-channel specific.
      // Campaign managers retain the ability to door-knock or phone-call these contacts.
      await prisma.contact.updateMany({
        where: {
          OR: [
            { phone: withPlus },
            { phone: withoutPlus },
            { phone2: withPlus },
            { phone2: withoutPlus },
          ],
          deletedAt: null,
          smsOptOut: false, // only update if not already opted out (prevents redundant writes)
        },
        data: { smsOptOut: true },
      });

      console.info(`[webhooks/twilio] STOP received from ${from} — smsOptOut set`);

      // CASL requires a confirmation reply for opt-out keywords.
      return twiml(
        "You have been unsubscribed from all campaign SMS messages. " +
        "No further messages will be sent to this number. " +
        "Reply START to re-subscribe at any time.",
      );
    }

    // isOptIn
    await prisma.contact.updateMany({
      where: {
        OR: [
          { phone: withPlus },
          { phone: withoutPlus },
          { phone2: withPlus },
          { phone2: withoutPlus },
        ],
        deletedAt: null,
        smsOptOut: true,
      },
      data: { smsOptOut: false },
    });

    console.info(`[webhooks/twilio] START received from ${from} — smsOptOut cleared`);

    return twiml(
      "You have re-subscribed to campaign messages. " +
      "Reply STOP at any time to unsubscribe again.",
    );
  } catch (err) {
    console.error("[webhooks/twilio] DB update failed:", err);
    // Never block the TwiML response — Twilio will retry on non-2xx responses.
  }

  return twimlSilent();
}
