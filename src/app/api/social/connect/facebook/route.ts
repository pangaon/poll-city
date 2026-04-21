import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { signOAuthState } from "@/lib/crypto/token";

const FB_APP_ID = process.env.FACEBOOK_CLIENT_ID ?? "";
const APP_BASE = process.env.NEXTAUTH_URL ?? "https://app.poll.city";
const CALLBACK_URI = `${APP_BASE}/api/social/connect/facebook/callback`;

const SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_show_list",
  "pages_manage_metadata",
].join(",");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  if (!FB_APP_ID) {
    return NextResponse.json(
      { error: "Facebook app not configured — add FACEBOOK_CLIENT_ID to Vercel env vars" },
      { status: 503 }
    );
  }

  const state = signOAuthState({ campaignId, userId: session.user.id });

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", FB_APP_ID);
  url.searchParams.set("redirect_uri", CALLBACK_URI);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
