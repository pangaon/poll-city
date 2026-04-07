import prisma from "@/lib/db/prisma";

const K_ANONYMITY_THRESHOLD = 100;

export async function computeApprovalRating(officialId: string): Promise<void> {
  const signals = await prisma.sentimentSignal.findMany({
    where: {
      officialId,
      createdAt: { gte: new Date(Date.now() - 365 * 86400000) },
    },
  });

  if (signals.length < K_ANONYMITY_THRESHOLD) return;

  // PLACEHOLDER WEIGHTS — real ATLAS algorithm in poll-city-intelligence private repo
  let weightedSum = 0;
  let totalWeight = 0;
  for (const signal of signals) {
    const daysSince = (Date.now() - signal.createdAt.getTime()) / 86400000;
    const decay = Math.pow(0.5, daysSince / 90);
    weightedSum += signal.value * decay;
    totalWeight += decay;
  }

  const score = totalWeight > 0 ? ((weightedSum / totalWeight + 1) / 2) * 100 : 50;
  const netScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Calculate velocity from last rating
  const existing = await prisma.approvalRating.findUnique({ where: { officialId } });
  const velocity = existing
    ? (score - existing.score) / Math.max(1, (Date.now() - existing.updatedAt.getTime()) / 86400000)
    : 0;

  const positiveCount = signals.filter((s) => s.value > 0).length;
  const negativeCount = signals.filter((s) => s.value < 0).length;
  const neutralCount = signals.filter((s) => s.value === 0).length;

  const marginOfError = (1.96 * Math.sqrt((score * (100 - score)) / signals.length) / 100) * 100;

  await prisma.approvalRating.upsert({
    where: { officialId },
    create: {
      officialId,
      score,
      netScore,
      totalSignals: signals.length,
      positiveCount,
      negativeCount,
      neutralCount,
      marginOfError,
      velocity,
    },
    update: {
      score,
      netScore,
      totalSignals: signals.length,
      positiveCount,
      negativeCount,
      neutralCount,
      marginOfError,
      velocity,
    },
  });

  // Record history point
  if (existing) {
    await prisma.approvalHistory.create({
      data: {
        approvalId: existing.id,
        score,
        netScore,
        signalType: "aggregation_cron",
      },
    });
  }
}
