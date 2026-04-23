import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { stripe } from "@/lib/stripe/connect";

// POST — create/resume Stripe Express Connect onboarding for a print shop
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 503 }
    );
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });

  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "https://app.poll.city";

  let accountId = shop.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      capabilities: {
        transfers: { requested: true },
      },
      ...(shop.email ? { email: shop.email } : {}),
      business_profile: {
        name: shop.name,
        url: shop.website ?? "https://app.poll.city",
      },
      metadata: { printShopId: shop.id },
    });

    accountId = account.id;

    await prisma.printShop.update({
      where: { id: shop.id },
      data: { stripeAccountId: accountId, stripeOnboarded: false },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: `${origin}/vendor/dashboard?stripe=success`,
    refresh_url: `${origin}/vendor/dashboard?stripe=refresh`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}

// GET — check if Stripe onboarding is complete
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!stripe) {
    return NextResponse.json({ onboarded: false, configured: false });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  });

  if (!shop?.stripeAccountId) {
    return NextResponse.json({ onboarded: false, configured: true });
  }

  try {
    const account = await stripe.accounts.retrieve(shop.stripeAccountId);
    const onboarded = account.charges_enabled ?? false;

    if (onboarded && !shop.stripeOnboarded) {
      await prisma.printShop.update({
        where: { userId: session!.user.id },
        data: { stripeOnboarded: true },
      });
    }

    return NextResponse.json({ onboarded, configured: true });
  } catch {
    return NextResponse.json({ onboarded: false, configured: true });
  }
}
