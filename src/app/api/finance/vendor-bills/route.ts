import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  vendorId: z.string().nullish(),
  purchaseOrderId: z.string().nullish(),
  billNumber: z.string().max(100).nullish(),
  amount: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default("CAD"),
  dueDate: z.string().nullish(),
  receivedDate: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
  assetId: z.string().nullish(),
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
  const vendorId = req.nextUrl.searchParams.get("vendorId");

  const bills = await prisma.financeVendorBill.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { status: status as Parameters<typeof prisma.financeVendorBill.findMany>[0]["where"] extends { status?: infer E } ? E : never } : {}),
      ...(vendorId ? { vendorId } : {}),
    },
    include: {
      vendor: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, poNumber: true } },
    },
    orderBy: { receivedDate: "desc" },
  });

  return NextResponse.json({ data: bills });
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
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const bill = await prisma.financeVendorBill.create({
    data: {
      campaignId: body.campaignId,
      vendorId: body.vendorId ?? null,
      purchaseOrderId: body.purchaseOrderId ?? null,
      billNumber: body.billNumber?.trim() ?? null,
      amount: body.amount,
      taxAmount: body.taxAmount,
      currency: body.currency,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
      notes: body.notes?.trim() ?? null,
      assetId: body.assetId ?? null,
    },
  });

  await logFinanceAudit({
    campaignId: body.campaignId,
    entityType: "FinanceVendorBill",
    entityId: bill.id,
    action: "created",
    newValue: { billNumber: bill.billNumber, amount: Number(bill.amount) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: bill }, { status: 201 });
}
