import { z } from "zod";
import {
  SupportLevel,
  InteractionType,
  InteractionSource,
  ElectionType,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskResolutionType,
  Role,
  DonationStatus,
} from "@prisma/client";

// ─── Auth ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.nativeEnum(Role).optional(),
});

// ─── Campaign ─────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters").max(120),
  description: z.string().max(500).optional(),
  electionType: z.nativeEnum(ElectionType),
  jurisdiction: z.string().max(200).optional(),
  electionDate: z.string().optional().nullable(), // accepts YYYY-MM-DD or full ISO datetime
  candidateName: z.string().max(120).optional(),
  candidateTitle: z.string().max(200).optional(),
  candidateBio: z.string().max(2000).optional(),
  candidateEmail: z.string().email().optional().or(z.literal("")),
  candidatePhone: z.string().max(30).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();
export const publicCandidateQuestionSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Please enter a valid email address"),
  question: z.string().min(5, "Question is required").max(2000),
});

export const publicCandidateSignRequestSchema = z.object({
  address: z.string().min(5, "Address is required").max(300),
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Please enter a valid email address"),
});

export const publicCandidateSupportSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Please enter a valid email address"),
  householdCount: z
    .union([z.string().max(50), z.number().int().nonnegative().max(999)])
    .optional(),
});

export const publicCandidateVolunteerSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
});
// ─── Contact ──────────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  campaignId: z.string().cuid(),
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  phone2: z.string().max(30).optional(),
  address1: z.string().max(200).optional(),
  address2: z.string().max(200).optional(),
  streetNumber: z.string().max(25).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(50).optional(),
  postalCode: z.string().max(10).optional(),
  ward: z.string().max(50).optional(),
  riding: z.string().max(100).optional(),
  supportLevel: z.nativeEnum(SupportLevel).optional(),
  notes: z.string().max(5000).optional(),
  preferredLanguage: z.string().max(10).optional(),
  doNotContact: z.boolean().optional(),
  signRequested: z.boolean().optional(),
  volunteerInterest: z.boolean().optional(),
  issues: z.array(z.string()).optional(),
  followUpNeeded: z.boolean().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  householdId: z.string().cuid().optional().nullable(),
});

export const updateContactSchema = createContactSchema
  .omit({ campaignId: true })
  .partial();

// ─── Interaction ─────────────────────────────────────────────────────────

export const createInteractionSchema = z.object({
  contactId: z.string().cuid("Invalid contact ID"),
  type: z.nativeEnum(InteractionType),
  notes: z.string().max(5000).optional(),
  supportLevel: z.nativeEnum(SupportLevel).optional().nullable(),
  issues: z.array(z.string()).optional(),
  signRequested: z.boolean().optional(),
  volunteerInterest: z.boolean().optional(),
  followUpNeeded: z.boolean().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  doorNumber: z.string().max(20).optional(),
  duration: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // Confidence scoring fields
  source: z.nativeEnum(InteractionSource).optional().default("canvass"),
  isProxy: z.boolean().optional().default(false),
  opponentSign: z.boolean().optional().default(false),
});

// ─── Task ─────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  campaignId: z.string().cuid(),
  contactId: z.string().cuid().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  parentTaskId: z.string().cuid().optional().nullable(),
  title: z.string().min(3, "Task title is required").max(200),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(["weekly", "biweekly", "monthly"]).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema
  .omit({ campaignId: true })
  .extend({
    resolutionType: z.nativeEnum(TaskResolutionType).optional().nullable(),
    resolutionNote: z.string().max(500).optional().nullable(),
  })
  .partial();

export const resolveTaskSchema = z.object({
  resolutionType: z.nativeEnum(TaskResolutionType),
  resolutionNote: z.string().max(500).optional(),
  createFollowUp: z.boolean().optional(),
  followUpTitle: z.string().max(200).optional(),
  followUpDueDays: z.number().int().min(1).max(365).optional(),
  followUpAssignedToId: z.string().cuid().optional().nullable(),
});

// ─── Donation ─────────────────────────────────────────────────────────────

export const updateDonationSchema = z.object({
  status: z.nativeEnum(DonationStatus).optional(),
  notes: z.string().max(2000).optional().nullable(),
  method: z.enum(["cash", "cheque", "credit", "e-transfer"]).optional().nullable(),
});

// ─── Canvass List ─────────────────────────────────────────────────────────

export const createCanvassListSchema = z.object({
  campaignId: z.string().cuid(),
  name: z.string().min(3, "List name is required").max(120),
  description: z.string().max(500).optional(),
  ward: z.string().max(100).optional(),
  targetArea: z.string().max(200).optional(),
  targetSupportLevels: z.array(z.string()).optional(),
});

/** Assign one user (legacy single-assign) */
export const assignCanvassSchema = z.object({
  canvassListId: z.string().cuid(),
  userId: z.string().cuid(),
});

/** Bulk-assign multiple users at once */
export const bulkAssignCanvassSchema = z.object({
  canvassListId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1, "Select at least one person"),
});

// ─── Import ───────────────────────────────────────────────────────────────

export const importContactRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional(),
  address1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  ward: z.string().optional(),
  riding: z.string().optional(),
  supportLevel: z.nativeEnum(SupportLevel).optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ResolveTaskInput = z.infer<typeof resolveTaskSchema>;
export type CreateCanvassListInput = z.infer<typeof createCanvassListSchema>;
export type BulkAssignCanvassInput = z.infer<typeof bulkAssignCanvassSchema>;
export type ImportContactRow = z.infer<typeof importContactRowSchema>;

// ─── Extended Contact (leadership races + full address decomposition) ─────────

export const extendedContactFields = {
  nameTitle: z.string().max(20).optional(),
  middleName: z.string().max(80).optional(),
  nameSuffix: z.string().max(20).optional(),
  gender: z.string().max(30).optional(),
  streetNumberSuffix: z.string().max(10).optional(),
  streetName: z.string().max(200).optional(),
  streetType: z.string().max(30).optional(),
  streetDirection: z.string().max(10).optional(),
  unitApt: z.string().max(30).optional(),
  firstChoice: z.string().max(200).optional(),
  secondChoice: z.string().max(200).optional(),
  membershipSold: z.boolean().optional(),
  isActiveMember: z.boolean().optional(),
  captain: z.string().max(200).optional(),
  subCaptain: z.string().max(200).optional(),
};

// ─── Phone decomposition + electoral districts ─────────────────────────────

export const phoneElectoralFields = {
  phoneAreaCode: z.string().max(10).optional(),
  cellAreaCode: z.string().max(10).optional(),
  email2: z.string().email().optional().or(z.literal("")),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessPhone: z.string().max(30).optional(),
  businessPhoneExt: z.string().max(10).optional(),
  wechat: z.string().max(100).optional(),
  federalDistrict: z.string().max(200).optional(),
  federalPoll: z.string().max(20).optional(),
  provincialDistrict: z.string().max(200).optional(),
  provincialPoll: z.string().max(20).optional(),
  municipalDistrict: z.string().max(200).optional(),
  municipalPoll: z.string().max(20).optional(),
  censusDivision: z.string().max(100).optional(),
  votingLocation: z.string().max(200).optional(),
  votingAddress: z.string().max(300).optional(),
  isDeceased: z.boolean().optional(),
};
