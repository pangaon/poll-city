import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullish(),
  balance: z.number().nullish(),
  ownerEntity: z.string().max(200).nullish(),
  restrictedUse: z.boolean().optional(),
  restrictedNotes: z.string().max(1000).nullish(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const source = await prisma.fundingSource.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { transactions: true, vouchers: true } },
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: source.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ source });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const source = await prisma.fundingSource.findUnique({ where: { id: params.id }, select: { campaignId: true } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: source.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { metadata, ...rest } = parsed.data;
  const updated = await prisma.fundingSource.update({
    where: { id: params.id },
    data: {
      ...rest,
      balance: rest.balance !== undefined ? rest.balance : undefined,
      ...(metadata !== undefined ? { metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue) } : {}),
    },
  });

  return NextResponse.json({ source: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const source = await prisma.fundingSource.findUnique({ where: { id: params.id }, select: { campaignId: true } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: source.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.fundingSource.update({ where: { id: params.id }, data: { isActive: false } });

  return NextResponse.json({ ok: true });
}
