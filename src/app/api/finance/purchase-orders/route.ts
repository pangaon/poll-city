import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  vendorId: z.string().nullish(),
  budgetLineId: z.string().nullish(),
  purchaseRequestId: z.string().nullish(),
  poNumber: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default("CAD"),
  expectedDate: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
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

  const orders = await prisma.financePurchaseOrder.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { status: status as NonNullable<Parameters<typeof prisma.financePurchaseOrder.findMany>[0]>["where"] extends { status?: infer E } ? E : never } : {}),
    },
    include: {
      vendor: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true } },
      purchaseRequest: { select: { id: true, title: true } },
      _count: { select: { vendorBills: true, expenses: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // PO number uniqueness
  const existing = await prisma.financePurchaseOrder.findFirst({
    where: { campaignId: body.campaignId, poNumber: body.poNumber, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json({ error: "PO number already exists" }, { status: 409 });
  }

  const po = await prisma.financePurchaseOrder.create({
    data: {
      campaignId: body.campaignId,
      vendorId: body.vendorId ?? null,
      budgetLineId: body.budgetLineId ?? null,
      purchaseRequestId: body.purchaseRequestId ?? null,
      poNumber: body.poNumber.trim(),
      totalAmount: body.totalAmount,
      taxAmount: body.taxAmount,
      currency: body.currency,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      notes: sanitizeUserText(body.notes),
    },
  });

  await logFinanceAudit({
    campaignId: body.campaignId,
    entityType: "FinancePurchaseOrder",
    entityId: po.id,
    action: "created",
    newValue: { poNumber: po.poNumber, totalAmount: Number(po.totalAmount) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: po }, { status: 201 });
}
