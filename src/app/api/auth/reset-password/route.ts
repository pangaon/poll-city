import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validatePassword } from "@/lib/auth/password-policy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!token || !newPassword) {
      return NextResponse.json({ error: "token and newPassword are required" }, { status: 400 });
    }

    const policy = validatePassword(newPassword);
    if (!policy.valid) {
      return NextResponse.json({ error: "Password validation failed", details: policy.errors }, { status: 400 });
    }

    const users = await prisma.$queryRaw<Array<{ id: string; passwordResetExpiry: Date | null }>>`
      SELECT "id", "passwordResetExpiry"
      FROM "users"
      WHERE "passwordResetToken" = ${token}
      LIMIT 1
    `;

    const user = users[0];
    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token is invalid or expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$executeRaw`
      UPDATE "users"
      SET
        "passwordHash" = ${passwordHash},
        "passwordResetToken" = NULL,
        "passwordResetExpiry" = NULL,
        "failedLoginAttempts" = 0,
        "lockedUntil" = NULL
      WHERE "id" = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  }
}
