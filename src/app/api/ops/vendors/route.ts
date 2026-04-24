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
  const verified = sp.get("verified");
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 25;

  // ── Query 1: new Vendor records (VENDOR role) ──────────────────────────
  const vendorWhere = {
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

  const [vendors, vendorTotal] = await Promise.all([
    prisma.vendor.findMany({
      where: vendorWhere,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        printShop: {
          include: { _count: { select: { bids: true } } },
        },
      },
    }),
    prisma.vendor.count({ where: vendorWhere }),
  ]);

  // ── Query 2: legacy PrintShop records (PRINT_VENDOR role, no vendorId) ─
  const shopWhere = {
    vendorId: null,
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

  const [legacyShops, legacyTotal] = await Promise.all([
    prisma.printShop.findMany({
      where: shopWhere,
      orderBy: [{ createdAt: "desc" }],
      take: Math.max(0, pageSize - vendors.length),
      skip: Math.max(0, (page - 1) * pageSize - vendorTotal),
      include: { _count: { select: { bids: true } } },
    }),
    prisma.printShop.count({ where: shopWhere }),
  ]);

  const total = vendorTotal + legacyTotal;

  // Attach won-bid counts for legacy shops
  const shopIds = legacyShops.map((s) => s.id);
  const wonCounts = shopIds.length
    ? await prisma.printBid.groupBy({
        by: ["shopId"],
        where: { shopId: { in: shopIds }, isAccepted: true },
        _count: { id: true },
      })
    : [];
  const wonMap = Object.fromEntries(wonCounts.map((r) => [r.shopId, r._count.id]));

  // Normalise legacy shops to the same shape as Vendor
  const legacyNormalized = legacyShops.map((s) => ({
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    website: s.website,
    bio: s.description,
    categories: ["print_shop"],
    provincesServed: s.provincesServed,
    isVerified: s.isVerified,
    isActive: s.isActive,
    isFeatured: false,
    stripeOnboarded: s.stripeOnboarded,
    rating: s.rating,
    reviewCount: s.reviewCount,
    avgResponseHours: s.averageResponseHours,
    yearsExperience: null,
    rateFrom: null,
    createdAt: s.createdAt,
    _count: s._count,
    jobsWon: wonMap[s.id] ?? 0,
    printShop: s,
    _legacy: true,
  }));

  // Attach won-bid counts for Vendor-linked print shops
  const vendorShopIds = vendors
    .filter((v) => v.printShop)
    .map((v) => v.printShop!.id);
  const vendorWonCounts = vendorShopIds.length
    ? await prisma.printBid.groupBy({
        by: ["shopId"],
        where: { shopId: { in: vendorShopIds }, isAccepted: true },
        _count: { id: true },
      })
    : [];
  const vendorWonMap = Object.fromEntries(vendorWonCounts.map((r) => [r.shopId, r._count.id]));

  const vendorNormalized = vendors.map((v) => ({
    ...v,
    _count: v.printShop?._count ?? { bids: 0 },
    avgResponseHours: v.avgResponseHours,
    jobsWon: v.printShop ? (vendorWonMap[v.printShop.id] ?? 0) : 0,
    _legacy: false,
  }));

  const data = [...vendorNormalized, ...legacyNormalized];

  return NextResponse.json({ data, total, page, pageSize });
}
