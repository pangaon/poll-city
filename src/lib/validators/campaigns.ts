import { z } from "zod";

export const updateBrandSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  fontPrimary: z.string().max(50).optional(),
  tagline: z.string().max(200).nullish(),
  twitterHandle: z.string().max(50).nullish(),
  facebookUrl: z.string().url().nullish(),
  instagramHandle: z.string().max(50).nullish(),
  logoUrl: z.string().url().nullish(),
  logoPublicId: z.string().nullish(),
  brandKitComplete: z.boolean().optional(),
});

export const updateSecuritySchema = z.object({
  require2FA: z.boolean().optional(),
  allowedIpRanges: z.array(z.string()).optional(),
  sessionTimeoutHours: z.number().int().min(1).max(720).optional(),
});

export const updateCustomizationSchema = z.object({
  customization: z.record(z.unknown()),
});

export const updateCampaignCurrentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  candidateName: z.string().max(200).nullish(),
  candidateTitle: z.string().max(200).nullish(),
  candidateBio: z.string().max(5000).nullish(),
  candidateEmail: z.string().email().nullish(),
  candidatePhone: z.string().max(20).nullish(),
  electionDate: z.string().datetime().nullish(),
  spendingLimit: z.number().min(0).nullish(),
  jurisdiction: z.string().max(200).nullish(),
  websiteUrl: z.string().url().nullish(),
  isPublic: z.boolean().optional(),
  votedDisplayMode: z.enum(["strikethrough", "badge", "hide"]).optional(),
});

export const callCenterIntegrationSchema = z.object({
  provider: z.enum(["callhub", "generic"]),
  name: z.string().min(1).max(200),
  apiKey: z.string().max(500).nullish(),
  apiUrl: z.string().url().nullish(),
});

export const coalitionSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  type: z.string().max(50).optional(),
  contactName: z.string().max(200).nullish(),
  contactEmail: z.string().email().nullish(),
  contactPhone: z.string().max(20).nullish(),
});

export const canvasserLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).nullish(),
  campaignId: z.string().min(1),
});

export const socialPostSchema = z.object({
  campaignId: z.string().min(1),
  accountId: z.string().min(1),
  content: z.string().min(1).max(5000),
  platform: z.enum(["twitter", "facebook", "instagram", "linkedin"]),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  scheduledFor: z.string().datetime().nullish(),
});

export const socialAccountSchema = z.object({
  campaignId: z.string().min(1),
  platform: z.enum(["twitter", "facebook", "instagram", "linkedin"]),
  accountName: z.string().min(1).max(200),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().optional(),
});
