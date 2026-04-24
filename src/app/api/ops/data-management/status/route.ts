import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = req.nextUrl;
  const wardsFor = url.searchParams.get("wards");

  // ── Ward detail request ───────────────────────────────────────────────────
  if (wardsFor) {
    const wards = await prisma.wardBoundary.findMany({
      where: { municipality: wardsFor },
      select: { wardName: true, wardNumber: true, fetchedAt: true },
      orderBy: [{ wardNumber: "asc" }, { wardName: "asc" }],
    });

    return NextResponse.json({
      data: {
        wards: wards.map((w) => ({
          wardName: w.wardName,
          wardNumber: w.wardNumber,
          fetchedAt: w.fetchedAt.toISOString(),
        })),
      },
    });
  }

  // ── Full status dashboard ─────────────────────────────────────────────────
  const [wardAgg, campaigns] = await Promise.all([
    // Ward coverage: group by municipality
    prisma.wardBoundary.groupBy({
      by: ["municipality"],
      _count: { id: true },
      _max: { fetchedAt: true },
      orderBy: { municipality: "asc" },
    }),

    // Campaign health: name, contact count, household count, last import
    prisma.campaign.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        candidateName: true,
        _count: {
          select: {
            contacts: { where: { deletedAt: null } },
            households: true,
          },
        },
        contacts: {
          where: { deletedAt: null },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wardCoverage = wardAgg.map((row) => ({
    municipality: row.municipality,
    wardCount: row._count.id,
    lastFetchedAt: row._max.fetchedAt ? row._max.fetchedAt.toISOString() : null,
  }));

  const campaignHealth = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    candidateName: c.candidateName,
    contactCount: c._count.contacts,
    householdCount: c._count.households,
    lastImportAt: c.contacts[0]?.createdAt.toISOString() ?? null,
  }));

  return NextResponse.json({
    data: {
      wardCoverage,
      campaignHealth,
      lastRefreshed: new Date().toISOString(),
    },
  });
}
