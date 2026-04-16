/**
 * POST /api/campaigns/[id]/stripe/onboard
 *
 * Creates (or resumes) Stripe Express onboarding for a campaign.
 * Returns a redirect URL to Stripe's hosted onboarding form.
 *
 * After the campaign completes onboarding, Stripe redirects to:
 *   /api/campaigns/[id]/stripe/callback?status=return   (success)
 *   /api/campaigns/[id]/stripe/callback?status=refresh  (session expired — user must re-start)
 *
 * Guards: apiAuth + ADMIN / CAMPAIGN_MANAGER role.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createCampaignOnboardingLink } from "@/lib/stripe/connect";
import prisma from "@/lib/db/prisma";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { forbidden } = await guardCampaignRoute(session!.user.id, params.id, "billing:manage");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, candidateEmail: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404, headers: NO_STORE });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://app.poll.city";
  const returnUrl  = `${baseUrl}/api/campaigns/${params.id}/stripe/callback?status=return`;
  const refreshUrl = `${baseUrl}/api/campaigns/${params.id}/stripe/callback?status=refresh`;

  try {
    const { url, accountId } = await createCampaignOnboardingLink({
      campaignId: campaign.id,
      campaignName: campaign.name,
      email: campaign.candidateEmail,
      returnUrl,
      refreshUrl,
    });

    return NextResponse.json({ url, accountId }, { headers: NO_STORE });
  } catch (e) {
    console.error("[stripe/onboard] Error:", e);
    return NextResponse.json(
      { error: "Failed to create Stripe onboarding link. Please try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
