/**
 * POST /api/fundraising/stripe/webhook
 *
 * Stripe webhook handler for CAMPAIGN DONATION events.
 * (Separate from /api/stripe/webhook which handles platform billing.)
 *
 * Register this endpoint in the Stripe Dashboard with its own signing secret
 * stored as STRIPE_FUNDRAISING_WEBHOOK_SECRET.
 *
 * Events handled:
 *   payment_intent.succeeded          → Donation processing → processed
 *   payment_intent.payment_failed     → Donation processing → failed
 *   invoice.payment_succeeded         → Create Donation for recurring charge cycle
 *   invoice.payment_failed            → Increment RecurrencePlan.failureCount
 *   customer.subscription.deleted     → Cancel RecurrencePlan
 *   charge.refunded                   → Update Donation refundedAmount / status
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { refreshDonorProfile } from "@/lib/fundraising/compliance";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

const endpointSecret = process.env.STRIPE_FUNDRAISING_WEBHOOK_SECRET;
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  if (!stripe || !endpointSecret) {
    return NextResponse.json(
      { error: "Fundraising webhook not configured" },
      { status: 500, headers: NO_STORE },
    );
  }

  const body = await req.text();
  const sig  = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400, headers: NO_STORE });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("[fundraising/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400, headers: NO_STORE });
  }

  try {
    switch (event.type) {

      // ── One-time donation: payment succeeded ─────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type !== "campaign_donation") break;

        const donation = await prisma.donation.findFirst({
          where: { paymentIntentId: pi.id, deletedAt: null },
          select: { id: true, campaignId: true, contactId: true },
        });
        if (!donation) break;

        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status:      "processed",
            processedAt: new Date(),
            ...(pi.application_fee_amount != null
              ? { feeAmount: pi.application_fee_amount / 100 }
              : {}),
          },
        });

        if (donation.contactId) {
          await refreshDonorProfile(donation.campaignId, donation.contactId);
        }
        break;
      }

      // ── One-time donation: payment failed ────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type !== "campaign_donation") break;

        const donation = await prisma.donation.findFirst({
          where: { paymentIntentId: pi.id, deletedAt: null },
          select: { id: true },
        });
        if (!donation) break;

        await prisma.donation.update({
          where: { id: donation.id },
          data:  { status: "failed" },
        });
        break;
      }

      // ── Recurring: invoice paid (create a Donation record per cycle) ─────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Only handle campaign recurring subscription invoices.
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof parentSub === "string" ? parentSub : parentSub?.id;
        if (!subscriptionId) break;

        const plan = await prisma.recurrencePlan.findFirst({
          where: { externalSubscriptionId: subscriptionId },
          select: {
            id: true, campaignId: true, contactId: true,
            currency: true,
          },
        });
        if (!plan) break;

        // Stripe v22: payment_intent is not exposed on Invoice type directly.
        // Cast through unknown to access the expanded field at runtime.
        const invoiceRaw = invoice as unknown as { payment_intent?: string | { id: string } | null };
        const piId = typeof invoiceRaw.payment_intent === "string"
          ? invoiceRaw.payment_intent
          : (invoiceRaw.payment_intent as { id: string } | null | undefined)?.id ?? null;

        // Guard against duplicate webhook deliveries.
        if (piId) {
          const existing = await prisma.donation.findFirst({
            where: { paymentIntentId: piId, deletedAt: null },
            select: { id: true },
          });
          if (existing) break;
        }

        // Use the earliest campaign member as the system recorder for webhook donations.
        const membership = await prisma.membership.findFirst({
          where: { campaignId: plan.campaignId },
          orderBy: { joinedAt: "asc" },
          select: { userId: true },
        });
        if (!membership) break;

        const amountPaid = invoice.amount_paid / 100;  // Stripe amounts are in cents

        await prisma.donation.create({
          data: {
            campaignId:       plan.campaignId,
            contactId:        plan.contactId,
            recordedById:     membership.userId,
            amount:           amountPaid,
            feeAmount:        0,
            netAmount:        amountPaid,
            currency:         plan.currency,
            donationType:     "recurring",
            paymentMethod:    "stripe_card",
            isRecurring:      true,
            recurrencePlanId: plan.id,
            paymentIntentId:  piId,
            status:           "processed",
            processedAt:      new Date(),
            donationDate:     new Date(),
            collectedAt:      new Date(),
            complianceStatus: "pending",
          },
        });

        // Reset failure count and record last charge timestamp.
        await prisma.recurrencePlan.update({
          where: { id: plan.id },
          data: {
            lastChargedAt: new Date(),
            failureCount:  0,
          },
        });

        if (plan.contactId) {
          await refreshDonorProfile(plan.campaignId, plan.contactId);
        }
        break;
      }

      // ── Recurring: invoice payment failed ────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof parentSub === "string" ? parentSub : parentSub?.id;
        if (!subscriptionId) break;

        const plan = await prisma.recurrencePlan.findFirst({
          where: { externalSubscriptionId: subscriptionId },
          select: { id: true, failureCount: true },
        });
        if (!plan) break;

        const newFailureCount = (plan.failureCount ?? 0) + 1;

        await prisma.recurrencePlan.update({
          where: { id: plan.id },
          data: {
            failureCount: newFailureCount,
            lastFailedAt: new Date(),
            // Three consecutive failures → mark the plan as failed.
            ...(newFailureCount >= 3 ? { status: "failed" } : {}),
          },
        });
        break;
      }

      // ── Recurring: subscription cancelled ────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const plan = await prisma.recurrencePlan.findFirst({
          where: { externalSubscriptionId: sub.id },
          select: { id: true },
        });
        if (!plan) break;

        await prisma.recurrencePlan.update({
          where: { id: plan.id },
          data: {
            status:             "cancelled",
            cancelledAt:        new Date(),
            cancellationReason: "Cancelled via Stripe",
          },
        });
        break;
      }

      // ── Charge refunded (partial or full) ────────────────────────────────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
        if (!piId) break;

        const donation = await prisma.donation.findFirst({
          where: { paymentIntentId: piId, deletedAt: null },
          select: { id: true, amount: true },
        });
        if (!donation) break;

        const refundedAmount = charge.amount_refunded / 100;
        const isFullRefund   = charge.amount_refunded >= charge.amount;

        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            refundedAmount,
            status: isFullRefund ? "refunded" : "partially_refunded",
          },
        });
        break;
      }

      default:
        // Silently ignore unhandled events — Stripe expects a 200.
        break;
    }
  } catch (err) {
    console.error("[fundraising/webhook] Handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ received: true }, { headers: NO_STORE });
}
