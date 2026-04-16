/**
 * GET /api/intelligence/atlas?campaignId=
 *
 * Returns ATLAS approval rating data for the official linked to this campaign.
 * If no official is linked, returns { noOfficial: true }.
 *
 * Response shape:
 * {
 *   officialName: string
 *   officialTitle: string
 *   currentRating: number        // 0-100 display score
 *   netScore: number             // -100..+100
 *   velocity: "up" | "down" | "flat"
 *   totalSignals: number
 *   sentiment: { positive: number; neutral: number; negative: number }
 *   trend30: Array<{ date: string; rating: number }>
 *   trend60: Array<{ date: string; rating: number }>
 *   trend90: Array<{ date: string; rating: number }>
 *   signalVolume: Array<{ date: string; count: number }>  // last 30 days
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "intelligence:read",
  );
  if (forbidden) return forbidden;

  // Resolve official linked to this campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { officialId: true },
  });

  if (!campaign?.officialId) {
    return NextResponse.json({ noOfficial: true });
  }

  const officialId = campaign.officialId;
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  const [official, signals30] = await Promise.all([
    prisma.official.findUnique({
      where: { id: officialId },
      select: {
        name: true,
        title: true,
        approvalRating: {
          select: {
            score: true,
            netScore: true,
            velocity: true,
            totalSignals: true,
            positiveCount: true,
            negativeCount: true,
            neutralCount: true,
            history: {
              orderBy: { recordedAt: "asc" },
              where: { recordedAt: { gte: d90 } },
              select: { score: true, recordedAt: true },
            },
          },
        },
      },
    }),

    prisma.sentimentSignal.groupBy({
      by: ["createdAt"],
      where: { officialId, createdAt: { gte: d30 } },
      _count: true,
    }),
  ]);

  if (!official) {
    return NextResponse.json({ noOfficial: true });
  }

  const ar = official.approvalRating;
  const score = ar?.score ?? 50;
  const velocity = !ar?.velocity ? "flat"
    : ar.velocity > 0.5 ? "up"
    : ar.velocity < -0.5 ? "down"
    : "flat";

  // Build trend arrays from history — group into buckets of ~3 days per data point
  const allHistory = ar?.history ?? [];

  function buildTrend(since: Date): Array<{ date: string; rating: number }> {
    const relevant = allHistory.filter(h => h.recordedAt >= since);
    if (relevant.length === 0) {
      // No history — return flat line at current score
      const out: Array<{ date: string; rating: number }> = [];
      const days = Math.round((now.getTime() - since.getTime()) / 86400000);
      for (let i = days; i >= 0; i -= 3) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        out.push({ date: d.toISOString().slice(0, 10), rating: score });
      }
      return out;
    }

    // Bucket into ~10 points
    const bucketMs = Math.max(86400000 * 3, (now.getTime() - since.getTime()) / 10);
    const buckets = new Map<string, number[]>();
    for (const h of relevant) {
      const bucketTs = Math.floor(h.recordedAt.getTime() / bucketMs) * bucketMs;
      const key = new Date(bucketTs).toISOString().slice(0, 10);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(h.score);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date,
        rating: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }));
  }

  // Signal volume by day (last 30 days) — aggregate the groupBy results by date string
  const volByDay = new Map<string, number>();
  for (const s of signals30) {
    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    volByDay.set(day, (volByDay.get(day) ?? 0) + s._count);
  }
  // Fill in zero-days for the last 30
  const signalVolume: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    signalVolume.push({ date: day, count: volByDay.get(day) ?? 0 });
  }

  return NextResponse.json({
    officialName: official.name,
    officialTitle: official.title,
    currentRating: Math.round(score),
    netScore: Math.round(ar?.netScore ?? 0),
    velocity,
    totalSignals: ar?.totalSignals ?? 0,
    sentiment: {
      positive: ar?.positiveCount ?? 0,
      neutral: ar?.neutralCount ?? 0,
      negative: ar?.negativeCount ?? 0,
    },
    trend30: buildTrend(d30),
    trend60: buildTrend(d60),
    trend90: buildTrend(d90),
    signalVolume,
  });
}
