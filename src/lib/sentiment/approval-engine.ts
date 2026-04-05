/**
 * Poll City — Live Approval Rating Engine
 *
 * Calculates and maintains live approval scores for elected officials
 * based on real-time weighted sentiment signals.
 *
 * Weighting model:
 *   poll_vote          — 40% of score weight
 *   support_signal     — 25% of score weight
 *   question_sentiment — 15% of score weight
 *   follow / unfollow  — 10% of score weight
 *   interaction        — 10% of score weight
 *
 * Score scale: 0-100 (display) with companion netScore -100..+100.
 */

import prisma from "@/lib/db/prisma";

export type SignalType =
  | "poll_vote"
  | "support_signal"
  | "question_sentiment"
  | "follow"
  | "unfollow"
  | "interaction";

const TYPE_WEIGHTS: Record<SignalType, number> = {
  poll_vote: 0.40,
  support_signal: 0.25,
  question_sentiment: 0.15,
  follow: 0.05,
  unfollow: 0.05,
  interaction: 0.10,
};

interface SignalAggregate {
  type: SignalType;
  sum: number;      // sum of (value * weight)
  weightSum: number; // sum of weights
  count: number;
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * Record a new sentiment signal and recalculate the approval rating.
 * Safe to call from any trigger point (poll vote, follow, etc.).
 */
export async function addSentimentSignal(
  officialId: string,
  type: SignalType,
  value: number,
  source: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const clamped = Math.max(-1, Math.min(1, value));
  try {
    await prisma.sentimentSignal.create({
      data: {
        officialId,
        type,
        value: clamped,
        source,
        metadata: metadata as object | undefined,
        weight: 1.0,
      },
    });
    await recalculateApproval(officialId);
  } catch (e) {
    console.error("[approval-engine] addSentimentSignal failed:", e);
  }
}

/**
 * Recalculate approval rating for an official based on all historical signals.
 * Uses weighted aggregation per signal type, then blends by TYPE_WEIGHTS.
 */
export async function recalculateApproval(officialId: string): Promise<void> {
  const signals = await prisma.sentimentSignal.findMany({
    where: { officialId },
    select: { type: true, value: true, weight: true },
  });

  if (signals.length === 0) {
    // No signals yet — maintain neutral 50 baseline
    await prisma.approvalRating.upsert({
      where: { officialId },
      create: { officialId, score: 50, netScore: 0, totalSignals: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0 },
      update: {},
    });
    return;
  }

  // Aggregate by type
  const byType = new Map<SignalType, SignalAggregate>();
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const s of signals) {
    const type = s.type as SignalType;
    const agg = byType.get(type) ?? {
      type,
      sum: 0,
      weightSum: 0,
      count: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    agg.sum += s.value * s.weight;
    agg.weightSum += s.weight;
    agg.count += 1;
    if (s.value > 0.2) { agg.positive += 1; positive += 1; }
    else if (s.value < -0.2) { agg.negative += 1; negative += 1; }
    else { agg.neutral += 1; neutral += 1; }
    byType.set(type, agg);
  }

  // Calculate weighted blend
  // Each type's mean (-1..+1) is multiplied by its TYPE_WEIGHT.
  // Missing types contribute 0 (neutral) scaled by their weight.
  let weightedNetScore = 0;     // -1..+1 scale
  let usedWeightSum = 0;

  for (const [type, typeWeight] of Object.entries(TYPE_WEIGHTS) as [SignalType, number][]) {
    const agg = byType.get(type);
    if (agg && agg.weightSum > 0) {
      const typeMean = agg.sum / agg.weightSum; // -1..+1
      weightedNetScore += typeMean * typeWeight;
      usedWeightSum += typeWeight;
    }
  }

  // Normalize if we didn't hit all types
  if (usedWeightSum > 0) {
    weightedNetScore = weightedNetScore / usedWeightSum;
  }

  // Convert -1..+1 → 0-100 display score
  const score = Math.round(((weightedNetScore + 1) / 2) * 100 * 10) / 10;
  const netScore = Math.round(weightedNetScore * 100 * 10) / 10;

  // Upsert approval rating
  const rating = await prisma.approvalRating.upsert({
    where: { officialId },
    create: {
      officialId,
      score,
      netScore,
      totalSignals: signals.length,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
    },
    update: {
      score,
      netScore,
      totalSignals: signals.length,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
    },
  });

  // Append to history (for trend analysis)
  try {
    await prisma.approvalHistory.create({
      data: {
        approvalId: rating.id,
        score,
        netScore,
        signalType: "recalculated",
      },
    });
  } catch {
    // Non-critical
  }
}

export interface ApprovalWithTrend {
  score: number;
  netScore: number;
  trend: "rising" | "falling" | "flat";
  trendAmount: number;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  updatedAt: string;
  history: Array<{ score: number; netScore: number; recordedAt: string }>;
}

/**
 * Get approval rating with trend computed against 7 days ago.
 */
export async function getApprovalWithTrend(officialId: string, days = 30): Promise<ApprovalWithTrend | null> {
  const rating = await prisma.approvalRating.findUnique({
    where: { officialId },
    include: {
      history: {
        where: { recordedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
        orderBy: { recordedAt: "asc" },
        take: 200,
      },
    },
  });

  if (!rating) return null;

  // Compute trend vs ~7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldRecord = rating.history.find((h) => h.recordedAt >= sevenDaysAgo);
  const oldScore = oldRecord?.score ?? rating.score;
  const trendAmount = Math.round((rating.score - oldScore) * 10) / 10;

  let trend: "rising" | "falling" | "flat" = "flat";
  if (trendAmount >= 1) trend = "rising";
  else if (trendAmount <= -1) trend = "falling";

  return {
    score: rating.score,
    netScore: rating.netScore,
    trend,
    trendAmount,
    totalSignals: rating.totalSignals,
    positiveCount: rating.positiveCount,
    negativeCount: rating.negativeCount,
    neutralCount: rating.neutralCount,
    updatedAt: rating.updatedAt.toISOString(),
    history: rating.history.map((h) => ({
      score: h.score,
      netScore: h.netScore,
      recordedAt: h.recordedAt.toISOString(),
    })),
  };
}

/**
 * Get leaderboard of officials by approval score.
 */
export async function getApprovalLeaderboard(options: {
  limit?: number;
  province?: string;
  level?: string;
  party?: string;
  sort?: "top" | "bottom" | "trending_up" | "trending_down";
}) {
  const { limit = 20, province, level, party, sort = "top" } = options;

  const ratings = await prisma.approvalRating.findMany({
    where: {
      totalSignals: { gte: 10 },
      official: {
        ...(province && { province }),
        ...(level && { level: level as "federal" | "provincial" | "municipal" }),
        ...(party && { partyName: { contains: party, mode: "insensitive" } }),
      },
    },
    include: {
      official: {
        select: {
          id: true, name: true, title: true, district: true, province: true,
          level: true, partyName: true, photoUrl: true, isClaimed: true,
        },
      },
    },
    orderBy: sort === "top" || sort === "trending_up"
      ? [{ score: "desc" }]
      : [{ score: "asc" }],
    take: limit * 2, // fetch more so we can sort by trend after
  });

  return ratings.slice(0, limit).map((r) => ({
    officialId: r.officialId,
    score: r.score,
    netScore: r.netScore,
    totalSignals: r.totalSignals,
    official: r.official,
  }));
}
