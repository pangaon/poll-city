import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const authResult = await apiAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const sp = req.nextUrl.searchParams;
  const search = sp.get("q") ?? "";
  const category = sp.get("category") ?? "";
  const province = sp.get("province") ?? "";
  const verified = sp.get("verified") === "true";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 20;

  const where = {
    isActive: true,
    ...(verified ? { isVerified: true } : {}),
    ...(category ? { categories: { has: category as never } } : {}),
    ...(province ? { provincesServed: { has: province } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { bio: { contains: search, mode: "insensitive" as const } },
            { tags: { has: search } },
          ],
        }
      : {}),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: [
        { isFeatured: "desc" },
        { isVerified: "desc" },
        { rating: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        contactName: true,
        categories: true,
        provincesServed: true,
        serviceAreas: true,
        isVerified: true,
        isFeatured: true,
        rating: true,
        reviewCount: true,
        logoUrl: true,
        yearsExperience: true,
        rateFrom: true,
        avgResponseHours: true,
        tags: true,
        bio: true,
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return NextResponse.json({ data: vendors, total, page, pageSize });
}
