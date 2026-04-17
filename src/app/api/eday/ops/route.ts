/**
 * GET /api/eday/ops?campaignId=...
 *
 * Single aggregated endpoint for the Campaign Manager election-day command view.
 * Returns all four panels in one round-trip:
 *  - gotv: gap, voted, hourly rate, projection, P1/P2 counts
 *  - scrutineers: deployment + credential + submission status
 *  - results: poll-level live results summary
 *  - priority: top 25 P1 contacts not yet voted (for strike-off)
 *  - rides: contacts who need a ride and haven't voted
 *
 * Polled every 30 s on election day. No cache.
 * Requires ADMIN | CAMPAIGN_MANAGER | SUPER_ADMIN on the campaign.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

async function requireManager(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true },
  });
  if (!membership) return false;
  return ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const allowed = await requireManager(campaignId, session!.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const since12h = new Date(now - 12 * 60 * 60 * 1000);

  const [
    metrics,
    recentVotedContacts,
    scrutineers,
    liveResults,
    priorityContacts,
    rideContacts,
  ] = await Promise.all([
    // ── GOTV core metrics ──────────────────────────────────────────────────
    getGotvSummaryMetrics(campaignId),

    // ── Hourly voted rate (last 12 h) ──────────────────────────────────────
    prisma.contact.findMany({
      where: { campaignId, deletedAt: null, voted: true, votedAt: { gte: since12h } },
      select: { votedAt: true },
    }),

    // ── Scrutineer assignments ─────────────────────────────────────────────
    prisma.scrutineerAssignment.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { pollingStation: "asc" },
    }),

    // ── Live results ───────────────────────────────────────────────────────
    prisma.liveResult.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    // ── Priority contacts: P1 (strong_support) not yet voted, top 25 ──────
    prisma.contact.findMany({
      where: {
        campaignId,
        deletedAt: null,
        voted: false,
        supportLevel: "strong_support",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        address1: true,
        city: true,
        postalCode: true,
        lastContactedAt: true,
      },
      orderBy: [{ lastContactedAt: "desc" }, { firstName: "asc" }],
      take: 25,
    }),

    // ── Ride contacts: need ride, strong/leaning support, not voted ────────
    prisma.contact.findMany({
      where: {
        campaignId,
        deletedAt: null,
        voted: false,
        supportLevel: { in: ["strong_support", "leaning_support"] },
        OR: [
          { notes: { contains: "ride", mode: "insensitive" } },
          { notes: { contains: "transportation", mode: "insensitive" } },
          { accessibilityFlag: true },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        address1: true,
        city: true,
        postalCode: true,
        accessibilityFlag: true,
        notes: true,
      },
      take: 50,
    }),
  ]);

  // ── Build hourly vote buckets ───────────────────────────────────────────
  const hours: Array<{ hour: string; voted: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now - i * 60 * 60 * 1000);
    end.setMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    const count = recentVotedContacts.filter(
      (c) => c.votedAt && c.votedAt >= start && c.votedAt < end,
    ).length;
    hours.push({ hour: end.toLocaleTimeString("en-CA", { hour: "numeric" }), voted: count });
  }

  // ── Projection ─────────────────────────────────────────────────────────
  const pollClose = new Date();
  pollClose.setHours(20, 30, 0, 0);
  const hoursToClose = Math.max(0, (pollClose.getTime() - now) / (1000 * 60 * 60));
  const recentRate = hours.slice(-3).reduce((s, h) => s + h.voted, 0) / 3;
  const projectedAdditional = Math.round(recentRate * hoursToClose);

  // ── Scrutineer submission tracking ─────────────────────────────────────
  const submittedByUserId = new Set(
    liveResults
      .flatMap((r) => [r.entryOneUserId, r.entryTwoUserId])
      .filter((id): id is string => id !== null),
  );

  const scrutineerRows = scrutineers.map((a) => ({
    id: a.id,
    pollingStation: a.pollingStation,
    pollingAddress: a.pollingAddress,
    municipality: a.municipality,
    ward: a.ward,
    user: a.user,
    candidateSigned: a.candidateSigned,
    hasSubmitted: submittedByUserId.has(a.userId),
  }));

  // ── Live results grouped by polling station ────────────────────────────
  const pollMap = new Map<string, { pollingStation: string; verifiedCount: number; pendingCount: number; candidateVotes: number }>();
  for (const r of liveResults) {
    const key = r.ward ?? r.municipality ?? "Unknown";
    const existing = pollMap.get(key);
    const candidateVotes = r.votes;
    if (existing) {
      if (r.isVerified) existing.verifiedCount++;
      else existing.pendingCount++;
      existing.candidateVotes += candidateVotes;
    } else {
      pollMap.set(key, {
        pollingStation: key,
        verifiedCount: r.isVerified ? 1 : 0,
        pendingCount: r.isVerified ? 0 : 1,
        candidateVotes,
      });
    }
  }

  // Our candidate totals from verified
  const verified = liveResults.filter((r) => r.isVerified);
  const candidateMap = new Map<string, number>();
  for (const r of verified) {
    candidateMap.set(r.candidateName, (candidateMap.get(r.candidateName) ?? 0) + r.votes);
  }
  const topResults = Array.from(candidateMap.entries())
    .map(([name, votes]) => ({ name, votes }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  return NextResponse.json(
    {
      gotv: {
        gap: metrics.gap,
        supportersVoted: metrics.supportersVoted,
        confirmedSupporters: metrics.confirmedSupporters,
        winThreshold: metrics.winThreshold,
        percentComplete: metrics.percentComplete,
        p1Count: metrics.p1Count,
        p2Count: metrics.p2Count,
        votedToday: metrics.votedToday,
        totalVoted: metrics.totalVoted,
        hourlyVotes: hours,
        projectedAdditional,
        hoursToClose: Math.round(hoursToClose * 10) / 10,
      },
      scrutineers: scrutineerRows,
      results: {
        totalEntries: liveResults.length,
        verifiedEntries: verified.length,
        pendingEntries: liveResults.length - verified.length,
        pollsByStation: Array.from(pollMap.values()),
        topCandidates: topResults,
        recentEntries: liveResults.slice(0, 10).map((r) => ({
          id: r.id,
          candidateName: r.candidateName,
          party: r.party,
          votes: r.votes,
          pollingStation: r.ward ?? r.municipality,
          isVerified: r.isVerified,
          ocrAssisted: r.ocrAssisted,
          createdAt: r.createdAt,
        })),
      },
      priority: priorityContacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        address: [c.address1, c.city, c.postalCode].filter(Boolean).join(", "),
        lastContactedAt: c.lastContactedAt,
      })),
      rides: rideContacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        address: [c.address1, c.city, c.postalCode].filter(Boolean).join(", "),
        accessibilityNeeds: c.accessibilityFlag,
        notes: c.notes,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
