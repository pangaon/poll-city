import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    allTimeTotals,
    monthTotals,
    yearTotals,
    last30Totals,
    donorCount,
    newDonorsLast30,
    activePlans,
    pendingReceipts,
    pendingCompliance,
    pendingRefunds,
    statusCounts,
    topSources,
    initiativeProgress,
  ] = await Promise.all([
    // All-time raised
    prisma.donation.aggregate({
      where: { campaignId: campaignId!, status: { notIn: ["cancelled", "failed"] }, deletedAt: null },
      _sum: { amount: true, netAmount: true, feeAmount: true, refundedAmount: true },
      _count: { id: true },
    }),
    // This month
    prisma.donation.aggregate({
      where: { campaignId: campaignId!, status: { notIn: ["cancelled", "failed"] }, deletedAt: null, donationDate: { gte: monthStart } },
      _sum: { amount: true, netAmount: true },
      _count: { id: true },
    }),
    // This year
    prisma.donation.aggregate({
      where: { campaignId: campaignId!, status: { notIn: ["cancelled", "failed"] }, deletedAt: null, donationDate: { gte: yearStart } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Last 30 days
    prisma.donation.aggregate({
      where: { campaignId: campaignId!, status: { notIn: ["cancelled", "failed"] }, deletedAt: null, donationDate: { gte: last30 } },
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    }),
    // Unique donor count (all time)
    prisma.donorProfile.count({ where: { campaignId: campaignId! } }),
    // New donors last 30 days
    prisma.donorProfile.count({
      where: { campaignId: campaignId!, firstDonationDate: { gte: last30 } },
    }),
    // Active recurring plans + MRR
    prisma.recurrencePlan.findMany({
      where: { campaignId: campaignId!, status: "active" },
      select: { frequency: true, amount: true },
    }),
    // Pending receipts
    prisma.donationReceipt.count({
      where: { campaignId: campaignId!, receiptStatus: { in: ["pending", "failed"] } },
    }),
    // Compliance review queue
    prisma.donation.count({
      where: { campaignId: campaignId!, complianceStatus: { in: ["flagged", "over_limit"] }, deletedAt: null },
    }),
    // Pending refunds
    prisma.refund.count({
      where: { campaignId: campaignId!, status: { in: ["pending", "approved"] } },
    }),
    // Status breakdown
    prisma.donation.groupBy({
      by: ["status"],
      where: { campaignId: campaignId!, deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    }),
    // Top sources (last 30 days)
    prisma.donation.groupBy({
      by: ["sourceId"],
      where: { campaignId: campaignId!, status: { notIn: ["cancelled", "failed"] }, deletedAt: null, donationDate: { gte: last30 }, sourceId: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    // Active fundraising initiatives
    prisma.fundraisingCampaign.findMany({
      where: { campaignId: campaignId!, status: "active", deletedAt: null },
      select: { id: true, name: true, goalAmount: true, raisedAmount: true, donorCount: true, endDate: true },
      take: 5,
    }),
  ]);

  // Compute MRR from active recurring plans
  const mrr = activePlans.reduce((sum, plan) => {
    const monthly =
      plan.frequency === "weekly" ? plan.amount * 4.33
      : plan.frequency === "biweekly" ? plan.amount * 2.17
      : plan.frequency === "monthly" ? plan.amount
      : plan.frequency === "quarterly" ? plan.amount / 3
      : plan.frequency === "annually" ? plan.amount / 12
      : 0;
    return sum + monthly;
  }, 0);

  const totalRaised = allTimeTotals._sum.amount ?? 0;
  const totalNet = allTimeTotals._sum.netAmount ?? 0;
  const totalFees = allTimeTotals._sum.feeAmount ?? 0;
  const totalRefunded = allTimeTotals._sum.refundedAmount ?? 0;
  const donationCount = allTimeTotals._count.id;
  const avgGift = donationCount > 0 ? totalRaised / donationCount : 0;

  // Resolve source names for top sources
  const sourceIds = topSources.map((s) => s.sourceId).filter(Boolean) as string[];
  const sourceNames = await prisma.donationSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, name: true },
  });
  const sourceNameMap = Object.fromEntries(sourceNames.map((s) => [s.id, s.name]));

  return NextResponse.json({
    data: {
      allTime: {
        raised: totalRaised,
        net: totalNet,
        fees: totalFees,
        refunded: totalRefunded,
        count: donationCount,
        avgGift,
      },
      thisMonth: {
        raised: monthTotals._sum.amount ?? 0,
        net: monthTotals._sum.netAmount ?? 0,
        count: monthTotals._count.id,
      },
      thisYear: {
        raised: yearTotals._sum.amount ?? 0,
        count: yearTotals._count.id,
      },
      last30Days: {
        raised: last30Totals._sum.amount ?? 0,
        count: last30Totals._count.id,
        avgGift: last30Totals._avg.amount ?? 0,
      },
      donors: {
        total: donorCount,
        newLast30: newDonorsLast30,
      },
      recurring: {
        activePlans: activePlans.length,
        mrr: Math.round(mrr * 100) / 100,
      },
      queues: {
        pendingReceipts,
        pendingCompliance,
        pendingRefunds,
      },
      byStatus: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
        amount: s._sum.amount ?? 0,
      })),
      topSources: topSources.map((s) => ({
        sourceId: s.sourceId,
        name: sourceNameMap[s.sourceId!] ?? "Unknown",
        amount: s._sum.amount ?? 0,
        count: s._count.id,
      })),
      initiatives: initiativeProgress,
    },
  });
}
