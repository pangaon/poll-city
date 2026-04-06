/**
 * GET /api/feature-flags — Returns all feature flags for the current campaign's tier.
 * Used by frontend to gate UI elements.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  sanitizeFeatureOverrides,
  TIER_PRICING,
  type Tier,
} from "@/lib/feature-flags/flags";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = (session!.user as { activeCampaignId?: string | null }).activeCampaignId ?? null;

  if (!campaignId) {
    return NextResponse.json({ error: "No active campaign selected" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId,
      },
    },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Determine tier from subscription (default to free)
  let tier: Tier = "free";
  const subscription = await prisma.subscription.findFirst({
    where: { userId: session!.user.id, status: "active" },
    select: { plan: true },
  });
  if (subscription?.plan === "pro") tier = "pro";
  // Enterprise is reserved for managed deployments and explicit internal rollout.

  // Load campaign-level overrides (stored in campaign.customization JSON)
  let overrides: Record<string, boolean> = {};
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customization: true },
  });
  const customization = campaign?.customization as Record<string, unknown> | null;
  overrides = sanitizeFeatureOverrides(customization?.featureOverrides);

  const flags = FEATURE_FLAGS.map((flag) => ({
    key: flag.key,
    label: flag.label,
    description: flag.description,
    category: flag.category,
    enabled: isFeatureEnabled(flag.key, tier, overrides),
    minTier: flag.minTier,
    requiresUpgrade: flag.minTier && !isFeatureEnabled(flag.key, tier, overrides),
  }));

  return NextResponse.json(
    {
      tier,
      pricing: TIER_PRICING,
      flags,
      enabledCount: flags.filter((f) => f.enabled).length,
      totalCount: flags.length,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
