import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

async function getExpenseWithAuth(id: string, userId: string) {
  const expense = await prisma.financeExpense.findUnique({
    where: { id, deletedAt: null },
    include: {
      vendor: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true, category: true } },
      splitLines: true,
      receiptAsset: { select: { id: true, fileName: true, fileUrl: true } },
      invoiceAsset: { select: { id: true, fileName: true, fileUrl: true } },
      enteredBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
  if (!expense) return { expense: null, membership: null };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: expense.campaignId } },
  });
  return { expense, membership };
}

const updateSchema = z.object({
  budgetLineId: z.string().nullish(),
  vendorId: z.string().nullish(),
  amount: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  expenseDate: z.string().optional(),
  description: z.string().min(1).max(500).optional(),
  notes: z.string().max(2000).nullish(),
  paymentMethod: z.enum(["cash", "cheque", "credit_card", "debit", "etransfer", "wire", "invoice", "other"]).nullish(),
  receiptAssetId: z.string().nullish(),
  invoiceAssetId: z.string().nullish(),
  missingReceipt: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { expense, membership } = await getExpenseWithAuth(params.id, session!.user.id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: expense });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { expense, membership } = await getExpenseWithAuth(params.id, session!.user.id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["draft", "needs_review"].includes(expense.expenseStatus)) {
    const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role);
    if (!isManager) {
      return NextResponse.json({ error: "Cannot edit expense in status: " + expense.expenseStatus }, { status: 409 });
    }
  }

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const oldValue = { amount: Number(expense.amount), expenseStatus: expense.expenseStatus };

  // If amount changing and has budget line, adjust actual amount on the line
  if (body.amount !== undefined && expense.budgetLineId) {
    const delta = body.amount - Number(expense.amount);
    if (delta !== 0) {
      await prisma.budgetLine.update({
        where: { id: expense.budgetLineId },
        data: { actualAmount: { increment: delta } },
      });
    }
  }

  const updated = await prisma.financeExpense.update({
    where: { id: params.id },
    data: {
      ...(body.budgetLineId !== undefined ? { budgetLineId: body.budgetLineId } : {}),
      ...(body.vendorId !== undefined ? { vendorId: body.vendorId } : {}),
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.taxAmount !== undefined ? { taxAmount: body.taxAmount } : {}),
      ...(body.expenseDate ? { expenseDate: new Date(body.expenseDate) } : {}),
      ...(body.description ? { description: sanitizeUserText(body.description) ?? "" } : {}),
      ...(body.notes !== undefined ? { notes: sanitizeUserText(body.notes) } : {}),
      ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
      ...(body.receiptAssetId !== undefined ? { receiptAssetId: body.receiptAssetId } : {}),
      ...(body.invoiceAssetId !== undefined ? { invoiceAssetId: body.invoiceAssetId } : {}),
      ...(body.missingReceipt !== undefined ? { missingReceipt: body.missingReceipt } : {}),
    },
  });

  await logFinanceAudit({
    campaignId: expense.campaignId,
    entityType: "FinanceExpense",
    entityId: params.id,
    action: "updated",
    oldValue: oldValue as Record<string, unknown>,
    newValue: { amount: Number(updated.amount), expenseStatus: updated.expenseStatus },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { expense, membership } = await getExpenseWithAuth(params.id, session!.user.id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (expense.expenseStatus === "paid") {
    return NextResponse.json({ error: "Cannot delete a paid expense" }, { status: 409 });
  }

  // Reverse budget line actual amount
  if (expense.budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: expense.budgetLineId },
      data: { actualAmount: { decrement: Number(expense.amount) } },
    });
  }

  await prisma.financeExpense.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logFinanceAudit({
    campaignId: expense.campaignId,
    entityType: "FinanceExpense",
    entityId: params.id,
    action: "deleted",
    oldValue: { amount: Number(expense.amount), description: expense.description },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: { id: params.id } });
}
