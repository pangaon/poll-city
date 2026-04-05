import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ valid: false, email: null });
  }

  try {
    const users = await prisma.$queryRaw<Array<{ email: string; passwordResetExpiry: Date | null }>>`
      SELECT "email", "passwordResetExpiry"
      FROM "users"
      WHERE "passwordResetToken" = ${token}
      LIMIT 1
    `;

    const user = users[0];

    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
      return NextResponse.json({ valid: false, email: null });
    }

    return NextResponse.json({ valid: true, email: user.email });
  } catch (error) {
    console.error("[verify-reset-token]", error);
    return NextResponse.json({ valid: false, email: null });
  }
}
