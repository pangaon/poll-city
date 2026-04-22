/**
 * GET /api/voice/phone-banking/token — Generate a Twilio Voice SDK access token.
 * Used by browser-based phone banking. Volunteer's personal number is never exposed.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "canvassing:write");
  if (error) return error;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return NextResponse.json({
      error: "Phone banking is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID.",
    }, { status: 503, headers: NO_STORE_HEADERS });
  }

  try {
    // Dynamic require — twilio may not be installed
    const twilio = require("twilio") as {
      jwt: {
        AccessToken: new (
          accountSid: string,
          apiKey: string,
          apiSecret: string,
          opts: { identity: string; ttl: number },
        ) => { addGrant: (grant: unknown) => void; toJwt: () => string };
      };
    };
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = (AccessToken as unknown as { VoiceGrant: new (opts: { outgoingApplicationSid: string; incomingAllow: boolean }) => unknown }).VoiceGrant;

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: session.user.id as string,
      ttl: 3600, // 1 hour
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    });

    token.addGrant(voiceGrant);

    return NextResponse.json({
      token: token.toJwt(),
      identity: session.user.id,
      expiresIn: 3600,
    }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error("[Phone Banking] Token generation failed:", e);
    return NextResponse.json({
      error: "Failed to generate voice token. Ensure twilio package is installed: npm install twilio",
    }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
