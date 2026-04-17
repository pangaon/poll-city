import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { verifyTotp } from "@/lib/auth/totp";
import bcrypt from "bcryptjs";

/** POST — verify password + TOTP token, then disable 2FA. */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const body = await req.json() as { password?: string; token?: string };
  const password = String(body.password ?? "").trim();
  const token = String(body.token ?? "").trim();

  if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  if (!/^\d{6}$/.test(token)) return NextResponse.json({ error: "Token must be 6 digits" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.twoFactorEnabled) return NextResponse.json({ error: "2FA is not enabled" }, { status: 409 });

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    await prisma.securityEvent.create({ data: { userId, type: "2fa_disabled", success: false } });
    return NextResponse.json({ error: "Incorrect password" }, { status: 422 });
  }

  if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, token)) {
    await prisma.securityEvent.create({ data: { userId, type: "2fa_disabled", success: false } });
    return NextResponse.json({ error: "Invalid code" }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorVerifiedAt: null,
      preferredMfaMethod: null,
    },
  });

  await prisma.securityEvent.create({ data: { userId, type: "2fa_disabled", success: true } });

  return NextResponse.json({ ok: true });
}
