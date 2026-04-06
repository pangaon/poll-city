import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().max(500).nullish(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
  permissions: z.array(z.string()).default([]),
  trustFloor: z.number().int().min(1).max(5).default(1),
  trustCeiling: z.number().int().min(1).max(5).default(5),
  copyFromRoleId: z.string().nullish(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  permissions: z.array(z.string()).optional(),
  trustFloor: z.number().int().min(1).max(5).optional(),
  trustCeiling: z.number().int().min(1).max(5).optional(),
  isDefault: z.boolean().optional(),
});

export const updateMemberSchema = z.object({
  campaignRoleId: z.string().min(1).optional(),
  trustLevel: z.number().int().min(1).max(5).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  reason: z.string().max(500).nullish(),
});

export const targetedExportSchema = z.object({
  type: z.enum(["contacts", "walklist", "signs", "gotv", "volunteers", "donations"]),
  filters: z.object({
    street: z.string().optional(),
    ward: z.string().optional(),
    supportLevel: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    postalCode: z.string().optional(),
    poll: z.string().optional(),
    notContactedSince: z.string().datetime().optional(),
    hasPhone: z.boolean().optional(),
    hasEmail: z.boolean().optional(),
  }).default({}),
  fields: z.array(z.string()).default([]),
  format: z.enum(["csv", "json"]).default("csv"),
});
