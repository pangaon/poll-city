import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    budgets,
    expenseAgg,
    pendingApprovals,
    missingReceipts,
    unpaidBills,
    openPRs,
  ] = await Promise.all([
    prisma.campaignBudget.findMany({
      where: { campaignId, status: { in: ["active", "draft"] } },
      include: {
        budgetLines: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            category: true,
            plannedAmount: true,
            committedAmount: true,
            actualAmount: true,
            warningThresholdPct: true,
          },
        },
      },
    }),
    prisma.financeExpense.aggregate({
      where: { campaignId, deletedAt: null },
      _sum: { amount: true, taxAmount: true },
      _count: true,
    }),
    prisma.financeExpense.count({
      where: { campaignId, expenseStatus: { in: ["submitted", "needs_review"] }, deletedAt: null },
    }),
    prisma.financeExpense.count({
      where: { campaignId, missingReceipt: true, expenseStatus: { notIn: ["rejected", "archived"] }, deletedAt: null },
    }),
    prisma.financeVendorBill.aggregate({
      where: { campaignId, status: { in: ["received", "approved", "overdue"] }, deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financePurchaseRequest.count({
      where: { campaignId, requestStatus: "submitted", deletedAt: null },
    }),
  ]);

  // Build category summary from budget lines
  const categoryMap = new Map<string, { planned: number; committed: number; actual: number }>();
  for (const budget of budgets) {
    for (const line of budget.budgetLines) {
      const cat = line.category;
      const existing = categoryMap.get(cat) ?? { planned: 0, committed: 0, actual: 0 };
      categoryMap.set(cat, {
        planned: existing.planned + Number(line.plannedAmount),
        committed: existing.committed + Number(line.committedAmount),
        actual: existing.actual + Number(line.actualAmount),
      });
    }
  }

  const totalPlanned = budgets.reduce((s, b) => s + Number(b.totalBudget), 0);
  const totalActual = Number(expenseAgg._sum.amount ?? 0);
  const totalCommitted = Array.from(categoryMap.values()).reduce((s, v) => s + v.committed, 0);

  // At-risk categories: actual + committed > planned * warningThreshold
  const atRiskLines = budgets
    .flatMap((b) => b.budgetLines)
    .filter((line) => {
      const spent = Number(line.actualAmount) + Number(line.committedAmount);
      return spent > Number(line.plannedAmount) * line.warningThresholdPct;
    })
    .map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category,
      planned: Number(line.plannedAmount),
      committed: Number(line.committedAmount),
      actual: Number(line.actualAmount),
      utilizationPct: Number(line.plannedAmount) > 0
        ? (Number(line.actualAmount) + Number(line.committedAmount)) / Number(line.plannedAmount)
        : 0,
    }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  return NextResponse.json({
    data: {
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        totalBudget: Number(b.totalBudget),
        currency: b.currency,
      })),
      summary: {
        totalPlanned,
        totalCommitted,
        totalActual,
        remaining: totalPlanned - totalActual,
        utilizationPct: totalPlanned > 0 ? totalActual / totalPlanned : 0,
      },
      categories: Object.fromEntries(categoryMap),
      atRiskLines,
      alerts: {
        pendingApprovals,
        missingReceipts,
        unpaidBillsCount: unpaidBills._count,
        unpaidBillsAmount: Number(unpaidBills._sum.amount ?? 0),
        openPurchaseRequests: openPRs,
      },
    },
  });
}
