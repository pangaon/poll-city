import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const googleEnabled   = Boolean(process.env.GOOGLE_CLIENT_ID    && process.env.GOOGLE_CLIENT_SECRET);
  const appleEnabled    = Boolean(process.env.APPLE_CLIENT_ID     && process.env.APPLE_CLIENT_SECRET);
  const facebookEnabled = Boolean(process.env.FACEBOOK_CLIENT_ID  && process.env.FACEBOOK_CLIENT_SECRET);
  const twitterEnabled  = Boolean(process.env.TWITTER_CLIENT_ID   && process.env.TWITTER_CLIENT_SECRET);

  return NextResponse.json({
    data: { googleEnabled, appleEnabled, facebookEnabled, twitterEnabled },
  }, { headers: NO_STORE_HEADERS });
}