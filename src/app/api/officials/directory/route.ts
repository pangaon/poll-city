import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const province = searchParams.get("province") ?? "";
  const level = searchParams.get("level") ?? "";
  const role = searchParams.get("role") ?? "";
  const municipality = searchParams.get("municipality") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = 24;

  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }
  if (province) where.province = province;
  if (level) where.level = level;
  if (role) where.title = { contains: role, mode: "insensitive" };
  if (municipality) where.district = { contains: municipality, mode: "insensitive" };

  const [officials, total] = await Promise.all([
    prisma.official.findMany({
      where,
      orderBy: [{ isClaimed: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        title: true,
        level: true,
        district: true,
        province: true,
        isClaimed: true,
        photoUrl: true,
        twitter: true,
        facebook: true,
        instagram: true,
        linkedIn: true,
        website: true,
        externalId: true,
        email: true,
        phone: true,
        campaigns: {
          select: { slug: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.official.count({ where }),
  ]);

  const [provinceRows, roleRows] = await Promise.all([
    prisma.official.findMany({
      where: { isActive: true, province: { not: null } },
      select: { province: true },
      distinct: ["province"],
      orderBy: { province: "asc" },
    }),
    prisma.official.findMany({
      where: { isActive: true },
      select: { title: true },
      distinct: ["title"],
      orderBy: { title: "asc" },
    }),
  ]);

  const mapped = officials.map((o) => ({
    ...o,
    campaignSlug: o.campaigns[0]?.slug ?? null,
  }));

  return NextResponse.json({
    data: mapped,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    filters: {
      provinces: provinceRows.map((p) => p.province).filter((v): v is string => Boolean(v)),
      levels: ["federal", "provincial", "municipal"],
      roles: roleRows.map((r) => r.title).filter((v): v is string => Boolean(v)),
    },
  });
}
