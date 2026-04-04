import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import Stripe from "stripe";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
}) : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();
    if (!plan || !["starter", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const userId = session.user.id;

    // Check if user already has an active subscription
    const existingSub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSub?.status === "active") {
      return NextResponse.json({ error: "Already have active subscription" }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let customer;
    if (existingSub?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(existingSub.stripeCustomerId);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name ?? undefined,
        metadata: { userId },
      });
    }

    // Create checkout session
    const priceId = plan === "starter"
      ? process.env.STRIPE_STARTER_PRICE_ID!
      : process.env.STRIPE_PRO_PRICE_ID!;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: typeof customer === "string" ? customer : customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}