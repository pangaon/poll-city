import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/connect";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe || !endpointSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  try {
    const body = await request.text();
    const sig = headers().get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as "starter" | "pro";

        if (userId && plan && session.subscription) {
          // Retrieve the subscription to get Stripe's actual billing period dates.
          // current_period_start/end removed from Stripe SDK v14+ types — cast to access them.
          type SubWithPeriod = Stripe.Subscription & { current_period_start: number; current_period_end: number };
          const stripeSub = await stripe!.subscriptions.retrieve(session.subscription as string) as SubWithPeriod;
          await prisma.subscription.upsert({
            where: { userId },
            update: {
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              plan,
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
            create: {
              userId,
              plan,
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof parentSub === 'string' ? parentSub : parentSub?.id;

        if (!subscriptionId) break;

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (subscription) {
          // Use Stripe's actual billing period dates, not a hardcoded 30-day offset.
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "active",
              currentPeriodStart: new Date(invoice.period_start * 1000),
              currentPeriodEnd: new Date(invoice.period_end * 1000),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof parentSub === 'string' ? parentSub : parentSub?.id;

        if (!subscriptionId) break;

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "past_due" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const dbSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (dbSub) {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: { status: "canceled" },
          });
        }
        break;
      }

      // GAP-3 fix: sync plan + period when subscriber upgrades/downgrades via portal.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const dbSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!dbSub) break;

        const priceId = sub.items.data[0]?.price.id;
        const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
        const proPriceId = process.env.STRIPE_PRO_PRICE_ID;

        const planMap: Record<string, "starter" | "pro"> = {};
        if (starterPriceId) planMap[starterPriceId] = "starter";
        if (proPriceId) planMap[proPriceId] = "pro";
        const newPlan = priceId ? planMap[priceId] : undefined;

        const subStatus =
          sub.status === "active" ? "active" :
          sub.status === "past_due" ? "past_due" :
          sub.status === "canceled" ? "canceled" : "incomplete";

        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: subStatus,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(((sub as unknown as { current_period_start: number }).current_period_start) * 1000),
            currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000),
            ...(newPlan ? { plan: newPlan } : {}),
          },
        });
        break;
      }

      // GAP-1+2 fix: advance print job status only after Stripe confirms the charge.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type !== "print_job_payment" || !pi.metadata?.printJobId) break;

        await prisma.printJob.updateMany({
          where: { paymentIntentId: pi.id },
          data: { paymentStatus: "paid", status: "in_production" },
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.type !== "print_job_payment" || !pi.metadata?.printJobId) break;

        // Payment failed — job stays "awarded" so the campaign can retry payment.
        await prisma.printJob.updateMany({
          where: { paymentIntentId: pi.id },
          data: { paymentStatus: "pending" },
        });
        break;
      }

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}