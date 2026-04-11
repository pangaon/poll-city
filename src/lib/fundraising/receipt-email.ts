/**
 * Sends the official donation receipt email to the donor.
 * Called after a DonationReceipt is generated (receipts POST route).
 * Non-blocking — caller wraps in .catch() to avoid failing the main request.
 */

import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { loadBrandKit, type BrandKit } from "@/lib/brand/brand-kit";

export async function sendReceiptEmail(receiptId: string): Promise<void> {
  const receipt = await prisma.donationReceipt.findUnique({
    where: { id: receiptId },
    include: {
      donation: {
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  if (!receipt) return;

  const contact = receipt.donation.contact;
  if (!contact?.email) return;

  const brand = await loadBrandKit(receipt.campaignId);

  const donorName =
    contact.firstName
      ? `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`
      : "Valued Supporter";

  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(receipt.donation.amount);

  const donationDate = new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(
    new Date(receipt.donation.donationDate),
  );

  const issuedDate = new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(
    new Date(receipt.issuedDate ?? receipt.createdAt),
  );

  const html = buildReceiptHtml({ brand, donorName, amount, donationDate, receiptNumber: receipt.receiptNumber, issuedDate });

  await sendEmail({
    to: contact.email,
    subject: `Donation Receipt — ${receipt.receiptNumber}`,
    html,
    ...(brand.campaignName ? { fromName: brand.campaignName } : {}),
  });

  // Mark receipt as sent
  await prisma.donationReceipt.update({
    where: { id: receiptId },
    data: { receiptStatus: "sent", sentAt: new Date() },
  });

  // Sync status on the Donation row
  await prisma.donation.update({
    where: { id: receipt.donationId },
    data: { receiptStatus: "sent" },
  });
}

function buildReceiptHtml(opts: {
  brand: BrandKit;
  donorName: string;
  amount: string;
  donationDate: string;
  receiptNumber: string;
  issuedDate: string;
}): string {
  const { brand, donorName, amount, donationDate, receiptNumber, issuedDate } = opts;
  const primary = brand.primaryColor ?? "#1D9E75";

  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;background:#ffffff">
  <div style="background:${primary};padding:32px 40px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff">${brand.campaignName}</h1>
    ${brand.candidateName ? `<p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${brand.candidateName}</p>` : ""}
  </div>
  <div style="padding:40px;background:#ffffff;border:1px solid #e2e8f0;border-top:none">
    <h2 style="margin:0 0 6px;font-size:18px;font-weight:600;color:#0f172a">Official Donation Receipt</h2>
    <p style="margin:0 0 32px;font-size:13px;color:#64748b">Receipt No. ${receiptNumber} &nbsp;·&nbsp; Issued ${issuedDate}</p>

    <p style="margin:0 0 20px;font-size:15px;color:#0f172a">Dear ${donorName},</p>
    <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6">
      Thank you for your generous contribution to <strong>${brand.campaignName}</strong>.
      Your donation supports our campaign to serve the community and make a real difference.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 28px">
      <tr style="background:#f8fafc">
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e2e8f0">Donation Amount</td>
        <td style="padding:12px 16px;font-size:15px;font-weight:700;color:${primary};border:1px solid #e2e8f0;text-align:right">${amount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none">Date of Donation</td>
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none;text-align:right">${donationDate}</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none">Receipt Number</td>
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none;text-align:right;font-family:monospace">${receiptNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none">Recipient Campaign</td>
        <td style="padding:12px 16px;font-size:13px;color:#374151;border:1px solid #e2e8f0;border-top:none;text-align:right">${brand.campaignName}</td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;padding:16px;background:#f8fafc;border-radius:6px;border-left:3px solid ${primary}">
      This receipt is issued in accordance with Elections Ontario contribution reporting requirements.
      Please retain this receipt for your records. Contributions to municipal campaigns may be eligible
      for a municipal contribution rebate — consult your municipality for details.
    </p>

    ${
      brand.websiteUrl
        ? `<p style="margin:0;font-size:13px;color:#64748b">Questions? Visit <a href="${brand.websiteUrl}" style="color:${primary}">${brand.websiteUrl}</a>${brand.phone ? ` or call ${brand.phone}` : ""}.</p>`
        : ""
    }
  </div>
  <div style="padding:20px 40px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">
      Sent via Poll City campaign tools &nbsp;·&nbsp; Complies with Elections Ontario reporting requirements
    </p>
  </div>
</div>
  `.trim();
}
