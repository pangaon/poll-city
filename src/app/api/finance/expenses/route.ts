import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { FinanceExpenseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  budgetLineId: z.string().nullish(),
  vendorId: z.string().nullish(),
  purchaseRequestId: z.string().nullish(),
  purchaseOrderId: z.string().nullish(),
  printJobId: z.string().nullish(),
  signId: z.string().nullish(),
  eventId: z.string().nullish(),
  reimbursementId: z.string().nullish(),
  amount: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default("CAD"),
  expenseDate: z.string(),
  description: z.string().min(1).max(500),
  notes: z.string().max(2000).nullish(),
  paymentMethod: z.enum(["cash", "cheque", "credit_card", "debit", "etransfer", "wire", "invoice", "other"]).nullish(),
  sourceType: z.enum(["manual", "import", "purchase_order", "vendor_bill", "volunteer_expense", "reimbursement", "print_order", "sign_order", "event", "recurring"]).default("manual"),
  externalReference: z.string().max(200).nullish(),
  receiptAssetId: z.string().nullish(),
  invoiceAssetId: z.string().nullish(),
  isRecurring: z.boolean().default(false),
  missingReceipt: z.boolean().default(false),
  splitLines: z.array(z.object({
    budgetLineId: z.string(),
    amount: z.number().positive(),
    notes: z.string().nullish(),
  })).max(20).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = p.get("status");
  const budgetLineId = p.get("budgetLineId");
  const vendorId = p.get("vendorId");
  const from = p.get("from");
  const to = p.get("to");
  const q = p.get("q");
  const limit = Math.min(Number(p.get("limit") ?? 50), 200);
  const offset = Number(p.get("offset") ?? 0);

  const expenses = await prisma.financeExpense.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { expenseStatus: status as FinanceExpenseStatus } : {}),
      ...(budgetLineId ? { budgetLineId } : {}),
      ...(vendorId ? { vendorId } : {}),
      ...(from || to ? {
        expenseDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
      ...(q ? {
        OR: [
          { description: { contains: q, mode: "insensitive" as const } },
          { notes: { contains: q, mode: "insensitive" as const } },
          { vendor: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      } : {}),
    },
    include: {
      vendor: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true, category: true } },
      enteredBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      splitLines: true,
    },
    orderBy: { expenseDate: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await prisma.financeExpense.count({
    where: { campaignId, deletedAt: null },
  });

  return NextResponse.json({ data: expenses, total });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify budget line belongs to this campaign
  if (body.budgetLineId) {
    const line = await prisma.budgetLine.findUnique({
      where: { id: body.budgetLineId },
      select: { campaignId: true, isLocked: true },
    });
    if (!line || line.campaignId !== body.campaignId) {
      return NextResponse.json({ error: "Budget line not found" }, { status: 400 });
    }
    if (line.isLocked) {
      return NextResponse.json({ error: "Budget line is locked" }, { status: 409 });
    }
  }

  const isSplit = (body.splitLines?.length ?? 0) > 0;

  try {
    const expense = await prisma.financeExpense.create({
      data: {
        campaignId: body.campaignId,
        budgetLineId: body.budgetLineId ?? null,
        vendorId: body.vendorId ?? null,
        purchaseRequestId: body.purchaseRequestId ?? null,
        purchaseOrderId: body.purchaseOrderId ?? null,
        printJobId: body.printJobId ?? null,
        signId: body.signId ?? null,
        eventId: body.eventId ?? null,
        reimbursementId: body.reimbursementId ?? null,
        amount: body.amount,
        taxAmount: body.taxAmount,
        currency: body.currency,
        expenseDate: new Date(body.expenseDate),
        description: body.description.trim(),
        notes: body.notes?.trim() ?? null,
        paymentMethod: body.paymentMethod ?? null,
        sourceType: body.sourceType,
        externalReference: body.externalReference?.trim() ?? null,
        receiptAssetId: body.receiptAssetId ?? null,
        invoiceAssetId: body.invoiceAssetId ?? null,
        isSplit,
        isRecurring: body.isRecurring,
        missingReceipt: body.missingReceipt,
        enteredByUserId: session!.user.id,
      },
    });

    // Create split lines if provided
    if (isSplit && body.splitLines) {
      await prisma.financeExpenseSplit.createMany({
        data: body.splitLines.map((sl) => ({
          expenseId: expense.id,
          budgetLineId: sl.budgetLineId,
          amount: sl.amount,
          notes: sl.notes?.trim() ?? null,
        })),
      });
    }

    // Update budget line actual amount
    if (body.budgetLineId) {
      await prisma.budgetLine.update({
        where: { id: body.budgetLineId },
        data: { actualAmount: { increment: body.amount } },
      });
    }

    await logFinanceAudit({
      campaignId: body.campaignId,
      entityType: "FinanceExpense",
      entityId: expense.id,
      action: "created",
      newValue: { amount: body.amount, description: body.description, expenseStatus: expense.expenseStatus },
      actorUserId: session!.user.id,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (e) {
    console.error("[finance/expenses/create]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
