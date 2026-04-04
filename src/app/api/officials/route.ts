import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// Fields returned in list view — bio included for preview, heavy fields excluded
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const postalCode = sp.get("postalCode");
  const level = sp.get("level");
  const search = sp.get("search");

  // Postal code lookup: used by Social discover page to find local reps
  if (postalCode) {
    const prefix = postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
    const officials = await prisma.official.findMany({
      where: {
        isActive: true,
        postalCodes: { has: prefix },
        ...(level && { level: level as any }),
      },
      orderBy: { level: "asc" },
      take: 10, // max 10 officials per postal prefix — covers federal + provincial + municipal
      select: LIST_SELECT,
    });
    return NextResponse.json({ data: officials, postalPrefix: prefix });
  }

  // Search by name/district/title
  if (search) {
    const trimmed = search.trim().slice(0, 100); // cap search string length
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

  // Default: featured/verified officials — capped at 50
  const officials = await prisma.official.findMany({
    where: { isActive: true },
    orderBy: [{ subscriptionStatus: "desc" }, { name: "asc" }],
    take: 50,
    select: LIST_SELECT,
  });
  return NextResponse.json({ data: officials });
}
