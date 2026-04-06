import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    return NextResponse.json({ error: "NEXTAUTH_URL is not configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const { session, error } = await apiAuth(request);
  if (error) return error;

  const userId = session!.user.id;
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found for this account" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${nextAuthUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Stripe portal error", err);
    return NextResponse.json({ error: "Failed to create customer portal session" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
