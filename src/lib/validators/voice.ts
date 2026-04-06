import { z } from "zod";

export const createVoiceBroadcastSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["robocall", "voice_drop", "ivr_poll"]),
  audioUrl: z.string().url().nullish(),
  twimlScript: z.string().max(10000).nullish(),
  ivrQuestions: z.array(z.object({
    question: z.string(),
    options: z.record(z.string(), z.string()),
  })).nullish(),
  targetAudience: z.record(z.unknown()).nullish(),
  callerId: z.string().min(10).max(15).nullish(),
  callerIdName: z.string().max(100).nullish(),
  callWindowStart: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  callWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).default("21:30"),
  scheduledFor: z.string().datetime().nullish(),
});

export const phoneBankResultSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
  result: z.enum(["answered", "not_home", "busy", "voicemail", "refused", "wrong_number"]),
  supportLevel: z.enum(["strong_support", "leaning_support", "undecided", "leaning_against", "against"]).nullish(),
  notes: z.string().max(1000).nullish(),
  duration: z.number().int().min(0).nullish(),
});
