import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { refreshDonorProfile } from "@/lib/fundraising/compliance";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["pledged", "processing", "processed", "receipted", "failed", "cancelled", "refunded", "partially_refunded"]).optional(),
  complianceStatus: z.enum(["pending", "approved", "flagged", "over_limit", "blocked", "exempted"]).optional(),
  receiptStatus: z.enum(["pending", "generated", "sent", "resent", "failed", "void"]).optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["stripe_card", "stripe_ach", "cash", "cheque", "e_transfer", "wire_transfer", "in_kind", "other"]).optional(),
  method: z.string().optional(),
  fundraisingCampaignId: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  externalTransactionId: z.string().nullable().optional(),
  processedAt: z.string().datetime().nullable().optional(),
  approvedByUserId: z.string().nullable().optional(),
  feeAmount: z.number().min(0).optional(),
  netAmount: z.number().optional(),
  refundedAmount: z.number().min(0).optional(),
  dedicationName: z.string().nullable().optional(),
  dedicationType: z.enum(["memory", "honour"]).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { donationId } = await params;
  const donation = await prisma.donation.findUnique({
    where: { id: donationId, deletedAt: null },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, ward: true } },
      recordedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      source: { select: { id: true, name: true, sourceType: true } },
      fundraisingCampaign: { select: { id: true, name: true } },
      event: { select: { id: true, name: true, eventDate: true } },
      receipt: true,
      refunds: { where: { status: { not: "rejected" } }, orderBy: { createdAt: "desc" } },
      reconciliations: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, donation.campaignId);
  if (forbidden) return forbidden;

  return NextResponse.json({ data: donation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { donationId } = await params;
  const donation = await prisma.donation.findUnique({
    where: { id: donationId, deletedAt: null },
    select: { campaignId: true, contactId: true, amount: true, fundraisingCampaignId: true, status: true },
  });
  if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, donation.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.processedAt !== undefined) {
    updateData.processedAt = parsed.data.processedAt ? new Date(parsed.data.processedAt) : null;
  }

  const updated = await prisma.donation.update({
    where: { id: donationId },
    data: updateData as never,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });

  // Refresh donor profile on significant status changes
  if (donation.contactId && parsed.data.status && parsed.data.status !== donation.status) {
    await refreshDonorProfile(donation.campaignId, donation.contactId);
  }

  await audit(prisma, "donation.update", {
    campaignId: donation.campaignId,
    userId: session!.user.id,
    entityId: donationId,
    entityType: "Donation",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { donationId } = await params;
  const donation = await prisma.donation.findUnique({
    where: { id: donationId, deletedAt: null },
    select: { campaignId: true, contactId: true, fundraisingCampaignId: true },
  });
  if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, donation.campaignId);
  if (forbidden) return forbidden;

  await prisma.donation.update({
    where: { id: donationId },
    data: { deletedAt: new Date(), deletedById: session!.user.id, status: "cancelled" },
  });

  if (donation.contactId) {
    await refreshDonorProfile(donation.campaignId, donation.contactId);
  }

  await audit(prisma, "donation.delete", {
    campaignId: donation.campaignId,
    userId: session!.user.id,
    entityId: donationId,
    entityType: "Donation",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ success: true });
}
