import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

// Unified approval queue — returns all pending items that need a decision
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const [pendingExpenses, pendingPRs, pendingReimbursements] = await Promise.all([
    prisma.financeExpense.findMany({
      where: { campaignId, expenseStatus: { in: ["submitted", "needs_review"] }, deletedAt: null },
      include: {
        enteredBy: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        budgetLine: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financePurchaseRequest.findMany({
      where: { campaignId, requestStatus: "submitted", deletedAt: null },
      include: {
        requestedBy: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        budgetLine: { select: { id: true, name: true } },
      },
      orderBy: [{ urgency: "desc" }, { requestedDate: "asc" }],
    }),
    prisma.financeReimbursement.findMany({
      where: { campaignId, status: "submitted", deletedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        budgetLine: { select: { id: true, name: true } },
      },
      orderBy: { submittedDate: "asc" },
    }),
  ]);

  const queue = [
    ...pendingExpenses.map((e) => ({
      type: "expense" as const,
      id: e.id,
      title: e.description,
      amount: Number(e.amount),
      submittedBy: e.enteredBy,
      submittedAt: e.updatedAt,
      urgency: "normal",
      budgetLine: e.budgetLine,
      vendor: e.vendor,
    })),
    ...pendingPRs.map((pr) => ({
      type: "purchase_request" as const,
      id: pr.id,
      title: pr.title,
      amount: Number(pr.requestedAmount),
      submittedBy: pr.requestedBy,
      submittedAt: pr.requestedDate,
      urgency: pr.urgency,
      budgetLine: pr.budgetLine,
      vendor: pr.vendor,
    })),
    ...pendingReimbursements.map((r) => ({
      type: "reimbursement" as const,
      id: r.id,
      title: r.title,
      amount: Number(r.amountRequested),
      submittedBy: r.user,
      submittedAt: r.submittedDate,
      urgency: "normal",
      budgetLine: r.budgetLine,
      vendor: null,
    })),
  ].sort((a, b) => {
    // Sort urgent PRs first, then by submission date
    const urgencyOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const aU = urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 2;
    const bU = urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 2;
    if (aU !== bU) return aU - bU;
    const aT = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bT = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return aT - bT;
  });

  return NextResponse.json({
    data: queue,
    summary: {
      total: queue.length,
      expenses: pendingExpenses.length,
      purchaseRequests: pendingPRs.length,
      reimbursements: pendingReimbursements.length,
    },
  });
}
