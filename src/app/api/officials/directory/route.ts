import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const VALID_LEVELS = new Set(["federal", "provincial", "municipal"]);

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const province = searchParams.get("province") ?? "";
  const level = searchParams.get("level") ?? "";
  const role = searchParams.get("role") ?? "";
  const municipality = searchParams.get("municipality") ?? "";
  const cursor = searchParams.get("cursor") ?? undefined;
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get("pageSize") ?? "24")));

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { title: { contains: search, mode: "insensitive" as const } },
            { district: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(province ? { province } : {}),
    ...(level && VALID_LEVELS.has(level) ? { level: level as "federal" | "provincial" | "municipal" } : {}),
    ...(role ? { title: { contains: role, mode: "insensitive" as const } } : {}),
    ...(municipality ? { district: { contains: municipality, mode: "insensitive" as const } } : {}),
  };

  const [officialsBatch, total, provinceRows] = await Promise.all([
    prisma.official.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
      },
    }),
    prisma.official.count({ where }),
    prisma.official.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ["province"],
      orderBy: { province: "asc" },
    }),
  ]);

  const hasMore = officialsBatch.length > pageSize;
  const officials = hasMore ? officialsBatch.slice(0, pageSize) : officialsBatch;
  const nextCursor = hasMore ? officials[officials.length - 1]?.id ?? null : null;

  const campaignRows = officials.length
    ? await prisma.campaign.findMany({
        where: { officialId: { in: officials.map((o) => o.id) } },
        select: { officialId: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const campaignByOfficial = new Map<string, string>();
  for (const row of campaignRows) {
    if (row.officialId && !campaignByOfficial.has(row.officialId)) {
      campaignByOfficial.set(row.officialId, row.slug);
    }
  }

  const mapped = officials.map((o) => ({
    ...o,
    level: String(o.level),
    campaignSlug: campaignByOfficial.get(o.id) ?? null,
  }));

  return NextResponse.json(
    {
      officials: mapped,
      total,
      pageSize,
      hasMore,
      nextCursor,
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
