import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { sanitizeUserText } from "@/lib/security/monitor";
import { advanceFunnel } from "@/lib/operations/funnel-engine";
import { FunnelStage } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: {
    campaignId?: string;
    contactId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    amount?: string | number;
    method?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  const amount = Number(body.amount);

  if (!campaignId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "campaignId and valid amount required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let resolvedContactId = body.contactId?.trim() || undefined;
  if (resolvedContactId) {
    const existingContact = await prisma.contact.findUnique({
      where: { id: resolvedContactId },
      select: { id: true, campaignId: true },
    });
    if (!existingContact || existingContact.campaignId !== campaignId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  } else if (body.firstName?.trim() || body.lastName?.trim()) {
    const contact = await prisma.contact.create({
      data: {
        campaignId,
        firstName: body.firstName?.trim() || "Unknown",
        lastName: body.lastName?.trim() || "Unknown",
        phone: body.phone?.trim() || null,
        address1: body.address?.trim() || null,
        source: "donation_capture",
      },
    });
    resolvedContactId = contact.id;
  }

  // Duplicate submission guard (30-second window) — prevents double-tap / network retry double-write
  const recentDuplicate = await prisma.donation.findFirst({
    where: {
      campaignId,
      contactId: resolvedContactId ?? null,
      amount,
      createdAt: { gte: new Date(Date.now() - 30_000) },
    },
    select: { id: true },
  });
  if (recentDuplicate) {
    return NextResponse.json({ data: { id: recentDuplicate.id }, deduplicated: true }, { status: 200 });
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      contactId: resolvedContactId ?? null,
      recordedById: session!.user.id,
      amount,
      method: body.method?.trim() || "cash",
      notes: sanitizeUserText(body.notes),
      status: "pledged",
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "donation_recorded",
      entityType: "donation",
      entityId: donation.id,
      details: { amount, method: body.method || "cash" },
    },
  });

  // Advance funnel: donation → donor
  if (resolvedContactId) {
    await advanceFunnel(resolvedContactId, FunnelStage.donor, "donation", session!.user.id);
  }

  // Receipt email — Ontario Municipal Elections Act requires receipts for donations ≥ $25
  if (resolvedContactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: resolvedContactId },
      select: { email: true, firstName: true, lastName: true, address1: true, city: true, province: true, postalCode: true },
    });

    if (contact?.email) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { name: true, candidateName: true, jurisdiction: true },
      });

      if (campaign) {
        const year = new Date().getFullYear();
        const receiptNumber = `RC-${campaignId.slice(-4).toUpperCase()}-${year}-${donation.id.slice(-6).toUpperCase()}`;
        const donorName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Donor";
        const donorAddress = [contact.address1, contact.city, contact.province, contact.postalCode].filter(Boolean).join(", ");
        const amountFormatted = `$${Number(amount).toFixed(2)}`;

        const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
<h2 style="color:#0A2342">Official Donation Receipt</h2>
<p><strong>Receipt Number:</strong> ${receiptNumber}</p>
<hr style="border:1px solid #e2e8f0"/>
<p><strong>Received from:</strong> ${donorName}</p>
${donorAddress ? `<p><strong>Address:</strong> ${donorAddress}</p>` : ""}
<p><strong>Amount:</strong> ${amountFormatted}</p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
<p><strong>Method:</strong> ${body.method || "cash"}</p>
<hr style="border:1px solid #e2e8f0"/>
<p><strong>Campaign:</strong> ${campaign.candidateName ?? campaign.name}</p>
${campaign.jurisdiction ? `<p><strong>Jurisdiction:</strong> ${campaign.jurisdiction}</p>` : ""}
<p style="font-size:12px;color:#64748b;margin-top:24px">This receipt is issued pursuant to the Ontario Municipal Elections Act, 1996. Contributions to municipal election campaigns are not tax-deductible for federal or provincial income tax purposes. Maximum contribution: $1,200 per contributor per candidate.</p>
</body></html>`;

        try {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            const { Resend } = await import("resend");
            const resend = new Resend(resendKey);
            await resend.emails.send({
              from: "Poll City <noreply@pollcity.ca>",
              to: contact.email,
              subject: `Donation Receipt — ${campaign.candidateName ?? campaign.name} (${receiptNumber})`,
              html,
            });

            // Mark receipted + update lastContactedAt
            await Promise.all([
              prisma.donation.update({ where: { id: donation.id }, data: { status: "receipted" } }),
              prisma.contact.update({ where: { id: resolvedContactId }, data: { lastContactedAt: new Date() } }),
            ]);
          }
        } catch (e) {
          console.error("[Donation Receipt]", e);
          // Non-fatal — donation is recorded, receipt send failed
        }
      }
    }
  }

  return NextResponse.json({ data: donation }, { status: 201 });
}
