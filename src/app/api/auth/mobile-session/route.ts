/**
 * GET /api/auth/mobile-session
 * Returns the current session user if authenticated via NextAuth cookie.
 * Used by the mobile WebView login flow to check if auth completed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as { invalidSession?: boolean }).invalidSession) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    activeCampaignId?: string | null;
  };

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? "VOLUNTEER",
      activeCampaignId: user.activeCampaignId ?? null,
    },
  });
}
