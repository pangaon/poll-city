import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getApprovalLeaderboard } from "@/lib/sentiment/approval-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/officials/approval/leaderboard — top 20 officials by approval score.
 * Query params: province, level, party, sort, limit.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "read");
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const province = sp.get("province") ?? undefined;
  const level = sp.get("level") ?? undefined;
  const party = sp.get("party") ?? undefined;
  const sortParam = sp.get("sort") ?? "top";
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)));

  const sort = (["top", "bottom", "trending_up", "trending_down"] as const).includes(sortParam as never)
    ? (sortParam as "top" | "bottom" | "trending_up" | "trending_down")
    : "top";

  const results = await getApprovalLeaderboard({ province, level, party, sort, limit });

  return NextResponse.json(
    { data: results },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
  );
}
