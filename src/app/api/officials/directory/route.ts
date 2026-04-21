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

  let officialsBatch: Array<{
    id: string;
    name: string;
    title: string;
    level: string;
    district: string;
    province: string | null;
    isClaimed: boolean;
    isActive: boolean;
    partyName: string | null;
    party: string | null;
    photoUrl: string | null;
    twitter: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedIn: string | null;
    website: string | null;
    externalId: string | null;
    email: string | null;
    phone: string | null;
    _count: { follows: number };
  }> = [];
  let total = 0;
  let provinceRows: Array<{ province: string | null }> = [];

  try {
    [officialsBatch, total, provinceRows] = await Promise.all([
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
          _count: { select: { follows: true } },
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
  } catch (error) {
    console.error("[OFFICIALS] Directory query failed:", error);
    return NextResponse.json(
      {
        officials: [],
        total: 0,
        pageSize,
        hasMore: false,
        nextCursor: null,
        filterOptions: {
          provinces: [],
          levels: ["federal", "provincial", "municipal"],
          roles: [],
        },
        unavailable: true,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const hasMore = officialsBatch.length > pageSize;
  const officials = hasMore ? officialsBatch.slice(0, pageSize) : officialsBatch;
  const nextCursor = hasMore ? officials[officials.length - 1]?.id ?? null : null;

  let campaignRows: Array<{ officialId: string | null; slug: string }> = [];
  if (officials.length) {
    try {
      campaignRows = await prisma.campaign.findMany({
        where: { officialId: { in: officials.map((o) => o.id) } },
        select: { officialId: true, slug: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("[OFFICIALS] Campaign linkage query failed:", error);
    }
  }

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

  // Fetch active candidates for the current election — only on municipal/all filter
  const showCandidates = !level || level === "municipal";
  let candidates: Array<{
    id: string;
    fullName: string;
    office: string;
    wardOrRiding: string | null;
    jurisdictionRef: string;
    party: string | null;
    campaignStatus: string;
    officialId: string | null;
  }> = [];

  if (showCandidates) {
    try {
      candidates = await prisma.candidateProfile.findMany({
        where: {
          campaignStatus: { in: ["announced", "nominated", "certified"] },
          office: { in: ["councillor", "mayor", "regional_councillor"] },
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: "insensitive" } },
                  { jurisdictionRef: { contains: search, mode: "insensitive" } },
                  { wardOrRiding: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(municipality ? { jurisdictionRef: { contains: municipality, mode: "insensitive" } } : {}),
        },
        orderBy: [{ jurisdictionRef: "asc" }, { fullName: "asc" }],
        take: 50,
        select: {
          id: true,
          fullName: true,
          office: true,
          wardOrRiding: true,
          jurisdictionRef: true,
          party: true,
          campaignStatus: true,
          officialId: true,
        },
      });
    } catch {
      // Non-fatal — candidates section is additive
    }
  }

  return NextResponse.json(
    {
      officials: mapped,
      candidates,
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
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
    }
  );
}
