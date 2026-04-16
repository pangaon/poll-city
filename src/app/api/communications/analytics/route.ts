import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET /api/communications/analytics?campaignId=...&days=30
// Returns: delivery funnel totals, per-blast table, daily trend series
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId") ?? "";
  const daysParam = parseInt(searchParams.get("days") ?? "30", 10);
  const days = [30, 60, 90].includes(daysParam) ? daysParam : 30;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ── 1. All sent logs in window ───────────────────────────────────────────
  const logs = await prisma.notificationLog.findMany({
    where: {
      campaignId,
      status: "sent",
      sentAt: { gte: since },
    },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      title: true,
      sentAt: true,
      totalSubscribers: true,
      deliveredCount: true,
      failedCount: true,
      openedCount: true,
      clickCount: true,
    },
  });

  // ── 2. Aggregate funnel totals ───────────────────────────────────────────
  const totals = logs.reduce(
    (acc, l) => {
      acc.sent += l.totalSubscribers;
      acc.delivered += l.deliveredCount;
      acc.opened += l.openedCount;
      acc.clicked += l.clickCount;
      return acc;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0 },
  );

  // Replied = inbound inbox messages that arrived after a send (approximation via EmailTrackingEvent click)
  // We use clickCount as the deepest engagement metric we reliably have.

  // ── 3. Daily trend series (group by date) ───────────────────────────────
  const dailyMap: Record<string, { date: string; sent: number; delivered: number; opened: number; clicked: number }> = {};
  for (const l of logs) {
    if (!l.sentAt) continue;
    const date = l.sentAt.toISOString().slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { date, sent: 0, delivered: 0, opened: 0, clicked: 0 };
    dailyMap[date].sent += l.totalSubscribers;
    dailyMap[date].delivered += l.deliveredCount;
    dailyMap[date].opened += l.openedCount;
    dailyMap[date].clicked += l.clickCount;
  }
  const trend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── 4. Per-blast breakdown ───────────────────────────────────────────────
  const blasts = logs.slice(0, 50).map((l) => ({
    id: l.id,
    title: l.title,
    sentAt: l.sentAt,
    sent: l.totalSubscribers,
    delivered: l.deliveredCount,
    failed: l.failedCount,
    opened: l.openedCount,
    clicked: l.clickCount,
    openRate: l.deliveredCount > 0 ? Math.round((l.openedCount / l.deliveredCount) * 1000) / 10 : 0,
    clickRate: l.openedCount > 0 ? Math.round((l.clickCount / l.openedCount) * 1000) / 10 : 0,
  }));

  return NextResponse.json({ totals, trend, blasts, days, total: logs.length });
}
