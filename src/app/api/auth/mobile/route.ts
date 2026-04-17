/**
 * POST /api/auth/mobile
 * Authenticates a canvasser with email + password.
 * Returns a signed JWT access token (24h) and refresh token (30d).
 *
 * This is the mobile app's alternative to NextAuth's session cookies.
 * The tokens are stored in expo-secure-store and sent as Bearer headers.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "local-placeholder-do-not-use-in-production",
);

const ACCESS_TOKEN_TTL = 60 * 60 * 24; // 24 hours in seconds
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days

async function signToken(payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(JWT_SECRET);
}

/**
 * POST /api/auth/mobile
 * Body: { email: string; password: string }
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      activeCampaignId: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 401 },
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newAttempts, lockedUntil },
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    activeCampaignId: user.activeCampaignId,
    sessionVersion: user.sessionVersion,
    type: "access",
  };

  const refreshPayload = {
    sub: user.id,
    sessionVersion: user.sessionVersion,
    type: "refresh",
  };

  const [accessToken, refreshToken] = await Promise.all([
    signToken(tokenPayload, ACCESS_TOKEN_TTL),
    signToken(refreshPayload, REFRESH_TOKEN_TTL),
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
}
