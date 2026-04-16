/**
 * POST /api/fundraising/stripe/subscription
 *
 * Creates a Stripe Customer + Subscription for a recurring campaign donor.
 * Wires the Stripe Subscription ID back to the RecurrencePlan record.
 * Returns clientSecret so the frontend can confirm the first payment
 * with Stripe Elements.
 *
 * Frequency → Stripe interval mapping:
 *   weekly     → week  / 1
 *   biweekly   → week  / 2
 *   monthly    → month / 1
 *   quarterly  → month / 3
 *   annually   → year  / 1
 *
 * Guards: apiAuth + guardCampaignRoute (campaign membership required).
 */

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { stripe } from "@/lib/stripe/connect";
import { DONATION_FEE_RATE } from "@/lib/stripe/platform-fees";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  campaignId:      z.string().min(1),
  recurrencePlanId: z.string().min(1),
  donorEmail:      z.string().email(),
  donorName:       z.string().min(1).max(200),
  amount:          z.number().positive(),   // CAD dollars
  currency:        z.string().length(3).default("CAD"),
  frequency:       z.enum(["weekly", "biweekly", "monthly", "quarterly", "annually"]),
});

type Interval = "day" | "week" | "month" | "year";

function stripeInterval(frequency: string): { interval: Interval; interval_count: number } {
  switch (frequency) {
    case "weekly":    return { interval: "week",  interval_count: 1 };
    case "biweekly":  return { interval: "week",  interval_count: 2 };
    case "monthly":   return { interval: "month", interval_count: 1 };
    case "quarterly": return { interval: "month", interval_count: 3 };
    case "annually":  return { interval: "year",  interval_count: 1 };
    default:          return { interval: "month", interval_count: 1 };
  }
}

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

  const { campaignId, recurrencePlanId, donorEmail, donorName, amount, currency, frequency } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  // Resolve the campaign's Stripe Connect account
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { stripeConnectedAccountId: true, stripeOnboarded: true },
  });

  if (!campaign?.stripeConnectedAccountId || !campaign.stripeOnboarded) {
    return NextResponse.json(
      { error: "This campaign has not completed Stripe onboarding. Visit Fundraising → Settings to connect." },
      { status: 503, headers: NO_STORE },
    );
  }

  // Verify the RecurrencePlan belongs to this campaign.
  const plan = await prisma.recurrencePlan.findFirst({
    where: { id: recurrencePlanId, campaignId },
    select: { id: true, externalSubscriptionId: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Recurrence plan not found" }, { status: 404, headers: NO_STORE });
  }
  if (plan.externalSubscriptionId) {
    return NextResponse.json(
      { error: "This plan already has a Stripe subscription", subscriptionId: plan.externalSubscriptionId },
      { status: 409, headers: NO_STORE },
    );
  }

  // Create or retrieve Stripe Customer by email.
  const existingCustomers = await stripe!.customers.list({ email: donorEmail, limit: 1 });
  const customer = existingCustomers.data.length > 0
    ? existingCustomers.data[0]
    : await stripe!.customers.create({
        email: donorEmail,
        name:  donorName,
        metadata: { campaignId, recurrencePlanId },
      });

  const { interval, interval_count } = stripeInterval(frequency);
  const amountCents = Math.round(amount * 100);

  // Stripe subscription price_data requires an existing Product ID.
  // Create an ephemeral product + price pair, then subscribe to the price.
  const product = await stripe!.products.create({
    name:     `Campaign recurring donation — ${campaignId}`,
    metadata: { campaignId, recurrencePlanId },
  });

  const price = await stripe!.prices.create({
    currency:       currency.toLowerCase(),
    unit_amount:    amountCents,
    recurring:      { interval, interval_count },
    product:        product.id,
    metadata:       { campaignId, recurrencePlanId },
  });

  // Create the Stripe Subscription — money flows to campaign's Connect account.
  // application_fee_percent: Poll City retains 1.5% of each recurring charge.
  const subscription = await stripe!.subscriptions.create({
    customer:           customer.id,
    payment_behavior:   "default_incomplete",
    payment_settings:   { save_default_payment_method: "on_subscription" },
    expand:             ["latest_invoice.payment_intent"],
    application_fee_percent: DONATION_FEE_RATE * 100, // 1.5
    transfer_data: {
      destination: campaign.stripeConnectedAccountId!,
    },
    metadata: { campaignId, recurrencePlanId, type: "campaign_recurring_donation" },
    items: [{ price: price.id }],
  });

  // Extract the client_secret from the first invoice's PaymentIntent.
  // payment_intent is an expanded field; Stripe v22 types don't expose it directly.
  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const pi = (invoice as unknown as { payment_intent?: Stripe.PaymentIntent | null })?.payment_intent ?? null;
  const clientSecret = pi?.client_secret ?? null;

  // Store the Stripe Subscription ID on the RecurrencePlan immediately.
  await prisma.recurrencePlan.update({
    where: { id: recurrencePlanId },
    data:  { externalSubscriptionId: subscription.id },
  });

  return NextResponse.json(
    { subscriptionId: subscription.id, clientSecret },
    { status: 201, headers: NO_STORE },
  );
}
