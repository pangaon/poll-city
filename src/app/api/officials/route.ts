import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { GovernmentLevel } from "@prisma/client";

const LIST_SELECT = {
  id: true,
  name: true,
  title: true,
  district: true,
  level: true,
  party: true,
  bio: true,
  subscriptionStatus: true,
  isActive: true,
  _count: { select: { follows: true } },
} as const;

const VALID_LEVELS = new Set(["municipal", "provincial", "federal"]);
const POSTAL_CODE_PREFIX_REGEX = /^[A-Z0-9]{3}$/;

export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const sp = req.nextUrl.searchParams;
  const postalCode = sp.get("postalCode");
  const level = sp.get("level");
  const search = sp.get("search");

  if (level && !VALID_LEVELS.has(level)) {
    return NextResponse.json({ error: "Invalid level" }, { status: 422 });
  }

  if (postalCode) {
    const normalized = postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const prefix = normalized.slice(0, 3);
    if (!POSTAL_CODE_PREFIX_REGEX.test(prefix)) {
      return NextResponse.json({ error: "postalCode must contain a valid 3 character prefix" }, { status: 422 });
    }

    const officials = await prisma.official.findMany({
      where: {
        isActive: true,
        postalCodes: { has: prefix },
        ...(level && { level: level as GovernmentLevel }),
      },
      orderBy: { level: "asc" },
      take: 10,
      select: LIST_SELECT,
    });
    return NextResponse.json({ data: officials, postalPrefix: prefix });
  }

  if (search) {
    const trimmed = search.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      return NextResponse.json({ error: "Search must be between 1 and 100 characters" }, { status: 422 });
    }

    const officials = await prisma.official.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { district: { contains: trimmed, mode: "insensitive" } },
          { title: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: LIST_SELECT,
    });
    return NextResponse.json({ data: officials });
  }

  const officials = await prisma.official.findMany({
    where: { isActive: true },
    orderBy: [{ subscriptionStatus: "desc" }, { name: "asc" }],
    take: 50,
    select: LIST_SELECT,
  });
  return NextResponse.json({ data: officials });
}
