import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  vendorType: z.enum(["print_shop", "sign_company", "advertising_agency", "digital_vendor", "event_vendor", "staffing_agency", "legal", "software", "courier", "other"]).default("other"),
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).nullish(),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  address: z.string().max(500).nullish(),
  website: z.string().url().nullish(),
  paymentTerms: z.string().max(200).nullish(),
  taxNumber: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
  isPreferred: z.boolean().default(false),
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

  const q = req.nextUrl.searchParams.get("q");
  const vendorType = req.nextUrl.searchParams.get("vendorType");

  const vendors = await prisma.financeVendor.findMany({
    where: {
      campaignId,
      isActive: true,
      deletedAt: null,
      ...(vendorType ? { vendorType: vendorType as NonNullable<Parameters<typeof prisma.financeVendor.findMany>[0]>["where"] extends { vendorType?: infer E } ? E : never } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: {
      _count: { select: { expenses: true, purchaseOrders: true } },
    },
    orderBy: [{ isPreferred: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: vendors });
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

  // Duplicate check
  const existing = await prisma.financeVendor.findFirst({
    where: { campaignId: body.campaignId, name: { equals: body.name.trim(), mode: "insensitive" }, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json({ error: "A vendor with this name already exists", data: existing }, { status: 409 });
  }

  const vendor = await prisma.financeVendor.create({
    data: {
      campaignId: body.campaignId,
      vendorType: body.vendorType,
      name: body.name.trim(),
      contactName: body.contactName?.trim() ?? null,
      email: body.email?.toLowerCase().trim() ?? null,
      phone: body.phone?.trim() ?? null,
      address: body.address?.trim() ?? null,
      website: body.website?.trim() ?? null,
      paymentTerms: body.paymentTerms?.trim() ?? null,
      taxNumber: body.taxNumber?.trim() ?? null,
      notes: sanitizeUserText(body.notes),
      isPreferred: body.isPreferred,
    },
  });

  await logFinanceAudit({
    campaignId: body.campaignId,
    entityType: "FinanceVendor",
    entityId: vendor.id,
    action: "created",
    newValue: { name: vendor.name, vendorType: vendor.vendorType },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: vendor }, { status: 201 });
}
