import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const expense = await prisma.financeExpense.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: expense.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  // Reverse budget line actual amount on rejection
  if (expense.budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: expense.budgetLineId },
      data: { actualAmount: { decrement: Number(expense.amount) } },
    });
  }

  const updated = await prisma.financeExpense.update({
    where: { id: params.id },
    data: {
      expenseStatus: "rejected",
      notes: expense.notes
        ? `${expense.notes}\n\nRejection reason: ${parsed.data.reason}`
        : `Rejection reason: ${parsed.data.reason}`,
    },
  });

  await logFinanceAudit({
    campaignId: expense.campaignId,
    entityType: "FinanceExpense",
    entityId: params.id,
    action: "rejected",
    newValue: { reason: parsed.data.reason },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
