/**
 * GET /api/gotv/summary — The war room dashboard numbers.
 *
 * Returns the complete GOTV picture in one call:
 * confirmed supporters, voted count, The Gap, P1-P4 breakdown,
 * win threshold, and percent complete.
 *
 * This is polled every 30 seconds on election day.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

export async function GET(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:read");
  if (forbidden) return forbidden;

  const metrics = await getGotvSummaryMetrics(campaignId!);

  const duration = Date.now() - start;

  return NextResponse.json({
    ...metrics,
    duration,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
