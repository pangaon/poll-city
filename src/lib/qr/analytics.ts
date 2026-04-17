import prisma from "@/lib/db/prisma";
import type { QrAnalyticsOverview } from "./types";

export async function getQrAnalytics(
  campaignId: string,
  opts: { qrCodeId?: string; days?: number } = {},
): Promise<QrAnalyticsOverview> {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const baseWhere = {
    campaignId,
    createdAt: { gte: since },
    ...(opts.qrCodeId ? { qrCodeId: opts.qrCodeId } : {}),
  };

  const [totalScans, uniqueSessions, conversions, prospects, signOpps] = await Promise.all([
    prisma.qrScan.count({ where: baseWhere }),
    prisma.qrScan.groupBy({
      by: ["sessionToken"],
      where: { ...baseWhere, sessionToken: { not: null } },
      _count: true,
    }),
    prisma.qrScan.count({
      where: { ...baseWhere, conversionStage: "converted" },
    }),
    prisma.qrProspect.groupBy({
      by: ["prospectType"],
      where: { campaignId, createdAt: { gte: since } },
      _count: true,
    }),
    prisma.qrSignOpportunity.count({
      where: { campaignId, createdAt: { gte: since } },
    }),
  ]);

  const uniqueScans = uniqueSessions.length;
  const conversionRate =
    uniqueScans > 0 ? Math.round((conversions / uniqueScans) * 1000) / 10 : 0;

  const volunteerLeads = prospects.find((p) => p.prospectType === "volunteer_lead")?._count ?? 0;
  const updateSubscribers =
    prospects.find((p) => p.prospectType === "update_subscriber")?._count ?? 0;

  // Daily scan buckets
  const dailyScans = await prisma.qrScan.groupBy({
    by: ["createdAt"],
    where: baseWhere,
    _count: true,
  });

  const scansByDayMap = new Map<string, number>();
  for (const row of dailyScans) {
    const day = row.createdAt.toISOString().slice(0, 10);
    scansByDayMap.set(day, (scansByDayMap.get(day) ?? 0) + row._count);
  }
  const scansByDay = Array.from(scansByDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Scans by intent
  const intentGroups = await prisma.qrScan.groupBy({
    by: ["intent"],
    where: { ...baseWhere, intent: { not: null } },
    _count: true,
    orderBy: { _count: { intent: "desc" } },
  });
  const scansByIntent = intentGroups.map((g) => ({
    intent: g.intent ?? "unknown",
    count: g._count,
  }));

  // Top QR codes by scan volume
  const topCodeScans = await prisma.qrScan.groupBy({
    by: ["qrCodeId"],
    where: baseWhere,
    _count: true,
    orderBy: { _count: { qrCodeId: "desc" } },
    take: 10,
  });

  const topCodeIds = topCodeScans.map((r) => r.qrCodeId);
  const topCodes = await prisma.qrCode.findMany({
    where: { id: { in: topCodeIds } },
    select: { id: true, label: true },
  });
  const codeMap = new Map(topCodes.map((c) => [c.id, c.label]));

  const conversionsByCode = await prisma.qrScan.groupBy({
    by: ["qrCodeId"],
    where: { ...baseWhere, conversionStage: "converted", qrCodeId: { in: topCodeIds } },
    _count: true,
  });
  const convMap = new Map(conversionsByCode.map((r) => [r.qrCodeId, r._count]));

  const topQrCodes = topCodeScans.map((r) => ({
    qrCodeId: r.qrCodeId,
    label: codeMap.get(r.qrCodeId) ?? r.qrCodeId,
    scans: r._count,
    conversions: convMap.get(r.qrCodeId) ?? 0,
  }));

  // Placement type breakdown (from QrCode meta)
  const placementCodes = await prisma.qrCode.findMany({
    where: {
      campaignId,
      placementType: { not: null },
    },
    select: { id: true, placementType: true },
  });
  const placementMap = new Map(placementCodes.map((c) => [c.id, c.placementType]));
  const placementCountMap = new Map<string, number>();
  for (const row of topCodeScans) {
    const placement = placementMap.get(row.qrCodeId) ?? "other";
    placementCountMap.set(placement, (placementCountMap.get(placement) ?? 0) + row._count);
  }
  const scansByPlacement = Array.from(placementCountMap.entries()).map(([placement, count]) => ({
    placement,
    count,
  }));

  return {
    totalScans,
    uniqueScans,
    conversions,
    conversionRate,
    signRequests: signOpps,
    volunteerLeads,
    updateSubscribers,
    scansByDay,
    scansByPlacement,
    scansByIntent,
    topQrCodes,
  };
}
