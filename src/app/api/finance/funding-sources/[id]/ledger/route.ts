import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { FundingTxType } from "@prisma/client";

export const dynamic = "force-dynamic";

const addTxSchema = z.object({
  type: z.nativeEnum(FundingTxType),
  amount: z.number().positive(),
  description: z.string().max(500).nullish(),
  relatedExpenseId: z.string().nullish(),
  relatedDonationId: z.string().nullish(),
  relatedVoucherId: z.string().nullish(),
  notes: z.string().max(1000).nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const source = await prisma.fundingSource.findUnique({
    where: { id: params.id },
    select: { campaignId: true, balance: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: source.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const transactions = await prisma.fundingSourceTransaction.findMany({
    where: { fundingSourceId: params.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ transactions, currentBalance: source.balance });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const source = await prisma.fundingSource.findUnique({
    where: { id: params.id },
    select: { campaignId: true, balance: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: source.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = addTxSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const isDebit = ["debit", "reimbursement_out", "vendor_payment"].includes(data.type);
  const delta = isDebit ? -data.amount : data.amount;
  const newBalance = source.balance != null ? Number(source.balance) + delta : null;

  const [tx] = await prisma.$transaction([
    prisma.fundingSourceTransaction.create({
      data: {
        fundingSourceId: params.id,
        campaignId: source.campaignId,
        type: data.type,
        amount: data.amount,
        balanceAfter: newBalance,
        description: data.description ?? null,
        relatedExpenseId: data.relatedExpenseId ?? null,
        relatedDonationId: data.relatedDonationId ?? null,
        relatedVoucherId: data.relatedVoucherId ?? null,
        actorUserId: session!.user.id,
        notes: data.notes ?? null,
      },
    }),
    ...(newBalance != null
      ? [prisma.fundingSource.update({ where: { id: params.id }, data: { balance: newBalance } })]
      : []),
  ]);

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
