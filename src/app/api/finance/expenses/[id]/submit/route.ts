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
  if (expense.enteredByUserId !== session!.user.id && !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Can only submit your own expenses" }, { status: 403 });
  }
  if (expense.expenseStatus !== "draft") {
    return NextResponse.json({ error: "Only draft expenses can be submitted" }, { status: 409 });
  }

  const updated = await prisma.financeExpense.update({
    where: { id: params.id },
    data: { expenseStatus: "submitted" },
  });

  await logFinanceAudit({
    campaignId: expense.campaignId,
    entityType: "FinanceExpense",
    entityId: params.id,
    action: "submitted",
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
