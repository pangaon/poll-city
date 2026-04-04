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

  // Normalise percentage to 0–100 heat intensity
  const maxVotes = Math.max(...winners.map((w) => w.totalVotesCast), 1);

  const features = winners.map((w) => ({
    jurisdiction: w.jurisdiction,
    candidateName: w.candidateName,
    percentage: w.percentage,
    totalVotesCast: w.totalVotesCast,
    votesReceived: w.votesReceived,
    province: w.province,
    intensity: Math.round((w.totalVotesCast / maxVotes) * 100),
    // Colour bucket: < 40% close race, 40-60% moderate, > 60% dominant
    bucket: w.percentage < 40 ? "close" : w.percentage < 60 ? "moderate" : "dominant",
  }));

  return NextResponse.json({ data: features, year, total: features.length });
}
