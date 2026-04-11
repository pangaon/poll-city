/**
 * sendDonationReceiptEmail
 *
 * Generates a DonationReceipt record (idempotent) for the given donation and
 * sends the HTML receipt email via sendReceiptEmail().
 *
 * Safe to call multiple times — if a receipt is already recorded as "sent",
 * the function returns immediately without sending a duplicate.
 *
 * Primary call sites:
 *   - Stripe webhook: payment_intent.succeeded  (one-time donation confirmed)
 *   - Stripe webhook: invoice.payment_succeeded  (recurring billing cycle)
 *
 * Manual / offline receipt generation uses POST /api/fundraising/receipts
 * directly, which also calls sendReceiptEmail after generating the record.
 */

import prisma from "@/lib/db/prisma";
import { sendReceiptEmail } from "./receipt-email";

export async function sendDonationReceiptEmail(
  donationId: string,
  campaignId: string,
): Promise<void> {
  // Guard: donation must exist and belong to this campaign
  const donation = await prisma.donation.findUnique({
    where: { id: donationId, campaignId, deletedAt: null },
    select: {
      id: true,
      receiptStatus: true,
      receiptNumber: true,
      receipt: { select: { id: true, receiptStatus: true } },
    },
  });
  if (!donation) return;

  // Idempotent: already sent — nothing to do
  if (donation.receipt?.receiptStatus === "sent") return;
  if (donation.receiptStatus === "sent") return;

  let receiptId: string;

  if (donation.receipt) {
    // Receipt record already exists (may have been generated but not yet emailed)
    receiptId = donation.receipt.id;
  } else {
    // Generate receipt number: REC-YEAR-RANDOM
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 900000) + 100000;
    const receiptNumber = donation.receiptNumber ?? `REC-${year}-${rand}`;

    // Create the DonationReceipt record
    const receipt = await prisma.donationReceipt.create({
      data: {
        campaignId,
        donationId,
        receiptNumber,
        issuedDate: new Date(),
        receiptStatus: "generated",
      },
      select: { id: true },
    });
    receiptId = receipt.id;

    // Mirror receipt number on the Donation row
    await prisma.donation.update({
      where: { id: donationId },
      data: { receiptNumber, receiptStatus: "generated" },
    });
  }

  // Delegate actual email send to the shared helper
  await sendReceiptEmail(receiptId);
}
