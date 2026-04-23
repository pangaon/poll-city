import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { VoucherType, VoucherStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  code: z.string().max(50).nullish(),
  type: z.nativeEnum(VoucherType).default("general"),
  description: z.string().max(1000).nullish(),
  maxAmount: z.number().positive(),
  currency: z.string().length(3).default("CAD"),
  assignedUserId: z.string().nullish(),
  fundingSourceId: z.string().nullish(),
  eventId: z.string().nullish(),
  routeId: z.string().nullish(),
  expiresAt: z.string().datetime().nullish(),
  policyJson: z.record(z.unknown()).nullish(),
  qrCodeId: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const statusFilter = p.get("status") as VoucherStatus | null;
  const assignedTo = p.get("assignedUserId");

  const vouchers = await prisma.voucher.findMany({
    where: {
      campaignId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(assignedTo ? { assignedUserId: assignedTo } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      issuedBy: { select: { id: true, name: true } },
      fundingSource: { select: { id: true, name: true, type: true } },
      _count: { select: { redemptions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ vouchers });
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

  const voucher = await prisma.voucher.create({
    data: {
      campaignId: data.campaignId,
      code: data.code ?? null,
      type: data.type,
      description: data.description ?? null,
      maxAmount: data.maxAmount,
      redeemedAmount: 0,
      remainingAmount: data.maxAmount,
      currency: data.currency,
      assignedUserId: data.assignedUserId ?? null,
      fundingSourceId: data.fundingSourceId ?? null,
      eventId: data.eventId ?? null,
      routeId: data.routeId ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      policyJson: data.policyJson != null ? (data.policyJson as Prisma.InputJsonValue) : Prisma.JsonNull,
      qrCodeId: data.qrCodeId ?? null,
      status: "draft",
      issuedById: session!.user.id,
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      fundingSource: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ voucher }, { status: 201 });
}
