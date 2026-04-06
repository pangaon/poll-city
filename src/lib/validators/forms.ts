import { z } from "zod";

export const createFormSchema = z.object({
  name: z.string().min(1, "Form name is required").max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens").optional(),
  title: z.string().min(1, "Form title is required").max(200),
  description: z.string().max(5000).nullish(),
  templateKey: z.string().max(50).optional(),
  primaryColour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullish(),
  logoUrl: z.string().url().nullish(),
  primaryColour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundUrl: z.string().url().nullish(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  requireAuth: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
  submitLimit: z.number().int().min(1).nullish(),
  opensAt: z.string().datetime().nullish(),
  closesAt: z.string().datetime().nullish(),
  successMessage: z.string().max(1000).optional(),
  successRedirectUrl: z.string().url().nullish(),
  notifyOnSubmit: z.boolean().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  autoCreateContact: z.boolean().optional(),
  defaultTags: z.array(z.string()).optional(),
  defaultSupportLevel: z.string().max(50).optional(),
});

export const createFieldSchema = z.object({
  type: z.enum([
    "text", "email", "phone", "textarea", "select", "multiselect",
    "checkbox", "radio", "date", "number", "file", "heading",
    "paragraph", "divider", "rating", "signature", "address",
    "postal_code", "consent", "name", "hidden",
  ]),
  label: z.string().min(1, "Label is required").max(200),
  placeholder: z.string().max(200).nullish(),
  helpText: z.string().max(500).nullish(),
  defaultValue: z.string().max(500).nullish(),
  required: z.boolean().default(false),
  minLength: z.number().int().min(0).nullish(),
  maxLength: z.number().int().min(1).nullish(),
  minValue: z.number().nullish(),
  maxValue: z.number().nullish(),
  pattern: z.string().max(500).nullish(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).nullish(),
  width: z.enum(["full", "half", "third"]).default("full"),
  crmField: z.string().max(100).nullish(),
  showIf: z.object({
    fieldId: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "not_empty"]),
    value: z.string(),
  }).nullish(),
  content: z.string().max(5000).nullish(),
});

export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().min(1)).min(1),
});
