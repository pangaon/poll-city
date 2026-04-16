/**
 * Poll City — Stripe Connect Helpers
 *
 * Shared utilities for working with Stripe Express connected accounts.
 * Used by campaign onboarding and all donation payment routes.
 */

import Stripe from "stripe";
import prisma from "@/lib/db/prisma";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

/**
 * Returns the campaign's Stripe connected account ID, or null if the campaign
 * has not completed Stripe onboarding.
 *
 * Also verifies the account is still active with Stripe (charges_enabled).
 * If the account was disconnected or deauthorized, clears our local record.
 */
export async function getCampaignStripeAccount(
  campaignId: string,
): Promise<string | null> {
  if (!stripe) return null;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { stripeConnectedAccountId: true, stripeOnboarded: true },
  });

  if (!campaign?.stripeConnectedAccountId || !campaign.stripeOnboarded) {
    return null;
  }

  // Verify the account is still active
  try {
    const account = await stripe.accounts.retrieve(campaign.stripeConnectedAccountId);
    if (!account.charges_enabled) {
      // Onboarding incomplete or account restricted — clear our local flag
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { stripeOnboarded: false },
      });
      return null;
    }
    return campaign.stripeConnectedAccountId;
  } catch {
    // Account no longer exists on Stripe
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { stripeConnectedAccountId: null, stripeOnboarded: false },
    });
    return null;
  }
}

/**
 * Creates a Stripe Express account for a campaign (or returns the existing one)
 * and generates an account onboarding link.
 */
export async function createCampaignOnboardingLink(opts: {
  campaignId: string;
  campaignName: string;
  email: string | null;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string; accountId: string }> {
  if (!stripe) throw new Error("Stripe is not configured on this server.");

  const { campaignId, campaignName, email, returnUrl, refreshUrl } = opts;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { stripeConnectedAccountId: true },
  });

  let accountId = campaign?.stripeConnectedAccountId ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      ...(email ? { email } : {}),
      business_profile: {
        name: campaignName,
        url: `https://app.poll.city`,
      },
      metadata: { campaignId },
    });

    accountId = account.id;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { stripeConnectedAccountId: accountId },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return { url: link.url, accountId };
}
