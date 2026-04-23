import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { FundingSourceType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  type: z.nativeEnum(FundingSourceType).default("other"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  balance: z.number().nullish(),
  currency: z.string().length(3).default("CAD"),
  ownerEntity: z.string().max(200).nullish(),
  restrictedUse: z.boolean().default(false),
  restrictedNotes: z.string().max(1000).nullish(),
  metadata: z.record(z.unknown()).nullish(),
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

  const sources = await prisma.fundingSource.findMany({
    where: { campaignId, isActive: true },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { transactions: true, vouchers: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await prisma.fundingSource.create({
    data: {
      campaignId: data.campaignId,
      type: data.type,
      name: data.name,
      description: data.description ?? null,
      balance: data.balance != null ? data.balance : null,
      currency: data.currency,
      ownerEntity: data.ownerEntity ?? null,
      restrictedUse: data.restrictedUse,
      restrictedNotes: data.restrictedNotes ?? null,
      metadata: data.metadata != null ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      createdByUserId: session!.user.id,
    },
  });

  return NextResponse.json({ source }, { status: 201 });
}
