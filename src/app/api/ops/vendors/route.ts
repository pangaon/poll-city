import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const verified = sp.get("verified"); // "true" | "false" | null
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 25;

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { contactName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(verified === "true" ? { isVerified: true } : {}),
    ...(verified === "false" ? { isVerified: false } : {}),
  };

  const [shops, total] = await Promise.all([
    prisma.printShop.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { bids: true } },
      },
    }),
    prisma.printShop.count({ where }),
  ]);

  // Attach won-bid counts
  const shopIds = shops.map((s) => s.id);
  const wonCounts = await prisma.printBid.groupBy({
    by: ["shopId"],
    where: { shopId: { in: shopIds }, isAccepted: true },
    _count: { id: true },
  });
  const wonMap = Object.fromEntries(wonCounts.map((r) => [r.shopId, r._count.id]));

  const data = shops.map((s) => ({
    ...s,
    jobsWon: wonMap[s.id] ?? 0,
  }));

  return NextResponse.json({ data, total, page, pageSize });
}
