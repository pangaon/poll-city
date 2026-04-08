import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { resolvePermissions } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().min(1),
});

// Election day command centre metrics: hourly voting rate, projected total,
// P1 coverage, volunteer field activity.
// Core GOTV counts come from shared getGotvSummaryMetrics — single source of truth.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const parsed = querySchema.safeParse({
    campaignId: req.nextUrl.searchParams.get("campaignId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId } = parsed.data;

  // Verify campaign membership and resolve permissions (requires gotv:manage)
  const resolved = await resolvePermissions(session!.user.id, campaignId);
  if (!resolved || resolved.roleSlug === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!resolved.permissions.includes("*") && !resolved.permissions.some((p) => p === "gotv:manage" || p === "gotv:*")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Shared metrics — canonical counts and tier breakdown
  const metrics = await getGotvSummaryMetrics(campaignId);

  // Hourly voted rate — last 12 hours bucketed by hour (command-specific logic)
  const now = Date.now();
  const sinceTwelveHours = new Date(now - 12 * 60 * 60 * 1000);

  const recentVotes = await prisma.contact.findMany({
    where: {
      campaignId,
      voted: true,
      votedAt: { gte: sinceTwelveHours },
    },
    select: { votedAt: true },
  });

  const hours: Array<{ hour: string; voted: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now - i * 60 * 60 * 1000);
    end.setMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    const count = recentVotes.filter((c) => c.votedAt && c.votedAt >= start && c.votedAt < end).length;
    hours.push({
      hour: end.toLocaleTimeString([], { hour: "numeric" }),
      voted: count,
    });
  }

  // Projection: current 3-hour rate × remaining hours to poll close (20:30)
  const pollClose = new Date();
  pollClose.setHours(20, 30, 0, 0);
  const hoursToClose = Math.max(0, (pollClose.getTime() - now) / (1000 * 60 * 60));
  const recentRate = hours.slice(-3).reduce((s, h) => s + h.voted, 0) / 3;
  const projectedAdditional = Math.round(recentRate * hoursToClose);
  const projectedTotal = metrics.totalVoted + projectedAdditional;

  // Recent interactions pulse (last 12 h)
  const recentInteractions = await prisma.interaction.count({
    where: { contact: { campaignId }, createdAt: { gte: sinceTwelveHours } },
  });

  // P1 total = outstanding (p1Count) + already voted supporters in tier 1.
  // We use supportersVoted as a proxy for P1 voted (most voted supporters are P1).
  const p1Outstanding = metrics.p1Count;
  const p1Voted = metrics.supportersVoted;
  const p1Total = p1Outstanding + p1Voted;

  return NextResponse.json({
    summary: {
      totalVoters: metrics.totalContacts,
      totalVoted: metrics.totalVoted,
      votedPct: metrics.totalContacts ? Math.round((metrics.totalVoted / metrics.totalContacts) * 100) : 0,
      p1Total,
      p1Voted,
      p1VotedPct: p1Total > 0 ? Math.round((p1Voted / p1Total) * 100) : 0,
      outstandingP1: p1Outstanding,
      projectedTotal,
      hoursToClose: Math.round(hoursToClose * 10) / 10,
      winThreshold: metrics.winThreshold,
      gap: metrics.gap,
      percentComplete: metrics.percentComplete,
    },
    hourlyVotes: hours,
    recentInteractions,
    electionDayReady: metrics.p1Count > 0 || metrics.p2Count > 0,
  });
}
