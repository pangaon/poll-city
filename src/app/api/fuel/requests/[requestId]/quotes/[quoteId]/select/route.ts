import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const selectSchema = z.object({
  campaignId: z.string().min(1),
  deliveryMode: z.enum(["delivery", "pickup"]).default("delivery"),
  scheduledFor: z.string().datetime().nullish(),
  staffMessage: z.string().max(2000).nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string; quoteId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = selectSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const quote = await prisma.foodQuote.findFirst({
    where: { id: params.quoteId, requestId: params.requestId, campaignId: body.campaignId },
  });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Deselect all other quotes for this request
  await prisma.foodQuote.updateMany({
    where: { requestId: params.requestId, id: { not: params.quoteId } },
    data: { isSelected: false },
  });
  await prisma.foodQuote.update({ where: { id: params.quoteId }, data: { isSelected: true } });

  // Create or update FoodOrder
  const existing = await prisma.foodOrder.findUnique({ where: { requestId: params.requestId } });

  let order;
  if (existing) {
    order = await prisma.foodOrder.update({
      where: { id: existing.id },
      data: {
        quoteId: params.quoteId,
        vendorId: quote.vendorId,
        confirmedAmountCad: quote.totalAmountCad,
        status: "confirmed",
        deliveryMode: body.deliveryMode,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        staffMessage: body.staffMessage ?? null,
      },
    });
  } else {
    order = await prisma.foodOrder.create({
      data: {
        campaignId: body.campaignId,
        requestId: params.requestId,
        quoteId: params.quoteId,
        vendorId: quote.vendorId,
        confirmedAmountCad: quote.totalAmountCad,
        status: "confirmed",
        deliveryMode: body.deliveryMode,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        staffMessage: body.staffMessage ?? null,
        createdByUserId: session!.user.id,
      },
    });
  }

  // Advance request status to "ordered"
  await prisma.foodRequest.update({
    where: { id: params.requestId },
    data: { status: "ordered" },
  });

  return NextResponse.json({ data: order });
}
