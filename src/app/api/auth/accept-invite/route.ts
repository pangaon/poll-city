import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validatePassword } from "@/lib/auth/password-policy";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// ── GET /api/auth/accept-invite?token=XXX ─────────────────────────────────────
// Validate token and return campaign/user info for the accept-invite page
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400, headers: NO_STORE });
  }

  const invite = await prisma.clientInviteToken.findUnique({
    where: { token },
    include: {
      campaign: { select: { id: true, name: true, candidateName: true, electionType: true } },
      user: { select: { id: true, email: true, name: true, lastLoginAt: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "invalid", message: "This invite link is not valid." }, { status: 404, headers: NO_STORE });
  }

  if (invite.status === "revoked") {
    return NextResponse.json({ error: "revoked", message: "This invite has been revoked. Contact Poll City to get a new link." }, { status: 410, headers: NO_STORE });
  }

  if (invite.status === "accepted" || invite.consumedAt) {
    return NextResponse.json({ error: "used", message: "This invite has already been used. Sign in to your account." }, { status: 409, headers: NO_STORE });
  }

  if (invite.expiresAt < new Date()) {
    // Mark expired in DB to avoid re-checking next time
    await prisma.clientInviteToken.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "expired", message: "This invite link has expired. Contact Poll City to send a new one." }, { status: 410, headers: NO_STORE });
  }

  return NextResponse.json({
    data: {
      email: invite.user.email,
      name: invite.user.name,
      isNewUser: invite.isNewUser,
      hasRealAccount: !!invite.user.lastLoginAt,
      campaign: invite.campaign,
    },
  }, { headers: NO_STORE });
}

// ── POST /api/auth/accept-invite ──────────────────────────────────────────────
// Accept the invite: set password (new users) and activate the account
const AcceptBody = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = AcceptBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422, headers: NO_STORE });
  }

  const { token, password } = parsed.data;

  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json(
      { error: "Password requirements not met", details: policy.errors },
      { status: 422, headers: NO_STORE }
    );
  }

  const invite = await prisma.clientInviteToken.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, email: true, activeCampaignId: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  if (!invite || invite.status === "revoked") {
    return NextResponse.json({ error: "invalid", message: "Invalid invite link." }, { status: 404, headers: NO_STORE });
  }

  if (invite.status === "accepted" || invite.consumedAt) {
    return NextResponse.json({ error: "used", message: "This invite has already been used." }, { status: 409, headers: NO_STORE });
  }

  if (invite.expiresAt < new Date()) {
    await prisma.clientInviteToken.update({ where: { id: invite.id }, data: { status: "expired" } });
    return NextResponse.json({ error: "expired", message: "This invite link has expired." }, { status: 410, headers: NO_STORE });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Atomic: set password + mark token consumed + set activeCampaignId
  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.user.id },
      data: {
        passwordHash,
        emailVerified: true,
        activeCampaignId: invite.campaign.id,
        lastLoginAt: new Date(), // so we know they've activated
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.clientInviteToken.update({
      where: { id: invite.id },
      data: { status: "accepted", consumedAt: new Date() },
    }),
  ]);

  await audit(prisma, "client.invite_accepted", {
    userId: invite.user.id,
    campaignId: invite.campaign.id,
    entityId: invite.user.id,
    entityType: "User",
    ip: req.headers.get("x-forwarded-for"),
    details: { email: invite.user.email, campaignName: invite.campaign.name },
  });

  // Return credentials so the client can sign in via NextAuth credentials provider
  return NextResponse.json({
    data: {
      email: invite.user.email,
      campaignId: invite.campaign.id,
    },
  }, { headers: NO_STORE });
}
