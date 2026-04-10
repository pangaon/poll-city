import prisma from "@/lib/db/prisma";
import { FinanceBudgetLineCategory, FinanceSourceType } from "@prisma/client";
import { logFinanceAudit } from "./audit";

// Sign-type products map to the "signs" budget line category; all others map to "print"
const SIGN_PRODUCT_TYPES = new Set([
  "lawn_sign",
  "window_sign",
  "yard_stake",
  "banner",
]);

export function budgetCategoryForProduct(
  productType: string
): FinanceBudgetLineCategory {
  return SIGN_PRODUCT_TYPES.has(productType)
    ? FinanceBudgetLineCategory.signs
    : FinanceBudgetLineCategory.print;
}

/**
 * Find the first active, non-locked budget line for the given category.
 * Returns null if no matching line exists — expense is still created, just unassigned.
 */
export async function findPrintBudgetLine(
  campaignId: string,
  category: FinanceBudgetLineCategory
): Promise<string | null> {
  const line = await prisma.budgetLine.findFirst({
    where: { campaignId, category, isActive: true, isLocked: false },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  return line?.id ?? null;
}

/**
 * Check whether an auto-generated print expense already exists for a given
 * external reference key (used to prevent double-posting).
 *
 * Key convention:
 *   PrintOrder  → externalReference = "printorder:{orderId}"
 *   PrintJob    → printJobId = jobId
 */
export async function printExpenseExists(opts: {
  campaignId: string;
  externalReference?: string;
  printJobId?: string;
}): Promise<boolean> {
  const expense = await prisma.financeExpense.findFirst({
    where: {
      campaignId: opts.campaignId,
      deletedAt: null,
      ...(opts.externalReference
        ? { externalReference: opts.externalReference }
        : {}),
      ...(opts.printJobId ? { printJobId: opts.printJobId } : {}),
    },
    select: { id: true },
  });
  return expense !== null;
}

export interface PostPrintExpenseInput {
  campaignId: string;
  amount: number;
  description: string;
  sourceType: FinanceSourceType;
  budgetLineId?: string | null;
  printJobId?: string | null;
  externalReference?: string | null;
  userId: string;
}

/**
 * Create a FinanceExpense and increment the budget line's actualAmount.
 * Caller must perform idempotency check via printExpenseExists() first.
 */
export async function postPrintExpense(
  input: PostPrintExpenseInput
): Promise<void> {
  const expense = await prisma.financeExpense.create({
    data: {
      campaignId: input.campaignId,
      budgetLineId: input.budgetLineId ?? null,
      printJobId: input.printJobId ?? null,
      amount: input.amount,
      taxAmount: 0,
      currency: "CAD",
      expenseDate: new Date(),
      description: input.description,
      sourceType: input.sourceType,
      externalReference: input.externalReference ?? null,
      isSplit: false,
      isRecurring: false,
      missingReceipt: false,
      enteredByUserId: input.userId,
    },
  });

  if (input.budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: input.budgetLineId },
      data: { actualAmount: { increment: input.amount } },
    });
  }

  await logFinanceAudit({
    campaignId: input.campaignId,
    entityType: "FinanceExpense",
    entityId: expense.id,
    action: "auto_created",
    newValue: {
      amount: input.amount,
      description: input.description,
      sourceType: input.sourceType,
      externalReference: input.externalReference,
    },
    actorUserId: input.userId,
  });
}
