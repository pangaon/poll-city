import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { generateTotpSecret, totpUri, verifyTotp, generateBackupCodes } from "@/lib/auth/totp";
import QRCode from "qrcode";

/** GET — generate a new TOTP secret and QR code. Secret is saved on the user (pending verification). */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const secret = generateTotpSecret();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Temporarily store the secret so POST /verify can confirm it
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  const uri = totpUri(secret, user.email);
  const qr = await QRCode.toDataURL(uri, { width: 256, margin: 1 });

  return NextResponse.json({ secret, qr });
}

/** POST — verify the TOTP token against the pending secret, then enable 2FA. */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const body = await req.json() as { token?: string };
  const token = String(body.token ?? "").trim();
  if (!/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "Token must be 6 digits" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Start setup first" }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 409 });
  }

  if (!verifyTotp(user.twoFactorSecret, token)) {
    return NextResponse.json({ error: "Invalid code — check your authenticator app" }, { status: 422 });
  }

  const backupCodes = generateBackupCodes(10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
      twoFactorBackupCodes: backupCodes,
      preferredMfaMethod: "totp",
    },
  });

  await prisma.securityEvent.create({
    data: { userId, type: "2fa_setup", success: true },
  });

  return NextResponse.json({ backupCodes });
}
