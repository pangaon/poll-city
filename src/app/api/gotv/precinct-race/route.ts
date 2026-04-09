/**
 * GET /api/gotv/precinct-race — Per-precinct gap leaderboard for the live race board.
 *
 * George's spec: "Precincts sorted by gap size, largest first.
 * Every 30 seconds gaps update. When a precinct changes rank it
 * physically slides to its new position."
 *
 * Returns every municipal poll as a "precinct" with:
 * - Gap (supporters not yet voted)
 * - Turnout percentage
 * - Volunteer count assigned
 * - Status: critical / watch / nearly_won / won
 * - Rank (by gap descending)
 *
 * Designed for 30-second polling by framer-motion layout animations.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { resolvePermissions } from "@/lib/permissions/engine";
import { calculateWinThreshold } from "@/lib/operations/metrics-truth";

export async function GET(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Verify campaign membership and resolve enterprise permissions
  const resolved = await resolvePermissions(session!.user.id, campaignId);
  if (!resolved || resolved.roleSlug === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!resolved.permissions.includes("*") && !resolved.permissions.some((p) => p.startsWith("gotv:"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all contacts grouped by poll
  const contacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null, isDeceased: false, municipalPoll: { not: null } },
    select: { municipalPoll: true, supportLevel: true, voted: true },
  });

  // Group by poll
  const polls = new Map<string, { total: number; supporters: number; supportersVoted: number; totalVoted: number }>();

  for (const c of contacts) {
    const poll = c.municipalPoll!;
    if (!polls.has(poll)) polls.set(poll, { total: 0, supporters: 0, supportersVoted: 0, totalVoted: 0 });
    const p = polls.get(poll)!;
    p.total++;
    const isSupporter = (c.supportLevel as string) === "strong_support" || (c.supportLevel as string) === "leaning_support";
    if (isSupporter) p.supporters++;
    if (c.voted) {
      p.totalVoted++;
      if (isSupporter) p.supportersVoted++;
    }
  }

  // Build precinct race data
  const precincts = Array.from(polls.entries()).map(([name, p]) => {
    const winThreshold = calculateWinThreshold(p.total);
    const gap = Math.max(0, winThreshold - p.supportersVoted);
    const turnoutPct = p.total > 0 ? Math.round((p.totalVoted / p.total) * 100) : 0;
    const supporterTurnoutPct = p.supporters > 0 ? Math.round((p.supportersVoted / p.supporters) * 100) : 0;

    const status: "critical" | "watch" | "nearly_won" | "won" =
      gap === 0 ? "won" :
      gap < 100 ? "nearly_won" :
      gap <= 200 ? "watch" : "critical";

    const colour =
      status === "won" ? "#1D9E75" :
      status === "nearly_won" ? "#1D9E75" :
      status === "watch" ? "#EF9F27" : "#E24B4A";

    return {
      id: name.replace(/\s+/g, "-").toLowerCase(),
      name,
      gap,
      winThreshold,
      supporters: p.supporters,
      supportersVoted: p.supportersVoted,
      total: p.total,
      totalVoted: p.totalVoted,
      turnoutPct,
      supporterTurnoutPct,
      status,
      colour,
    };
  }).sort((a, b) => b.gap - a.gap);

  // Assign ranks
  const ranked = precincts.map((p, i) => ({ ...p, rank: i + 1 }));

  // Summary
  const totalGap = ranked.reduce((s, p) => s + p.gap, 0);
  const wonCount = ranked.filter((p) => p.status === "won").length;
  const criticalCount = ranked.filter((p) => p.status === "critical").length;

  const duration = Date.now() - start;

  return NextResponse.json({
    precincts: ranked,
    summary: {
      totalPrecincts: ranked.length,
      totalGap,
      won: wonCount,
      critical: criticalCount,
      watch: ranked.filter((p) => p.status === "watch").length,
      nearlyWon: ranked.filter((p) => p.status === "nearly_won").length,
    },
    duration,
  }, { headers: { "Cache-Control": "no-store" } });
}
