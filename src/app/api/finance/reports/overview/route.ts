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
  if (!["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const [
    budgets,
    allExpenses,
    pendingApprovals,
    missingReceipts,
    unpaidBills,
    openPRs,
    recentExpenses,
  ] = await Promise.all([
    prisma.campaignBudget.findMany({
      where: { campaignId, status: { in: ["active", "draft"] } },
      include: {
        budgetLines: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            plannedAmount: true,
            committedAmount: true,
            actualAmount: true,
            warningThresholdPct: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    // All approved/paid expenses for monthly burn chart
    prisma.financeExpense.findMany({
      where: {
        campaignId,
        deletedAt: null,
        expenseStatus: { in: ["approved", "paid"] },
      },
      select: { expenseDate: true, amount: true },
      orderBy: { expenseDate: "asc" },
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
    prisma.financeExpense.findMany({
      where: { campaignId, deletedAt: null },
      select: {
        id: true,
        description: true,
        amount: true,
        expenseDate: true,
        expenseStatus: true,
        budgetLine: { select: { category: true } },
      },
      orderBy: { expenseDate: "desc" },
      take: 6,
    }),
  ]);

  // ── Per-line variance table ───────────────────────────────────────────────
  // FINANCE role cannot see staffing lines (salary privacy)
  const allLinesRaw = budgets.flatMap((b) => b.budgetLines);
  const allLines = membership.role === "FINANCE"
    ? allLinesRaw.filter((l) => l.category !== "staffing")
    : allLinesRaw;
  const varianceLines = allLines
    .filter((l) => Number(l.plannedAmount) > 0)
    .map((line) => {
      const planned = Number(line.plannedAmount);
      const committed = Number(line.committedAmount);
      const actual = Number(line.actualAmount);
      const total = actual + committed;
      const variance = planned - total;
      const variancePct = planned > 0 ? total / planned : 0;
      const status =
        variancePct > 1.0 ? "over" :
        variancePct >= line.warningThresholdPct ? "warning" :
        "ok";
      return {
        id: line.id,
        code: line.code ?? "",
        name: line.name,
        category: line.category,
        planned,
        committed,
        actual,
        variance,
        variancePct,
        status,
      };
    })
    .sort((a, b) => b.variancePct - a.variancePct);

  // ── Category summary ─────────────────────────────────────────────────────
  const categoryMap = new Map<string, { planned: number; committed: number; actual: number }>();
  for (const line of allLines) {
    const cat = String(line.category);
    const existing = categoryMap.get(cat) ?? { planned: 0, committed: 0, actual: 0 };
    categoryMap.set(cat, {
      planned: existing.planned + Number(line.plannedAmount),
      committed: existing.committed + Number(line.committedAmount),
      actual: existing.actual + Number(line.actualAmount),
    });
  }
  const byCategory = Array.from(categoryMap.entries())
    .filter(([, v]) => v.planned > 0)
    .map(([category, v]) => ({
      category,
      planned: v.planned,
      committed: v.committed,
      actual: v.actual,
      pct: v.planned > 0 ? ((v.actual + v.committed) / v.planned) * 100 : 0,
    }))
    .sort((a, b) => b.actual - a.actual);

  // ── Monthly burn chart ────────────────────────────────────────────────────
  const monthlyMap = new Map<string, number>();
  for (const e of allExpenses) {
    const key = e.expenseDate.toISOString().slice(0, 7); // YYYY-MM
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(e.amount));
  }
  // Fill months from budget start to today (even if $0 spend)
  const budget = budgets[0];
  const startMonth = budget?.startDate
    ? budget.startDate.toISOString().slice(0, 7)
    : new Date().toISOString().slice(0, 7);
  const endMonth = new Date().toISOString().slice(0, 7);
  const monthlyBurn: Array<{ month: string; amount: number; cumulative: number }> = [];
  let cumulative = 0;
  let cur = startMonth;
  while (cur <= endMonth) {
    const amount = monthlyMap.get(cur) ?? 0;
    cumulative += amount;
    monthlyBurn.push({ month: cur, amount, cumulative });
    const [y, m] = cur.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    cur = next;
  }

  // ── Top-level summary ────────────────────────────────────────────────────
  const totalPlanned = budgets.reduce((s, b) => s + Number(b.totalBudget), 0);
  const totalActual = allLines.reduce((s, l) => s + Number(l.actualAmount), 0);
  const totalCommitted = allLines.reduce((s, l) => s + Number(l.committedAmount), 0);

  // At-risk lines (>= warning threshold)
  const atRiskLines = varianceLines
    .filter((l) => l.status !== "ok")
    .slice(0, 8);

  return NextResponse.json({
    data: {
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        totalBudget: Number(b.totalBudget),
        currency: b.currency,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
      summary: {
        totalPlanned,
        totalCommitted,
        totalActual,
        remaining: totalPlanned - totalActual - totalCommitted,
        burnPct: totalPlanned > 0 ? totalActual / totalPlanned : 0,
        commitPct: totalPlanned > 0 ? totalCommitted / totalPlanned : 0,
        utilizationPct: totalPlanned > 0 ? (totalActual + totalCommitted) / totalPlanned : 0,
      },
      byCategory,
      atRiskLines, // top 8 lines at or over warning threshold
      monthlyBurn,
      alerts: {
        pendingApprovals,
        missingReceipts,
        unpaidBillsCount: unpaidBills._count,
        unpaidBillsAmount: Number(unpaidBills._sum.amount ?? 0),
        openPurchaseRequests: openPRs,
      },
      recentExpenses: recentExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expenseDate.toISOString(),
        expenseStatus: e.expenseStatus,
        category: e.budgetLine?.category ?? "other",
      })),
    },
  });
}
