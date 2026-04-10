import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { refreshDonorProfile } from "@/lib/fundraising/compliance";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  campaignId: z.string(),
  donationId: z.string(),
  refundAmount: z.number().positive(),
  refundReason: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const status = sp.get("status");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where: { campaignId: campaignId!, ...(status ? { status: status as never } : {}) },
      include: {
        donation: {
          select: { id: true, amount: true, donationDate: true, paymentMethod: true, contact: { select: { id: true, firstName: true, lastName: true } } },
        },
        processedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.refund.count({ where: { campaignId: campaignId!, ...(status ? { status: status as never } : {}) } }),
  ]);

  return NextResponse.json({ data: refunds, total, page, pageSize });
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

  // Validate donation belongs to campaign and amount
  const donation = await prisma.donation.findUnique({
    where: { id: parsed.data.donationId, campaignId: parsed.data.campaignId, deletedAt: null },
    select: { id: true, amount: true, refundedAmount: true, contactId: true, status: true },
  });
  if (!donation) return NextResponse.json({ error: "Donation not found" }, { status: 404 });

  const maxRefundable = donation.amount - (donation.refundedAmount ?? 0);
  if (parsed.data.refundAmount > maxRefundable) {
    return NextResponse.json(
      { error: `Refund amount $${parsed.data.refundAmount} exceeds refundable balance of $${maxRefundable.toFixed(2)}` },
      { status: 422 },
    );
  }

  // Check for duplicate refund in flight
  const pendingRefund = await prisma.refund.findFirst({
    where: { donationId: parsed.data.donationId, status: { in: ["pending", "approved", "processing"] } },
  });
  if (pendingRefund) {
    return NextResponse.json({ error: "A refund is already pending for this donation" }, { status: 409 });
  }

  const refund = await prisma.refund.create({
    data: {
      campaignId: parsed.data.campaignId,
      donationId: parsed.data.donationId,
      refundAmount: parsed.data.refundAmount,
      refundReason: parsed.data.refundReason,
      notes: parsed.data.notes,
      processedByUserId: session!.user.id,
      status: "pending",
    },
    include: {
      donation: { select: { id: true, amount: true, contact: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  await audit(prisma, "refund.create", {
    campaignId: parsed.data.campaignId,
    userId: session!.user.id,
    entityId: refund.id,
    entityType: "Refund",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: refund }, { status: 201 });
}
