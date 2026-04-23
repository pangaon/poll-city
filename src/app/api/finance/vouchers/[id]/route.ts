import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { VoucherStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  description: z.string().max(1000).nullish(),
  assignedUserId: z.string().nullish(),
  expiresAt: z.string().datetime().nullish(),
  status: z.nativeEnum(VoucherStatus).optional(),
  policyJson: z.record(z.unknown()).nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    include: {
      assignedUser: { select: { id: true, name: true } },
      issuedBy: { select: { id: true, name: true } },
      fundingSource: { select: { id: true, name: true, type: true } },
      redemptions: {
        include: { redeemedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!voucher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: voucher.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ voucher });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id }, select: { campaignId: true } });
  if (!voucher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: voucher.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.voucher.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.assignedUserId !== undefined ? { assignedUserId: parsed.data.assignedUserId } : {}),
      ...(parsed.data.expiresAt !== undefined ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.policyJson !== undefined ? { policyJson: parsed.data.policyJson == null ? Prisma.JsonNull : (parsed.data.policyJson as Prisma.InputJsonValue) } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ voucher: updated });
}
