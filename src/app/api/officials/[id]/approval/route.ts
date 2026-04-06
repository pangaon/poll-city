import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getApprovalWithTrend } from "@/lib/sentiment/approval-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/officials/[id]/approval — returns current approval with 30-day history.
 * Public endpoint (rate-limited).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Math.min(365, Math.max(1, parseInt(daysParam, 10))) : 30;

  const data = await getApprovalWithTrend(params.id, days);

  if (!data) {
    // No signals yet — return neutral placeholder
    return NextResponse.json({
      data: {
        score: 50,
        netScore: 0,
        trend: "flat" as const,
        trendAmount: 0,
        totalSignals: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        updatedAt: new Date().toISOString(),
        history: [],
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
