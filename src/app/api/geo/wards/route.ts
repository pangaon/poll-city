import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/geo/wards?province=ON&municipality=Toronto
 *
 * Returns distinct ward/district names for a given province + municipality.
 * Primary source: Official records (level=municipal, province=province).
 * When a municipality is supplied, filters by officials whose district
 * contains the municipality name (works for "Ottawa Ward 1", "Toronto Ward 3", etc.).
 * Falls back to returning all municipal-level districts in the province when
 * no municipality is given, so the dropdown still populates.
 *
 * Secondary source: GeoDistrict cache (postal-code based, may be sparse).
 */
export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const province = searchParams.get("province")?.trim() ?? "";
  const municipality = searchParams.get("municipality")?.trim() ?? "";

  if (!province) {
    return NextResponse.json({ error: "province is required" }, { status: 400 });
  }

  // ── 1. Query Official table for distinct districts ────────────────────────
  const officialWhere: Prisma.OfficialWhereInput = {
    level: "municipal",
    province,
    isActive: true,
  };

  // If a municipality is given, narrow to officials whose district mentions it
  if (municipality) {
    officialWhere.district = { contains: municipality, mode: "insensitive" };
  }

  const officials = await prisma.official.findMany({
    where: officialWhere,
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
    take: 200,
  });

  const wardsFromOfficials = officials
    .map((o) => o.district)
    .filter(Boolean) as string[];

  // ── 2. Also check GeoDistrict cache (postal-prefix based) ────────────────
  const geoWhere: Prisma.GeoDistrictWhereInput = {
    level: "municipal",
    province,
    ward: { not: null },
  };
  if (municipality) {
    geoWhere.city = { contains: municipality, mode: "insensitive" };
  }

  const geoRows = await prisma.geoDistrict.findMany({
    where: geoWhere,
    select: { ward: true },
    distinct: ["ward"],
    orderBy: { ward: "asc" },
    take: 200,
  });

  const wardsFromGeo = geoRows
    .map((g) => g.ward)
    .filter((w): w is string => !!w);

  // ── 3. Merge + deduplicate ────────────────────────────────────────────────
  const merged = Array.from(new Set([...wardsFromOfficials, ...wardsFromGeo])).sort();

  return NextResponse.json({
    data: merged.map((name) => ({ name })),
    sources: {
      officials: wardsFromOfficials.length,
      geoDistrict: wardsFromGeo.length,
    },
  });
}
