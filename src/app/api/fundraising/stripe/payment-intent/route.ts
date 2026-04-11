/**
 * POST /api/fundraising/stripe/payment-intent
 *
 * Creates a Stripe PaymentIntent for a campaign donation.
 * Returns clientSecret for use with Stripe Elements on the frontend.
 * Optionally attaches the intent to an existing Donation record.
 *
 * Guards: apiAuth + guardCampaignRoute (campaign membership required).
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  campaignId:  z.string().min(1),
  amount:      z.number().positive(),            // CAD dollars (e.g. 100.00)
  currency:    z.string().length(3).default("CAD"),
  donationId:  z.string().optional(),            // attach to existing Donation
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 503, headers: NO_STORE },
    );
  }

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422, headers: NO_STORE },
    );
  }

  const { campaignId, amount, currency, donationId, description } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  // If a donationId was provided, verify it belongs to this campaign.
  if (donationId) {
    const donation = await prisma.donation.findFirst({
      where: { id: donationId, campaignId, deletedAt: null },
      select: { id: true },
    });
    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404, headers: NO_STORE });
    }
  }

  const amountCents = Math.round(amount * 100);

  const intent = await stripe.paymentIntents.create({
    amount:      amountCents,
    currency:    currency.toLowerCase(),
    description: description ?? `Campaign donation — ${campaignId}`,
    metadata: {
      campaignId,
      ...(donationId ? { donationId } : {}),
      type: "campaign_donation",
    },
    automatic_payment_methods: { enabled: true },
  });

  // Wire the PaymentIntent ID back to the Donation record immediately.
  if (donationId) {
    await prisma.donation.update({
      where: { id: donationId },
      data:  { paymentIntentId: intent.id, status: "processing" },
    });
  }

  return NextResponse.json(
    { clientSecret: intent.client_secret, paymentIntentId: intent.id },
    { status: 201, headers: NO_STORE },
  );
}
