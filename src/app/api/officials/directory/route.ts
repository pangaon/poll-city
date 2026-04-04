import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const province = searchParams.get("province") ?? "";
  const level = searchParams.get("level") ?? "";
  const role = searchParams.get("role") ?? "";
  const municipality = searchParams.get("municipality") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = 24;

  const where: Record<string, unknown> = {};

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
      orderBy: [{ isClaimed: "desc" }, { isActive: "desc" }, { name: "asc" }],
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
        isActive: true,
        partyName: true,
        party: true,
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

  const [provinceRows] = await Promise.all([
    prisma.official.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ["province"],
      orderBy: { province: "asc" },
    }),
  ]);

  const mapped = officials.map((o) => ({
    id: o.id,
    name: o.name,
    title: o.title,
    level: String(o.level),
    district: o.district,
    province: o.province,
    isClaimed: o.isClaimed,
    isActive: o.isActive,
    partyName: o.partyName,
    party: o.party,
    photoUrl: o.photoUrl,
    twitter: o.twitter,
    facebook: o.facebook,
    instagram: o.instagram,
    linkedIn: o.linkedIn,
    website: o.website,
    email: o.email,
    phone: o.phone,
    externalId: o.externalId,
    campaignSlug: o.campaigns[0]?.slug ?? null,
  }));

  return NextResponse.json(
    {
      officials: mapped,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      filterOptions: {
        provinces: provinceRows.map((p) => p.province).filter((v): v is string => Boolean(v)),
        levels: ["federal", "provincial", "municipal"],
        roles: [],
      },
    },
    {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    }
  );
}
