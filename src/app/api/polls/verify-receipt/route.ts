import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { createHash } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;

  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code || code.length < 8) {
    return NextResponse.json({ error: "Receipt code required" }, { status: 400 });
  }

  const receiptHash = createHash("sha256").update(`receipt:${code}`).digest("hex");

  const response = await prisma.pollResponse.findFirst({
    where: { receiptHash },
    select: { id: true, createdAt: true, pollId: true },
  });

  if (response) {
    return NextResponse.json({
      found: true,
      votedAt: response.createdAt,
      pollId: response.pollId,
    });
  }

  return NextResponse.json({ found: false });
}
