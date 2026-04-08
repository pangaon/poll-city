/**
 * POST /api/auth/mobile/token
 * Mobile JWT login — accepts email + password, returns access + refresh tokens.
 * This is the endpoint the mobile app's lib/api.ts calls on login.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "dev-secret-only-for-local-development",
);

export const ACCESS_TOKEN_TTL = 60 * 60 * 24; // 24h
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days

export async function signMobileToken(
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(JWT_SECRET);
}

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

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 401 },
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    const newAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newAttempts, lockedUntil },
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
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
}
