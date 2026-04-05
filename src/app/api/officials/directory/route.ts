import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const VALID_LEVELS = new Set(["federal", "provincial", "municipal"]);

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

  const conditions: Prisma.Sql[] = [];
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      Prisma.sql`(
        "name" ILIKE ${term}
        OR "title" ILIKE ${term}
        OR "district" ILIKE ${term}
      )`
    );
  }
  if (province) conditions.push(Prisma.sql`"province" = ${province}`);
  if (level && VALID_LEVELS.has(level)) {
    conditions.push(Prisma.sql`"level" = CAST(${level} AS "GovernmentLevel")`);
  }
  if (role) conditions.push(Prisma.sql`"title" ILIKE ${`%${role}%`}`);
  if (municipality) conditions.push(Prisma.sql`"district" ILIKE ${`%${municipality}%`}`);

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  type OfficialRow = {
    id: string;
    name: string;
    title: string | null;
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
  };

  const filteredOfficials = await prisma.$queryRaw<OfficialRow[]>`
    WITH filtered AS (
      SELECT *
      FROM "officials"
      ${whereClause}
    )
    SELECT
      "id",
      "name",
      "title",
      "level"::text as "level",
      "district",
      "province",
      "isClaimed",
      "isActive",
      "partyName",
      "party",
      "photoUrl",
      "twitter",
      "facebook",
      "instagram",
      "linkedIn",
      "website",
      "externalId",
      "email",
      "phone"
    FROM filtered
    ORDER BY "isClaimed" DESC, "isActive" DESC, "name" ASC
  `;

  const seen = new Set<string>();
  const dedupedOfficials = filteredOfficials.filter((official) => {
    const key = `${official.name.toLowerCase()}|${String(official.level).toLowerCase()}|${(
      official.province ?? ""
    ).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const total = dedupedOfficials.length;
  const paginatedOfficials = dedupedOfficials.slice((page - 1) * pageSize, page * pageSize);

  const campaignRows = paginatedOfficials.length
    ? await prisma.campaign.findMany({
        where: { officialId: { in: paginatedOfficials.map((o) => o.id) } },
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

  const [provinceRows] = await Promise.all([
    prisma.official.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ["province"],
      orderBy: { province: "asc" },
    }),
  ]);

  const mapped = paginatedOfficials.map((o) => ({
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
    campaignSlug: campaignByOfficial.get(o.id) ?? null,
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
