import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({
  amount: z.number().positive(),
  merchant: z.string().max(200).nullish(),
  notes: z.string().max(1000).nullish(),
  receiptUrl: z.string().url().nullish(),
  expenseId: z.string().nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      campaignId: true,
      status: true,
      remainingAmount: true,
      maxAmount: true,
      redeemedAmount: true,
      expiresAt: true,
      assignedUserId: true,
    },
  });
  if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: voucher.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (voucher.status === "cancelled" || voucher.status === "expired") {
    return NextResponse.json({ error: "Voucher is not active" }, { status: 400 });
  }
  if (voucher.status === "fully_redeemed") {
    return NextResponse.json({ error: "Voucher fully redeemed" }, { status: 400 });
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    await prisma.voucher.update({ where: { id: params.id }, data: { status: "expired" } });
    return NextResponse.json({ error: "Voucher expired" }, { status: 400 });
  }
  if (voucher.assignedUserId && voucher.assignedUserId !== session!.user.id) {
    return NextResponse.json({ error: "This voucher is assigned to another user" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { amount, merchant, notes, receiptUrl, expenseId } = parsed.data;

  if (amount > Number(voucher.remainingAmount)) {
    return NextResponse.json({
      error: `Amount exceeds remaining balance ($${Number(voucher.remainingAmount).toFixed(2)} left)`,
    }, { status: 400 });
  }

  const newRedeemed = Number(voucher.redeemedAmount) + amount;
  const newRemaining = Number(voucher.remainingAmount) - amount;
  const newStatus = newRemaining <= 0 ? "fully_redeemed" : "partially_redeemed";

  const [redemption] = await prisma.$transaction([
    prisma.voucherRedemption.create({
      data: {
        voucherId: params.id,
        campaignId: voucher.campaignId,
        redeemedById: session!.user.id,
        expenseId: expenseId ?? null,
        amount,
        merchant: merchant ?? null,
        notes: notes ?? null,
        receiptUrl: receiptUrl ?? null,
      },
    }),
    prisma.voucher.update({
      where: { id: params.id },
      data: {
        redeemedAmount: newRedeemed,
        remainingAmount: newRemaining,
        status: newStatus,
      },
    }),
  ]);

  return NextResponse.json({ redemption, remainingAmount: newRemaining, status: newStatus }, { status: 201 });
}
