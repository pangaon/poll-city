import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/officials/approval/trending — officials with the biggest score change in the last 24h.
 * Returns { rising: [...], falling: [...] } with 5 entries each.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all recent history entries and compute delta from oldest to newest per approval
  const ratings = await prisma.approvalRating.findMany({
    where: { totalSignals: { gte: 10 } },
    include: {
      official: {
        select: { id: true, name: true, title: true, district: true, province: true, level: true, partyName: true, photoUrl: true },
      },
      history: {
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
        take: 100,
      },
    },
  });

  const deltas = ratings
    .map((r) => {
      if (r.history.length < 2) return null;
      const first = r.history[0];
      const latest = r.history[r.history.length - 1];
      const delta = latest.score - first.score;
      return {
        officialId: r.officialId,
        current: r.score,
        delta: Math.round(delta * 10) / 10,
        official: r.official,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const rising = [...deltas].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const falling = [...deltas].sort((a, b) => a.delta - b.delta).slice(0, 5);

  return NextResponse.json(
    { data: { rising, falling } },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
