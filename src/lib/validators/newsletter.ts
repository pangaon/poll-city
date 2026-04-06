import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().max(100).nullish(),
  lastName: z.string().max(100).nullish(),
  postalCode: z.string().max(10).nullish(),
  campaignId: z.string().min(1).nullish(),
  officialId: z.string().min(1).nullish(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required (CASL compliance)" }) }),
}).refine(
  (d) => d.campaignId || d.officialId,
  { message: "campaignId or officialId is required" },
);

export const newsletterCampaignSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  bodyHtml: z.string().min(1, "Body is required").max(100000),
  scheduledFor: z.string().datetime().nullish(),
});

export const bulkSubscriberImportSchema = z.object({
  subscribers: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().max(100).nullish(),
    lastName: z.string().max(100).nullish(),
    postalCode: z.string().max(10).nullish(),
  })).min(1).max(5000),
});
