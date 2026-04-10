import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { receiptId } = await params;
  const receipt = await prisma.donationReceipt.findUnique({
    where: { id: receiptId },
    include: { donation: { include: { contact: true } } },
  });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.receiptStatus === "void") return NextResponse.json({ error: "Cannot resend a voided receipt" }, { status: 409 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, receipt.campaignId);
  if (forbidden) return forbidden;

  // TODO: integrate email send (Resend) — stub for now
  const updated = await prisma.donationReceipt.update({
    where: { id: receiptId },
    data: {
      receiptStatus: "resent",
      resentAt: new Date(),
      sentAt: receipt.sentAt ?? new Date(),
      sentByUserId: session!.user.id,
    },
  });

  await audit(prisma, "receipt.resend", {
    campaignId: receipt.campaignId,
    userId: session!.user.id,
    entityId: receiptId,
    entityType: "DonationReceipt",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { receiptId } = await params;
  const receipt = await prisma.donationReceipt.findUnique({ where: { id: receiptId }, select: { campaignId: true } });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, receipt.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const reason = (body as Record<string, unknown>).reason as string | undefined;

  await prisma.donationReceipt.update({
    where: { id: receiptId },
    data: { receiptStatus: "void", voidedAt: new Date(), voidedReason: reason },
  });

  await audit(prisma, "receipt.void", {
    campaignId: receipt.campaignId,
    userId: session!.user.id,
    entityId: receiptId,
    entityType: "DonationReceipt",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ success: true });
}
