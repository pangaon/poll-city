/**
 * POST /api/auth/mobile/refresh
 * Validates a refresh token and issues a new access + refresh token pair.
 * Called by the mobile app's getAccessToken() when the access token expires.
 */

import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import prisma from "@/lib/db/prisma";
import {
  JWT_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  signMobileToken,
} from "../token/route";

export async function POST(req: NextRequest) {
  let body: { refreshToken?: string };
  try {
    body = (await req.json()) as { refreshToken?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { refreshToken } = body;
  if (!refreshToken) {
    return NextResponse.json({ error: "refreshToken is required" }, { status: 400 });
  }

  let payload: jose.JWTPayload;
  try {
    const { payload: p } = await jose.jwtVerify(refreshToken, JWT_SECRET);
    payload = p;
  } catch {
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }

  if (payload.type !== "refresh" || typeof payload.sub !== "string") {
    return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      activeCampaignId: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
  }

  // Validate session version hasn't been invalidated
  if (user.sessionVersion !== (payload.sessionVersion as number)) {
    return NextResponse.json({ error: "Session invalidated" }, { status: 401 });
  }

  const [newAccessToken, newRefreshToken] = await Promise.all([
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
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL * 1000,
    },
  });
}
