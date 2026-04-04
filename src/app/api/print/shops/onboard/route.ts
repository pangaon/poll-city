import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  let body: { shopId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }

  const shop = await prisma.printShop.findUnique({ where: { id: body.shopId } });
  if (!shop) {
    return NextResponse.json({ error: "Print shop not found" }, { status: 404 });
  }

  let stripeAccountId = shop.stripeAccountId;
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      business_type: "company",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email: shop.email,
      metadata: {
        printShopId: shop.id,
      },
    });
    stripeAccountId = account.id;

    await prisma.printShop.update({
      where: { id: shop.id },
      data: { stripeAccountId },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${baseUrl}/print/shops/register?refresh=1`,
    return_url: `${baseUrl}/print/shops/register?onboarded=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ data: { url: link.url, accountId: stripeAccountId } });
}
