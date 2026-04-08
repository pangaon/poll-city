import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  itemType: z.enum(["allocation", "expense"]),
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(1000).nullish(),
  vendor: z.string().max(200).nullish(),
  paymentMethod: z.string().max(50).nullish(),
  receiptUrl: z.string().max(1000).nullish(),
  receiptNumber: z.string().max(100).nullish(),
  status: z.enum(["pending", "approved", "paid", "rejected", "reconciled"]).default("approved"),
  tags: z.array(z.string().max(50)).max(10).default([]),
  sourceRuleId: z.string().nullish(),
  incurredAt: z.string().nullish(),
  paidAt: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.budgetItem.findMany({
    where: { campaignId },
    orderBy: { incurredAt: "desc" },
  });

  const totals = items.reduce(
    (acc, item) => {
      if (item.itemType === "allocation") acc.allocation += item.amount;
      else acc.expense += item.amount;
      return acc;
    },
    { allocation: 0, expense: 0 }
  );

  // Category breakdown with status awareness
  const byCategory = new Map<string, { allocation: number; expense: number; paid: number; pending: number }>();
  for (const item of items) {
    const row = byCategory.get(item.category) ?? { allocation: 0, expense: 0, paid: 0, pending: 0 };
    if (item.itemType === "allocation") {
      row.allocation += item.amount;
    } else {
      row.expense += item.amount;
      if (item.status === "paid" || item.status === "reconciled") row.paid += item.amount;
      if (item.status === "pending") row.pending += item.amount;
    }
    byCategory.set(item.category, row);
  }

  const categories = Array.from(byCategory.entries()).map(([category, v]) => ({
    category,
    ...v,
    remaining: v.allocation - v.expense,
    utilizationPct: v.allocation > 0 ? v.expense / v.allocation : 0,
  }));

  return NextResponse.json({
    data: {
      items,
      totals,
      remaining: totals.allocation - totals.expense,
      categories,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const created = await prisma.budgetItem.create({
      data: {
        campaignId: body.campaignId,
        itemType: body.itemType,
        category: body.category.trim(),
        amount: body.amount,
        description: body.description?.trim() || null,
        vendor: body.vendor?.trim() || null,
        paymentMethod: body.paymentMethod?.trim() || null,
        receiptUrl: body.receiptUrl?.trim() || null,
        receiptNumber: body.receiptNumber?.trim() || null,
        status: body.status,
        tags: body.tags,
        sourceRuleId: body.sourceRuleId || null,
        approvedById: body.status === "approved" || body.status === "paid" ? session!.user.id : null,
        incurredAt: body.incurredAt ? new Date(body.incurredAt) : new Date(),
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
      },
    });
    await prisma.activityLog.create({
      data: {
        campaignId: body.campaignId,
        userId: session!.user.id,
        action: "budget_item_created",
        entityType: "BudgetItem",
        entityId: created.id,
        details: { amount: body.amount, category: body.category, itemType: body.itemType, status: body.status },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[budget/create]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
