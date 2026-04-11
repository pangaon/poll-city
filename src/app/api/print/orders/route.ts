import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import {
  budgetCategoryForProduct,
  findPrintBudgetLine,
  postPrintExpense,
} from "@/lib/finance/post-print-expense";
import { postPrintOrderCalendarItem } from "@/lib/calendar/post-calendar-item";

const printOrderSchema = z.object({
  campaignId: z.string().min(1, "campaignId is required"),
  templateId: z.string().nullish(),
  productType: z.string().min(1, "productType is required"),
  quantity: z.number().int().positive("quantity must be positive"),
  unitPriceCad: z.number().positive().nullish(),
  totalPriceCad: z.number().positive().nullish(),
  designData: z.record(z.unknown()).optional(),
  shippingAddr: z.record(z.unknown()).optional(),
  notes: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.printOrder.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true, slug: true, category: true, thumbnail: true } } },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = printOrderSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: parsed.data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.printOrder.create({
    data: {
      campaignId: parsed.data.campaignId,
      templateId: parsed.data.templateId ?? null,
      productType: parsed.data.productType,
      quantity: parsed.data.quantity,
      unitPriceCad: parsed.data.unitPriceCad ?? null,
      totalPriceCad: parsed.data.totalPriceCad ?? null,
      designData: parsed.data.designData as object ?? undefined,
      shippingAddr: parsed.data.shippingAddr as object ?? undefined,
      notes: parsed.data.notes ?? null,
    },
  });

  // Auto-post finance expense when order price is known at creation time
  if (parsed.data.totalPriceCad) {
    try {
      const category = budgetCategoryForProduct(parsed.data.productType);
      const budgetLineId = await findPrintBudgetLine(parsed.data.campaignId, category);
      await postPrintExpense({
        campaignId: parsed.data.campaignId,
        amount: parsed.data.totalPriceCad,
        description: `Print order: ${parsed.data.productType.replace(/_/g, " ")} ×${parsed.data.quantity}`,
        sourceType: "print_order",
        budgetLineId,
        externalReference: `printorder:${order.id}`,
        userId: session!.user.id,
      });
    } catch (expenseErr) {
      console.error("[print/orders] expense auto-post failed", expenseErr);
      // Non-fatal: order was created successfully, expense can be posted manually
    }
  }

  // GAP-008: wire new print order into calendar (non-fatal)
  postPrintOrderCalendarItem({
    campaignId: parsed.data.campaignId,
    printOrderId: order.id,
    productType: parsed.data.productType,
    quantity: parsed.data.quantity,
    userId: session!.user.id,
  }).catch((err) => console.error("[print/orders] calendar wiring failed", err));

  return NextResponse.json({ data: order }, { status: 201 });
}
