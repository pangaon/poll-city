import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  void session;

  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year") ?? "2022";
  const province = searchParams.get("province");
  const mode = searchParams.get("mode") ?? "list"; // "list" | "geojson"

  const y = parseInt(year);
  const where: Record<string, unknown> = {
    electionType: "municipal",
    won: true,
    electionDate: { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) },
  };
  if (province) where.province = province;

  const winners = await prisma.electionResult.findMany({
    where,
    select: {
      jurisdiction: true,
      candidateName: true,
      percentage: true,
      totalVotesCast: true,
      votesReceived: true,
      province: true,
    },
    orderBy: { percentage: "desc" },
    take: 500,
  });

  const maxVotes = Math.max(...winners.map((w) => w.totalVotesCast), 1);

  const features = winners.map((w) => ({
    jurisdiction: w.jurisdiction,
    candidateName: w.candidateName,
    percentage: w.percentage,
    totalVotesCast: w.totalVotesCast,
    votesReceived: w.votesReceived,
    province: w.province,
    intensity: Math.round((w.totalVotesCast / maxVotes) * 100),
    bucket: w.percentage < 40 ? "close" : w.percentage < 60 ? "moderate" : "dominant",
  }));

  // GeoJSON mode — join election results with boundary polygons from GeoDistrict
  if (mode === "geojson") {
    const electionByName = new Map<string, (typeof features)[0]>();
    for (const f of features) {
      electionByName.set(f.jurisdiction.toLowerCase().trim(), f);
    }

    const boundaries = await prisma.geoDistrict.findMany({
      where: {
        districtType: "municipal",
        ...(province ? { province } : {}),
      },
      select: { id: true, name: true, geoJson: true, province: true, externalId: true },
    });

    const geoFeatures = boundaries
      .filter((b) => b.geoJson && b.name)
      .map((b) => {
        const key = (b.name ?? "").toLowerCase().trim();
        const election = electionByName.get(key);
        // Destructure province out of election to avoid duplicate key
        const { province: _electionProvince, ...electionWithoutProvince } = election ?? {
          jurisdiction: b.name,
          candidateName: null,
          percentage: null,
          totalVotesCast: null,
          votesReceived: null,
          intensity: 0,
          bucket: "no-data" as const,
          province: null,
        };
        void _electionProvince;
        return {
          type: "Feature" as const,
          properties: {
            id: b.id,
            name: b.name,
            province: b.province,
            hasElectionData: !!election,
            ...electionWithoutProvince,
          },
          geometry: b.geoJson,
        };
      });

    return NextResponse.json(
      {
        data: features,
        geojson: { type: "FeatureCollection", features: geoFeatures },
        year,
        total: features.length,
        boundaryCount: geoFeatures.length,
      },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" } }
    );
  }

  return NextResponse.json(
    { data: features, year, total: features.length },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" } }
  );
}
