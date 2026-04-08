/**
 * GET /api/analytics/donations — Donation analytics and compliance tracking.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "donations:read");
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId") || (session.user.activeCampaignId as string);
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { spendingLimit: true },
  });

  const [donations, expenses, recentDonations] = await Promise.all([
    prisma.donation.aggregate({ where: { campaignId }, _sum: { amount: true }, _count: true, _avg: { amount: true } }),
    prisma.budgetItem.aggregate({ where: { campaignId, itemType: "expense" }, _sum: { amount: true }, _count: true }),
    prisma.donation.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { amount: true, createdAt: true, method: true },
    }),
  ]);

  const donationTotal = Number(donations._sum.amount ?? 0);
  const expenseTotal = Number(expenses._sum.amount ?? 0);
  const spendingLimit = campaign?.spendingLimit ?? 25000;
  const remaining = spendingLimit - expenseTotal;

  // Monthly trend
  const allDonations = await prisma.donation.findMany({
    where: { campaignId },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyTrend: Record<string, number> = {};
  for (const d of allDonations) {
    const month = d.createdAt.toISOString().slice(0, 7);
    monthlyTrend[month] = (monthlyTrend[month] ?? 0) + Number(d.amount);
  }

  return NextResponse.json({
    summary: {
      donationTotal: Math.round(donationTotal),
      donationCount: donations._count,
      avgDonation: Math.round(Number(donations._avg.amount ?? 0)),
      expenseTotal: Math.round(expenseTotal),
      expenseCount: expenses._count,
      spendingLimit,
      remaining: Math.round(remaining),
      utilizationPct: spendingLimit > 0 ? Math.round((expenseTotal / spendingLimit) * 100) : 0,
      netCash: Math.round(donationTotal - expenseTotal),
    },
    recentDonations,
    monthlyTrend: Object.entries(monthlyTrend).map(([month, total]) => ({ month, total: Math.round(total) })),
  });
}
