import prisma from "@/lib/db/prisma";
import { FinanceBudgetLineCategory, FinanceSourceType } from "@prisma/client";
import { logFinanceAudit } from "@/lib/finance/audit";

export async function findFoodBudgetLine(campaignId: string): Promise<string | null> {
  // Try food first, then events, then volunteer_support as fallback
  for (const category of [
    FinanceBudgetLineCategory.food,
    FinanceBudgetLineCategory.events,
    FinanceBudgetLineCategory.volunteer_support,
  ]) {
    const line = await prisma.budgetLine.findFirst({
      where: { campaignId, category, isActive: true, isLocked: false },
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    });
    if (line) return line.id;
  }
  return null;
}

export async function fuelExpenseExists(campaignId: string, fuelOrderId: string): Promise<boolean> {
  const expense = await prisma.financeExpense.findFirst({
    where: {
      campaignId,
      deletedAt: null,
      externalReference: `fuelorder:${fuelOrderId}`,
    },
    select: { id: true },
  });
  return expense !== null;
}

export interface PostFuelExpenseInput {
  campaignId: string;
  fuelOrderId: string;
  amount: number;
  description: string;
  userId: string;
}

export async function postFuelExpense(input: PostFuelExpenseInput): Promise<string> {
  const budgetLineId = await findFoodBudgetLine(input.campaignId);

  const expense = await prisma.financeExpense.create({
    data: {
      campaignId: input.campaignId,
      budgetLineId,
      amount: input.amount,
      taxAmount: 0,
      currency: "CAD",
      expenseDate: new Date(),
      description: input.description,
      sourceType: FinanceSourceType.fuel_order,
      externalReference: `fuelorder:${input.fuelOrderId}`,
      isSplit: false,
      isRecurring: false,
      missingReceipt: false,
      enteredByUserId: input.userId,
    },
  });

  if (budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: { actualAmount: { increment: input.amount } },
    });
  }

  await logFinanceAudit({
    campaignId: input.campaignId,
    entityType: "FinanceExpense",
    entityId: expense.id,
    action: "fuel_order_auto_created",
    newValue: {
      amount: input.amount,
      description: input.description,
      fuelOrderId: input.fuelOrderId,
    },
    actorUserId: input.userId,
  });

  return expense.id;
}
