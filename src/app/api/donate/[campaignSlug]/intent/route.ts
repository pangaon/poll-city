/**
 * POST /api/donate/[campaignSlug]/intent
 *
 * Public endpoint — no authentication required.
 * Called by the public donation page to create a Stripe PaymentIntent
 * and a pre-record Donation row so the webhook can find it by paymentIntentId.
 *
 * The webhook at /api/fundraising/stripe/webhook handles:
 *   - payment_intent.succeeded → marks Donation "processed", sends receipt
 *
 * This route handles:
 *   - contact find-or-create (by email within campaign)
 *   - Donation row pre-create in "processing" status
 *   - Stripe PaymentIntent creation
 *   - funnel advance if Contact already in CRM
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe/connect";
import { donationFeeAmount, MIN_FEE_THRESHOLD_CENTS } from "@/lib/stripe/platform-fees";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  amount: z.number().positive().max(25_000),    // CAD dollars — hard cap
  currency: z.string().length(3).default("CAD"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional(),
  employer: z.string().max(200).optional(),
  anonymous: z.boolean().default(false),
  donationPageId: z.string().optional(),
  fundraisingCampaignId: z.string().optional(),
});

// funnelStage values that auto-advance to "donor" on donation
const ADVANCE_TO_DONOR_FROM = new Set(["unknown", "contact", "supporter", "volunteer"]);

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignSlug: string } },
) {
  // Rate limiting — public endpoint
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  if (!stripe) {
    return NextResponse.json(
      { error: "Payment processing is not configured for this server." },
      { status: 503, headers: NO_STORE },
    );
  }

  // Look up the campaign by slug — public read only
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.campaignSlug },
    select: {
      id: true,
      name: true,
      isActive: true,
      stripeConnectedAccountId: true,
      stripeOnboarded: true,
      memberships: {
        where: { role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { userId: true },
      },
    },
  });

  if (!campaign || !campaign.isActive) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404, headers: NO_STORE });
  }

  const campaignAdminId = campaign.memberships[0]?.userId;
  if (!campaignAdminId) {
    return NextResponse.json(
      { error: "Campaign is not accepting donations at this time." },
      { status: 503, headers: NO_STORE },
    );
  }

  // Campaign must have completed Stripe Connect onboarding
  if (!campaign.stripeConnectedAccountId || !campaign.stripeOnboarded) {
    return NextResponse.json(
      { error: "This campaign has not yet set up online donation processing. Please contact the campaign directly." },
      { status: 503, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422, headers: NO_STORE },
    );
  }

  const {
    amount,
    currency,
    firstName,
    lastName,
    email,
    phone,
    employer,
    anonymous,
    donationPageId,
    fundraisingCampaignId,
  } = parsed.data;

  // If donationPageId provided, verify it belongs to this campaign
  if (donationPageId) {
    const page = await prisma.donationPage.findFirst({
      where: { id: donationPageId, campaignId: campaign.id, deletedAt: null },
      select: { id: true, pageStatus: true },
    });
    if (!page || page.pageStatus !== "active") {
      return NextResponse.json({ error: "Donation page not found or inactive" }, { status: 404, headers: NO_STORE });
    }
  }

  // Find or create a Contact for this donor in the campaign CRM
  const contactId = await findOrCreateContact({
    campaignId: campaign.id,
    firstName,
    lastName,
    email,
    phone,
  });

  const amountCents = Math.round(amount * 100);
  const appFee = amountCents >= MIN_FEE_THRESHOLD_CENTS
    ? donationFeeAmount(amountCents)
    : 0;
  const netAmount = amount - appFee / 100;

  // Create the Donation record before the PaymentIntent so the webhook can find it
  const donation = await prisma.donation.create({
    data: {
      campaignId: campaign.id,
      contactId,
      recordedById: campaignAdminId,
      amount,
      netAmount,
      currency: currency.toUpperCase(),
      donationType: "one_time",
      status: "processing",
      paymentMethod: "stripe_card",
      isAnonymous: anonymous,
      ...(employer ? { metadataJson: { employer } } : {}),
      ...(donationPageId ? { pageId: donationPageId } : {}),
      ...(fundraisingCampaignId ? { fundraisingCampaignId } : {}),
    },
    select: { id: true },
  });

  // Create Stripe PaymentIntent — money flows to campaign's Connect account,
  // Poll City retains application_fee_amount (1.5%).
  const intent = await stripe!.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    description: `Donation to ${campaign.name}`,
    receipt_email: email,
    application_fee_amount: appFee,
    transfer_data: {
      destination: campaign.stripeConnectedAccountId!,
    },
    metadata: {
      campaignId: campaign.id,
      donationId: donation.id,
      ...(contactId ? { contactId } : {}),
      type: "campaign_donation",
    },
    automatic_payment_methods: { enabled: true },
  });

  // Store the PaymentIntent ID on the Donation so the webhook can match it
  await prisma.donation.update({
    where: { id: donation.id },
    data: { paymentIntentId: intent.id },
  });

  return NextResponse.json(
    { clientSecret: intent.client_secret, donationId: donation.id },
    { status: 201, headers: NO_STORE },
  );
}

/**
 * Finds an existing Contact by email within the campaign, or creates one.
 * Returns the contactId.
 */
async function findOrCreateContact(opts: {
  campaignId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<string> {
  const { campaignId, firstName, lastName, email, phone } = opts;

  const existing = await prisma.contact.findFirst({
    where: { campaignId, email, deletedAt: null },
    select: { id: true, funnelStage: true },
  });

  if (existing) {
    // Advance funnel stage if applicable
    if (ADVANCE_TO_DONOR_FROM.has(existing.funnelStage as string)) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: { funnelStage: "donor", lastContactedAt: new Date() },
      });
    }
    return existing.id;
  }

  // Create a new Contact and immediately mark them as a donor
  const created = await prisma.contact.create({
    data: {
      campaignId,
      firstName,
      lastName,
      email,
      ...(phone ? { phone } : {}),
      funnelStage: "donor",
      lastContactedAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}
