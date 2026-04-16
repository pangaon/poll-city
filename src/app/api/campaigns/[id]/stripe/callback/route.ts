/**
 * GET /api/campaigns/[id]/stripe/callback?status=return|refresh
 *
 * Stripe Connect onboarding return / refresh handler.
 *
 * - status=return  → user completed the Stripe onboarding form. Verify
 *                    charges_enabled and mark stripeOnboarded=true, then
 *                    redirect to the campaign's fundraising settings page.
 *
 * - status=refresh → Stripe's onboarding link expired. Generate a new one
 *                    and redirect the user back to Stripe.
 *
 * No authentication required — Stripe drives the redirect, there is no session
 * cookie in the request. We verify the campaign ID from the path and check the
 * account state directly with Stripe.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/connect";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const status = new URL(req.url).searchParams.get("status");
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://app.poll.city";
  const settingsUrl = `${baseUrl}/fundraising?tab=settings&stripeConnect=1`;

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, stripeConnectedAccountId: true, candidateEmail: true },
  });

  if (!campaign) {
    return NextResponse.redirect(`${baseUrl}/fundraising?stripeError=not_found`);
  }

  // Refresh — generate a new onboarding link and send them back to Stripe
  if (status === "refresh") {
    if (!stripe || !campaign.stripeConnectedAccountId) {
      return NextResponse.redirect(`${baseUrl}/fundraising?stripeError=config`);
    }
    try {
      const link = await stripe.accountLinks.create({
        account: campaign.stripeConnectedAccountId,
        return_url:  `${baseUrl}/api/campaigns/${params.id}/stripe/callback?status=return`,
        refresh_url: `${baseUrl}/api/campaigns/${params.id}/stripe/callback?status=refresh`,
        type: "account_onboarding",
      });
      return NextResponse.redirect(link.url);
    } catch {
      return NextResponse.redirect(`${baseUrl}/fundraising?stripeError=refresh_failed`);
    }
  }

  // Return — verify the account with Stripe and persist the result
  if (status === "return" && campaign.stripeConnectedAccountId && stripe) {
    try {
      const account = await stripe.accounts.retrieve(campaign.stripeConnectedAccountId);
      if (account.charges_enabled) {
        await prisma.campaign.update({
          where: { id: params.id },
          data: { stripeOnboarded: true },
        });
        return NextResponse.redirect(`${settingsUrl}&stripeSuccess=1`);
      } else {
        // Onboarding started but not complete (missing documents, etc.)
        return NextResponse.redirect(`${settingsUrl}&stripeSuccess=0`);
      }
    } catch {
      return NextResponse.redirect(`${baseUrl}/fundraising?stripeError=verify_failed`);
    }
  }

  return NextResponse.redirect(settingsUrl);
}
