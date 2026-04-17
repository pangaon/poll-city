import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { fuelExpenseExists, postFuelExpense } from "@/lib/fuel/post-fuel-expense";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  campaignId: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(["draft", "confirmed", "in_preparation", "out_for_delivery", "delivered", "cancelled", "issue_flagged"]).optional(),
  deliveryMode: z.enum(["delivery", "pickup"]).optional(),
  fulfillmentRef: z.string().max(200).nullish(),
  scheduledFor: z.string().datetime().nullish(),
  deliveredAt: z.string().datetime().nullish(),
  issueNotes: z.string().max(2000).nullish(),
  receiptUrl: z.string().url().nullish(),
  receiptAmountCad: z.number().positive().nullish(),
  staffMessage: z.string().max(2000).nullish(),
  confirmedAmountCad: z.number().positive().nullish(),
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

  const status = req.nextUrl.searchParams.get("status");

  const orders = await prisma.foodOrder.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      request: { select: { id: true, requestType: true, headcount: true, location: true, neededBy: true } },
      quote: { select: { totalAmountCad: true, pricePerHead: true, includesDelivery: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return NextResponse.json({ data: orders });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId, orderId, status, scheduledFor, deliveredAt, ...rest } = body;

  const order = await prisma.foodOrder.update({
    where: { id: orderId },
    data: {
      ...rest,
      status,
      scheduledFor: scheduledFor !== undefined ? (scheduledFor ? new Date(scheduledFor) : null) : undefined,
      deliveredAt: deliveredAt !== undefined ? (deliveredAt ? new Date(deliveredAt) : null) : undefined,
    },
  });

  // Auto-post expense when confirmed or delivered for the first time
  if (status === "confirmed" || status === "delivered") {
    const amount = Number(body.confirmedAmountCad ?? body.receiptAmountCad ?? order.confirmedAmountCad ?? 0);
    if (amount > 0 && !order.expenseId) {
      const alreadyExists = await fuelExpenseExists(campaignId, orderId);
      if (!alreadyExists) {
        const request = await prisma.foodRequest.findUnique({
          where: { id: order.requestId },
          select: { requestType: true, headcount: true },
        });
        const description = `Food order — ${request?.requestType ?? "campaign"} (${request?.headcount ?? "?"} people)`;
        const expenseId = await postFuelExpense({
          campaignId,
          fuelOrderId: orderId,
          amount,
          description,
          userId: session!.user.id,
        });
        await prisma.foodOrder.update({ where: { id: orderId }, data: { expenseId } });
      }
    }

    // Advance request status to delivered
    if (status === "delivered") {
      await prisma.foodRequest.update({ where: { id: order.requestId }, data: { status: "delivered" } });
    }
  }

  return NextResponse.json({ data: order });
}
