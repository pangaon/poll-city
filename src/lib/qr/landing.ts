import prisma from "@/lib/db/prisma";
import type { QrLandingContext, QrLandingConfig } from "./types";

const PLATFORM_BRANDING = {
  name: "Poll City",
  logoUrl: "/poll-city-logo.png",
  primaryColor: "#0A2342",
};

const DEFAULT_LANDING_CONFIG: QrLandingConfig = {
  headline: "Your Voice Matters",
  subheadline: "Connect with your local community",
  enabledIntents: [
    "keep_updated",
    "support",
    "volunteer",
    "request_sign",
    "more_info",
    "just_browsing",
  ],
  collectFields: ["name", "email", "phone", "postal"],
  thankYouText: "Thank you! We'll be in touch soon.",
};

export async function getQrLandingContext(token: string): Promise<QrLandingContext | null> {
  const qrCode = await prisma.qrCode.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      type: true,
      funnelType: true,
      status: true,
      teaserMode: true,
      locationName: true,
      locationAddress: true,
      landingConfig: true,
      brandOverride: true,
      campaignId: true,
      startAt: true,
      endAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
          candidateName: true,
          candidateTitle: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          tagline: true,
          jurisdiction: true,
          websiteUrl: true,
          isActive: true,
        },
      },
    },
  });

  if (!qrCode) return null;

  // Respect lifecycle dates
  const now = new Date();
  if (qrCode.startAt && qrCode.startAt > now) return null;
  // Expired QR — still show a graceful page (don't return null)
  const isExpired = !!(qrCode.endAt && qrCode.endAt < now);
  const effectiveStatus = isExpired ? "expired" : (qrCode.status as string);

  // Merge landing config with defaults
  const storedConfig = (qrCode.landingConfig as QrLandingConfig | null) ?? {};
  const landingConfig: QrLandingConfig = {
    ...DEFAULT_LANDING_CONFIG,
    ...storedConfig,
  };

  // Apply brand override if campaign is absent
  const brandOverride = qrCode.brandOverride as {
    primaryColor?: string;
    logoUrl?: string;
    candidateName?: string;
  } | null;

  const campaign = qrCode.campaign;
  const campaignPayload = campaign
    ? {
        id: campaign.id,
        name: campaign.name,
        candidateName: brandOverride?.candidateName ?? campaign.candidateName,
        candidateTitle: campaign.candidateTitle,
        primaryColor: brandOverride?.primaryColor ?? campaign.primaryColor,
        secondaryColor: campaign.secondaryColor,
        logoUrl: brandOverride?.logoUrl ?? campaign.logoUrl,
        tagline: campaign.tagline,
        jurisdiction: campaign.jurisdiction,
        websiteUrl: campaign.websiteUrl,
      }
    : null;

  return {
    qrCode: {
      id: qrCode.id,
      token: qrCode.token,
      type: qrCode.type,
      funnelType: qrCode.funnelType,
      locationName: qrCode.locationName,
      locationAddress: qrCode.locationAddress,
      landingConfig,
      status: effectiveStatus,
      teaserMode: qrCode.teaserMode,
    },
    campaign: campaignPayload,
    platformBranding: PLATFORM_BRANDING,
  };
}
