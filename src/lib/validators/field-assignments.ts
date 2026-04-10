import { z } from "zod";
import { AssignmentType, AssignmentStatus, StopStatus, ExceptionType, SupportLevel } from "@prisma/client";

// ─── Create ───────────────────────────────────────────────────────────────────

export const createFieldAssignmentSchema = z.object({
  campaignId: z.string().min(1),
  assignmentType: z.nativeEnum(AssignmentType),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  fieldUnitId: z.string().optional(),        // Turf id — secondary geography override (optional)
  targetWard: z.string().optional(),         // Primary targeting: ward name
  targetPolls: z.array(z.string()).optional(), // Specific poll numbers within the ward; empty = whole ward
  scheduledDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(2000).optional(),
  /**
   * Explicit stop targets.
   * canvass      → contactIds
   * lit_drop     → householdIds
   * sign_install → signIds  (status requested|scheduled)
   * sign_remove  → signIds  (status installed)
   *
   * When omitted and fieldUnitId is present, targets are auto-queried from the campaign.
   */
  targetIds: z.array(z.string()).min(1).optional(),
  // Pre-assignment (optional — can also be set via the assign action later)
  assignedUserId: z.string().optional(),
  assignedVolunteerId: z.string().optional(),
  assignedGroupId: z.string().optional(),
  // Resource package (optional)
  resourcePackage: z
    .object({
      scriptPackageId: z.string().optional(),
      literaturePackageId: z.string().optional(),
      plannedLiteratureQty: z.number().int().min(1).optional(),
      signInventoryItemId: z.string().optional(),
      signsAllocated: z.number().int().min(1).optional(),
    })
    .optional(),
});

// ─── Patch ────────────────────────────────────────────────────────────────────

/**
 * Discriminated union on `action`.
 * Management actions (publish / assign / cancel / update) require canvassing:manage.
 * Field actions (start / complete) require canvassing:write.
 */
export const patchFieldAssignmentSchema = z.discriminatedUnion("action", [
  // CM publishes draft → published
  z.object({ action: z.literal("publish") }),

  // CM assigns to a person/group (published|draft → assigned)
  z.object({
    action: z.literal("assign"),
    assignedUserId: z.string().optional(),
    assignedVolunteerId: z.string().optional(),
    assignedGroupId: z.string().optional(),
  }),

  // Canvasser starts work (assigned → in_progress)
  z.object({ action: z.literal("start") }),

  // Canvasser marks done (in_progress → completed)
  z.object({ action: z.literal("complete") }),

  // CM cancels from any pre-complete state
  z.object({ action: z.literal("cancel") }),

  // CM updates metadata without changing status
  z.object({
    action: z.literal("update"),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    scheduledDate: z.string().datetime({ offset: true }).optional().nullable(),
    fieldUnitId: z.string().optional().nullable(),
    printPacketUrl: z.string().url().optional().nullable(),
  }),
]);

// ─── Stop update ─────────────────────────────────────────────────────────────

/**
 * Body schema for PATCH /api/field-assignments/[id]/stops/[stopId].
 * outcome is validated separately against a type-specific schema in the route
 * handler once the assignment type is known.
 */
export const updateStopSchema = z
  .object({
    status: z.nativeEnum(StopStatus),
    outcome: z.record(z.unknown()).optional(),
    exceptionType: z.nativeEnum(ExceptionType).optional(),
    exceptionNotes: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (d) => d.status !== StopStatus.exception || d.exceptionType !== undefined,
    { message: "exceptionType is required when status is exception", path: ["exceptionType"] },
  );

// Type-specific outcome validators (applied after assignment type is resolved)

export const canvassOutcomeSchema = z
  .object({
    supportLevel: z.nativeEnum(SupportLevel).optional(),
    interactionNotes: z.string().max(2000).optional(),
    doNotContact: z.boolean().optional(),
  })
  .optional();

export const litDropOutcomeSchema = z
  .object({
    delivered: z.boolean(),
    quantity: z.number().int().min(1).optional(),
  })
  .optional();

export const signInstallOutcomeSchema = z
  .object({
    photoUrl: z.string().url().optional(),
    notes: z.string().max(1000).optional(),
  })
  .optional();

export const signRemoveOutcomeSchema = z
  .object({
    photoUrl: z.string().url().optional(),
    condition: z.enum(["good", "damaged", "missing"]).optional(),
    notes: z.string().max(1000).optional(),
  })
  .optional();

// ─── Query params ─────────────────────────────────────────────────────────────

export const listFieldAssignmentsQuerySchema = z.object({
  campaignId: z.string().min(1),
  status: z.nativeEnum(AssignmentStatus).optional(),
  type: z.nativeEnum(AssignmentType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
