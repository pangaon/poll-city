import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  vendorType: z.enum(["print_shop", "sign_company", "advertising_agency", "digital_vendor", "event_vendor", "staffing_agency", "legal", "software", "courier", "other"]).optional(),
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullish(),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  address: z.string().max(500).nullish(),
  website: z.string().url().nullish(),
  paymentTerms: z.string().max(200).nullish(),
  taxNumber: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
  isPreferred: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const vendor = await prisma.financeVendor.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (vendor.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: vendor.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Spend summary
  const spendAgg = await prisma.financeExpense.aggregate({
    where: { vendorId: params.id, deletedAt: null },
    _sum: { amount: true },
    _count: true,
  });
  const unpaidBills = await prisma.financeVendorBill.count({
    where: { vendorId: params.id, status: { in: ["received", "approved", "overdue"] }, deletedAt: null },
  });
  const openPOs = await prisma.financePurchaseOrder.count({
    where: { vendorId: params.id, status: { in: ["draft", "sent", "acknowledged", "partially_received"] }, deletedAt: null },
  });

  return NextResponse.json({
    data: {
      ...vendor,
      spendTotal: spendAgg._sum.amount,
      expenseCount: spendAgg._count,
      unpaidBills,
      openPOs,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const vendor = await prisma.financeVendor.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (vendor.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: vendor.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const updated = await prisma.financeVendor.update({
    where: { id: params.id },
    data: {
      ...(body.vendorType ? { vendorType: body.vendorType } : {}),
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.contactName !== undefined ? { contactName: body.contactName?.trim() ?? null } : {}),
      ...(body.email !== undefined ? { email: body.email?.toLowerCase().trim() ?? null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone?.trim() ?? null } : {}),
      ...(body.address !== undefined ? { address: body.address?.trim() ?? null } : {}),
      ...(body.website !== undefined ? { website: body.website?.trim() ?? null } : {}),
      ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms?.trim() ?? null } : {}),
      ...(body.taxNumber !== undefined ? { taxNumber: body.taxNumber?.trim() ?? null } : {}),
      ...(body.notes !== undefined ? { notes: sanitizeUserText(body.notes) } : {}),
      ...(body.isPreferred !== undefined ? { isPreferred: body.isPreferred } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  await logFinanceAudit({
    campaignId: vendor.campaignId ?? "system",
    entityType: "FinanceVendor",
    entityId: params.id,
    action: "updated",
    newValue: { name: updated.name },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const vendor = await prisma.financeVendor.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (vendor.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: vendor.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (membership.role !== "ADMIN" && membership.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }
  }

  await prisma.financeVendor.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ data: { id: params.id } });
}
