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
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

export async function GET(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const metrics = await getGotvSummaryMetrics(campaignId);

  const duration = Date.now() - start;

  return NextResponse.json({
    ...metrics,
    duration,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
