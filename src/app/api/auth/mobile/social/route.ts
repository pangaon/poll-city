/**
 * POST /api/auth/mobile/social
 * Mobile social sign-in — verifies Apple or Google identity tokens,
 * finds or creates the user, returns mobile Bearer tokens.
 *
 * Apple: verifies JWT against Apple's JWKS, links by appleUserId for
 *        returning users (email only present on first sign-in).
 * Google: verifies idToken via Google tokeninfo endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { signMobileToken, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../token/route";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  provider: z.enum(["apple", "google"]),
  idToken: z.string().min(10),
  // Apple provides these only on first sign-in
  appleUserId: z.string().optional(),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Apple JWT verification
// ---------------------------------------------------------------------------

const APPLE_JWKS = jose.createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

const APPLE_BUNDLE_ID = "ca.pollcity.canvasser";

interface AppleClaims extends jose.JWTPayload {
  email?: string;
  email_verified?: boolean | string;
}

async function verifyAppleToken(
  idToken: string,
): Promise<{ userId: string; email: string | null }> {
  const { payload } = await jose.jwtVerify(idToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: APPLE_BUNDLE_ID,
  });
  const claims = payload as AppleClaims;

  const userId = claims.sub;
  if (!userId) throw new Error("Apple token missing sub");

  const email = claims.email ?? null;
  return { userId, email };
}

// ---------------------------------------------------------------------------
// Google token verification
// ---------------------------------------------------------------------------

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  aud: string;
  error_description?: string;
}

async function verifyGoogleToken(
  idToken: string,
): Promise<{ userId: string; email: string; name: string | null }> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw new Error("Google token verification failed");
  }
  const info = (await res.json()) as GoogleTokenInfo;

  if (info.error_description) {
    throw new Error(`Google token invalid: ${info.error_description}`);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID_IOS ?? process.env.GOOGLE_ID;
  if (googleClientId && info.aud !== googleClientId) {
    throw new Error("Google token audience mismatch");
  }

  if (!info.sub || !info.email) {
    throw new Error("Google token missing required claims");
  }

  return {
    userId: info.sub,
    email: info.email,
    name: info.name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Find or create user helper
// ---------------------------------------------------------------------------

async function findOrCreateUser(params: {
  email: string | null;
  name: string | null;
  appleUserId?: string;
}) {
  const { email, name, appleUserId } = params;

  // 1. Look up by Apple user ID if provided (handles returning users without email)
  if (appleUserId) {
    const byAppleId = await prisma.user.findUnique({
      where: { appleUserId },
      select: { id: true, email: true, name: true, role: true, activeCampaignId: true, isActive: true, sessionVersion: true },
    });
    if (byAppleId) {
      if (!byAppleId.isActive) throw new Error("account_inactive");
      await prisma.user.update({ where: { id: byAppleId.id }, data: { lastLoginAt: new Date() } });
      return byAppleId;
    }
  }

  // 2. Look up by email
  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, activeCampaignId: true, isActive: true, sessionVersion: true, appleUserId: true },
    });
    if (byEmail) {
      if (!byEmail.isActive) throw new Error("account_inactive");
      // Link Apple user ID on first successful sign-in if not yet linked
      const updates: Record<string, unknown> = { lastLoginAt: new Date() };
      if (appleUserId && !byEmail.appleUserId) updates.appleUserId = appleUserId;
      await prisma.user.update({ where: { id: byEmail.id }, data: updates });
      return byEmail;
    }
  }

  // 3. No email, no Apple ID match — can't create account without email
  if (!email) {
    throw new Error("no_email");
  }

  // 4. Create new user
  const newUser = await prisma.user.create({
    data: {
      email,
      name: name ?? email.split("@")[0],
      passwordHash: "",
      role: "VOLUNTEER",
      isActive: true,
      ...(appleUserId ? { appleUserId } : {}),
      lastLoginAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true, activeCampaignId: true, isActive: true, sessionVersion: true },
  });

  return newUser;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { provider, idToken, appleUserId, name, email } = parsed.data;

  try {
    let userInfo: { userId: string; email: string | null; name?: string | null };

    if (provider === "apple") {
      const verified = await verifyAppleToken(idToken);
      userInfo = {
        userId: verified.userId,
        // Client sends email/name on first sign-in (Apple only provides it once)
        email: email ?? verified.email,
        name: name ?? null,
      };
    } else {
      const verified = await verifyGoogleToken(idToken);
      userInfo = verified;
    }

    const user = await findOrCreateUser({
      email: userInfo.email,
      name: userInfo.name ?? null,
      appleUserId: provider === "apple" ? userInfo.userId : undefined,
    });

    const [accessToken, refreshToken] = await Promise.all([
      signMobileToken(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          activeCampaignId: user.activeCampaignId,
          sessionVersion: user.sessionVersion,
          type: "access",
        },
        ACCESS_TOKEN_TTL,
      ),
      signMobileToken(
        { sub: user.id, sessionVersion: user.sessionVersion, type: "refresh" },
        REFRESH_TOKEN_TTL,
      ),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        activeCampaignId: user.activeCampaignId,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + ACCESS_TOKEN_TTL * 1000,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    if (msg === "account_inactive") {
      return NextResponse.json({ error: "Account is inactive. Contact your campaign manager." }, { status: 403 });
    }
    if (msg === "no_email") {
      return NextResponse.json(
        { error: "Could not retrieve email from Apple. Please sign in again to grant email access.", code: "APPLE_NO_EMAIL" },
        { status: 400 },
      );
    }
    if (msg.includes("audience mismatch") || msg.includes("token invalid") || msg.includes("token missing")) {
      return NextResponse.json({ error: "Invalid identity token." }, { status: 401 });
    }

    console.error("[auth/mobile/social] verification error:", msg);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 401 });
  }
}
