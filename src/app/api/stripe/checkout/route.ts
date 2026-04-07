import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
}) : null;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!starterPriceId || !proPriceId || !nextAuthUrl) {
    return NextResponse.json({ error: "Stripe checkout is not fully configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const { session, error } = await apiAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const plan = typeof body === "object" && body !== null && "plan" in body ? (body as Record<string, unknown>).plan : null;
  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const userId = session!.user.id;

  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Already have an active subscription" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  let customer;
  if (existingSub?.stripeCustomerId) {
    customer = await stripe.customers.retrieve(existingSub.stripeCustomerId);
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
      metadata: { userId },
    });
  }

  try {
    const priceId = plan === "starter" ? starterPriceId : proPriceId;
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
      success_url: `${nextAuthUrl}/billing?success=true`,
      cancel_url: `${nextAuthUrl}/billing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}