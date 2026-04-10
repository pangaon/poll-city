import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { refreshDonorProfile } from "@/lib/fundraising/compliance";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  action: z.enum(["approve", "reject", "process"]),
  externalRefundId: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ refundId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { refundId } = await params;
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    select: { id: true, campaignId: true, donationId: true, refundAmount: true, status: true },
  });
  if (!refund) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, refund.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { action, externalRefundId, notes } = parsed.data;

  if (action === "approve" && refund.status !== "pending") {
    return NextResponse.json({ error: "Only pending refunds can be approved" }, { status: 409 });
  }
  if (action === "process" && refund.status !== "approved") {
    return NextResponse.json({ error: "Only approved refunds can be processed" }, { status: 409 });
  }
  if (action === "reject" && !["pending", "approved"].includes(refund.status)) {
    return NextResponse.json({ error: "Cannot reject a processed refund" }, { status: 409 });
  }

  const newStatus =
    action === "approve" ? "approved"
    : action === "process" ? "processed"
    : "rejected";

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: newStatus as never,
      approvedByUserId: action === "approve" ? session!.user.id : undefined,
      processedByUserId: action === "process" ? session!.user.id : undefined,
      ...(externalRefundId ? { externalRefundId } : {}),
      ...(notes ? { notes } : {}),
      ...(action === "process" ? { refundDate: new Date() } : {}),
    },
  });

  // On process: update donation refunded amount + status
  if (action === "process") {
    const donation = await prisma.donation.findUnique({
      where: { id: refund.donationId },
      select: { amount: true, refundedAmount: true, contactId: true, campaignId: true },
    });
    if (donation) {
      const newRefunded = (donation.refundedAmount ?? 0) + refund.refundAmount;
      const isFullRefund = newRefunded >= donation.amount;
      await prisma.donation.update({
        where: { id: refund.donationId },
        data: {
          refundedAmount: newRefunded,
          status: isFullRefund ? "refunded" : "partially_refunded",
        },
      });
      if (donation.contactId) {
        await refreshDonorProfile(refund.campaignId, donation.contactId);
      }
    }
  }

  await audit(prisma, `refund.${action}`, {
    campaignId: refund.campaignId,
    userId: session!.user.id,
    entityId: refundId,
    entityType: "Refund",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}
