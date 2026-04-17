import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const expense = await prisma.financeExpense.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: expense.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (!["submitted", "needs_review"].includes(expense.expenseStatus)) {
    return NextResponse.json({ error: "Expense must be submitted or needs_review to approve" }, { status: 409 });
  }

  const updated = await prisma.financeExpense.update({
    where: { id: params.id },
    data: { expenseStatus: "approved", approvedByUserId: session!.user.id },
  });

  await logFinanceAudit({
    campaignId: expense.campaignId,
    entityType: "FinanceExpense",
    entityId: params.id,
    action: "approved",
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
