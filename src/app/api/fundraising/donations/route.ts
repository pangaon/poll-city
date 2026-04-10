import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { evaluateCompliance, refreshDonorProfile } from "@/lib/fundraising/compliance";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  campaignId: z.string(),
  contactId: z.string().optional(),
  amount: z.number().positive(),
  feeAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default("CAD"),
  donationType: z.enum(["one_time", "recurring", "pledge", "in_kind", "event", "tribute"]).default("one_time"),
  paymentMethod: z.enum(["stripe_card", "stripe_ach", "cash", "cheque", "e_transfer", "wire_transfer", "in_kind", "other"]).optional(),
  method: z.string().optional(),
  notes: z.string().optional(),
  dedicationName: z.string().optional(),
  dedicationType: z.enum(["memory", "honour"]).optional(),
  isAnonymous: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  donationDate: z.string().datetime().optional(),
  fundraisingCampaignId: z.string().optional(),
  eventId: z.string().optional(),
  sourceId: z.string().optional(),
  pageId: z.string().optional(),
  recurrencePlanId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  externalTransactionId: z.string().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const status = sp.get("status");
  const complianceStatus = sp.get("complianceStatus");
  const receiptStatus = sp.get("receiptStatus");
  const contactId = sp.get("contactId");
  const fundraisingCampaignId = sp.get("fundraisingCampaignId");
  const sourceId = sp.get("sourceId");
  const search = sp.get("search")?.trim();
  const donationType = sp.get("donationType");
  const paymentMethod = sp.get("paymentMethod");
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    campaignId: campaignId!,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(complianceStatus ? { complianceStatus } : {}),
    ...(receiptStatus ? { receiptStatus } : {}),
    ...(contactId ? { contactId } : {}),
    ...(fundraisingCampaignId ? { fundraisingCampaignId } : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(donationType ? { donationType } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
  };

  if (dateFrom || dateTo) {
    where.donationDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { notes: { contains: search, mode: "insensitive" } },
      { externalTransactionId: { contains: search, mode: "insensitive" } },
      { paymentIntentId: { contains: search, mode: "insensitive" } },
      { contact: { firstName: { contains: search, mode: "insensitive" } } },
      { contact: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: [{ donationDate: "desc" }],
      skip,
      take: pageSize,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        recordedBy: { select: { id: true, name: true, email: true } },
        source: { select: { id: true, name: true } },
        fundraisingCampaign: { select: { id: true, name: true } },
        receipt: { select: { id: true, receiptNumber: true, receiptStatus: true } },
      },
    }),
    prisma.donation.count({ where }),
  ]);

  return NextResponse.json({ data: donations, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, parsed.data.campaignId);
  if (forbidden) return forbidden;

  const d = parsed.data;
  const netAmount = d.amount - d.feeAmount;

  // Compliance evaluation
  const complianceResult = await evaluateCompliance({
    campaignId: d.campaignId,
    contactId: d.contactId ?? null,
    amount: d.amount,
    isAnonymous: d.isAnonymous,
  });

  // Hard block if compliance requires it
  if (complianceResult.status === "blocked") {
    return NextResponse.json(
      { error: "Compliance violation", reason: complianceResult.reason },
      { status: 422 },
    );
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId: d.campaignId,
      contactId: d.contactId,
      recordedById: session!.user.id,
      amount: d.amount,
      feeAmount: d.feeAmount,
      netAmount,
      currency: d.currency,
      donationType: d.donationType,
      paymentMethod: d.paymentMethod,
      method: d.method,
      notes: d.notes,
      dedicationName: d.dedicationName,
      dedicationType: d.dedicationType,
      isAnonymous: d.isAnonymous,
      isRecurring: d.isRecurring,
      donationDate: d.donationDate ? new Date(d.donationDate) : new Date(),
      collectedAt: d.donationDate ? new Date(d.donationDate) : new Date(),
      fundraisingCampaignId: d.fundraisingCampaignId,
      eventId: d.eventId,
      sourceId: d.sourceId,
      pageId: d.pageId,
      recurrencePlanId: d.recurrencePlanId,
      paymentIntentId: d.paymentIntentId,
      externalTransactionId: d.externalTransactionId,
      metadataJson: d.metadataJson as never,
      complianceStatus: complianceResult.status,
      status: d.paymentMethod === "stripe_card" || d.paymentMethod === "stripe_ach" ? "processing" : "pledged",
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });

  // Update donor profile if contact linked
  if (d.contactId) {
    await refreshDonorProfile(d.campaignId, d.contactId);
  }

  // Update fundraising campaign raised total
  if (d.fundraisingCampaignId) {
    const agg = await prisma.donation.aggregate({
      where: { fundraisingCampaignId: d.fundraisingCampaignId, status: { notIn: ["cancelled", "failed"] }, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });
    await prisma.fundraisingCampaign.update({
      where: { id: d.fundraisingCampaignId },
      data: { raisedAmount: agg._sum.amount ?? 0, donorCount: agg._count.id },
    });
  }

  await audit(prisma, "donation.create", {
    campaignId: d.campaignId,
    userId: session!.user.id,
    entityId: donation.id,
    entityType: "Donation",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: donation }, { status: 201 });
}
