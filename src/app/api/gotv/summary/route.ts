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

  // All queries in parallel for speed
  const [
    totalContacts,
    confirmedSupporters,
    supportersVoted,
    totalVoted,
    p1Count,
    p2Count,
    p3Count,
    p4Count,
    votedToday,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] } },
    }),
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] }, voted: true },
    }),
    prisma.contact.count({ where: { campaignId, voted: true } }),
    // P1: gotvScore not available as a column — use support level + voted history as proxy
    // P1 = strong_support (most reliable)
    prisma.contact.count({
      where: { campaignId, supportLevel: "strong_support" as any, voted: false },
    }),
    // P2 = leaning_support
    prisma.contact.count({
      where: { campaignId, supportLevel: "leaning_support" as any, voted: false },
    }),
    // P3 = undecided (persuadable)
    prisma.contact.count({
      where: { campaignId, supportLevel: "undecided" as any, voted: false },
    }),
    // P4 = leaning_against (low priority)
    prisma.contact.count({
      where: { campaignId, supportLevel: "leaning_against" as any, voted: false },
    }),
    // Voted today
    prisma.contact.count({
      where: {
        campaignId,
        voted: true,
        votedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  // Win threshold: 35% of total electors need to vote for you
  const winThreshold = Math.ceil(totalContacts * 0.35);
  const gap = Math.max(0, winThreshold - supportersVoted);
  const percentComplete = confirmedSupporters > 0
    ? Math.round((supportersVoted / confirmedSupporters) * 100)
    : 0;

  const duration = Date.now() - start;

  return NextResponse.json({
    confirmedSupporters,
    supportersVoted,
    gap,
    winThreshold,
    p1Count,
    p2Count,
    p3Count,
    p4Count,
    votedToday,
    percentComplete,
    totalContacts,
    totalVoted,
    duration,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
