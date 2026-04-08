import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ valid: false, email: null }, { headers: NO_STORE_HEADERS });
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const users = await prisma.$queryRaw<Array<{ email: string; passwordResetExpiry: Date | null }>>`
      SELECT "email", "passwordResetExpiry"
      FROM "users"
      WHERE "passwordResetToken" = ${tokenHash}
      LIMIT 1
    `;

    const user = users[0];

    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
      return NextResponse.json({ valid: false, email: null }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json({ valid: true, email: user.email }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[verify-reset-token]", error);
    return NextResponse.json({ valid: false, email: null }, { headers: NO_STORE_HEADERS });
  }
}
