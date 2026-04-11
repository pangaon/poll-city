import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "budget:read");
  if (forbidden) return forbidden;
  const cid = campaignId!;

  // ── Fetch all three data sources in parallel ─────────────────────────────
  const [budgets, expenseAgg, donationRows] = await Promise.all([
    // Budget totals (active + draft)
    prisma.campaignBudget.findMany({
      where: { campaignId: cid, status: { in: ["active", "draft"] } },
      select: { totalBudget: true },
    }),

    // Expense totals — paid/approved only (hard spend)
    prisma.financeExpense.aggregate({
      where: {
        campaignId: cid,
        deletedAt: null,
        expenseStatus: { in: ["approved", "paid"] },
      },
      _sum: { amount: true, taxAmount: true },
    }),

    // Donations grouped by status — excludes deleted + failed/cancelled/refunded
    prisma.donation.findMany({
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["failed", "cancelled", "refunded"] },
      },
      select: {
        status: true,
        amount: true,
        refundedAmount: true,
        donationType: true,
      },
    }),
  ]);

  // ── Budget total ─────────────────────────────────────────────────────────
  const totalBudget = budgets.reduce((s, b) => s + Number(b.totalBudget), 0);

  // ── Expenses ─────────────────────────────────────────────────────────────
  const totalSpent = Number(expenseAgg._sum.amount ?? 0);
  const totalTax = Number(expenseAgg._sum.taxAmount ?? 0);

  // ── Donations ────────────────────────────────────────────────────────────
  // "Raised" = confirmed money: processed, receipted, partially_refunded
  const confirmedStatuses = new Set(["processed", "receipted", "partially_refunded"]);
  // "Pledged" = promised but not yet processed
  const pledgedStatuses = new Set(["pledged", "processing"]);

  let totalRaised = 0;
  let totalPledged = 0;
  let totalRefunded = 0;

  const byType = new Map<
    string,
    { raised: number; pledged: number; count: number }
  >();

  for (const d of donationRows) {
    const net = d.amount - d.refundedAmount;
    const type = d.donationType as string;

    if (!byType.has(type)) byType.set(type, { raised: 0, pledged: 0, count: 0 });
    const bucket = byType.get(type)!;
    bucket.count += 1;

    if (confirmedStatuses.has(d.status as string)) {
      totalRaised += net;
      bucket.raised += net;
      totalRefunded += d.refundedAmount;
    } else if (pledgedStatuses.has(d.status as string)) {
      totalPledged += d.amount;
      bucket.pledged += d.amount;
    }
  }

  // ── Derived positions ────────────────────────────────────────────────────
  // Net cash position: what actually came in minus what actually went out
  const netPosition = totalRaised - totalSpent;
  // Budget headroom: budgeted amount still available after confirmed spend
  const budgetRemaining = totalBudget - totalSpent;
  // Gap: how much more we need to raise to cover the budget
  const fundingGap = totalBudget - totalRaised;

  const byDonationType = Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.raised - a.raised);

  return NextResponse.json({
    data: {
      totalBudget,
      totalSpent,
      totalTax,
      totalRaised,
      totalPledged,
      totalRefunded,
      netPosition,
      budgetRemaining,
      fundingGap,
      donationCount: donationRows.length,
      byDonationType,
    },
  });
}
