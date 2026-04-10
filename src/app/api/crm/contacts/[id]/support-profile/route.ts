import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const patchSupportSchema = z.object({
  supportScore: z.number().int().min(0).max(100).nullable().optional(),
  turnoutLikelihood: z.number().int().min(0).max(100).nullable().optional(),
  persuasionPriority: z.number().int().min(0).max(100).nullable().optional(),
  volunteerPotential: z.number().int().min(0).max(100).nullable().optional(),
  donorPotential: z.number().int().min(0).max(100).nullable().optional(),
  issueAffinityJson: z.record(z.number()).nullable().optional(),
  flagHighValue: z.boolean().optional(),
  flagHighPriority: z.boolean().optional(),
  flagHostile: z.boolean().optional(),
  flagDeceased: z.boolean().optional(),
  flagMoved: z.boolean().optional(),
  flagDuplicateRisk: z.boolean().optional(),
  flagNeedsFollowUp: z.boolean().optional(),
  flagComplianceReview: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).strict();

async function verifyManagerAccess(contactId: string, userId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!contact) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: contact.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) return null;
  return { contact, membership };
}

/**
 * GET /api/crm/contacts/[id]/support-profile
 * Returns the support profile for a contact. Upserts a blank one if none exists.
 * CAMPAIGN_MANAGER+ only.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyManagerAccess(params.id, session!.user.id);
  if (!access) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  const profile = await prisma.supportProfile.upsert({
    where: { contactId: params.id },
    create: { contactId: params.id },
    update: {},
    include: { contact: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ data: profile });
}

/**
 * PATCH /api/crm/contacts/[id]/support-profile
 * Update any combination of scoring fields + flags. CAMPAIGN_MANAGER+ only.
 * Every PATCH writes a ContactAuditLog entry for each changed field.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyManagerAccess(params.id, session!.user.id);
  if (!access) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSupportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Get current state for audit diff
  const before = await prisma.supportProfile.findUnique({ where: { contactId: params.id } });

  // Handle nullable JSON field for Prisma
  const { issueAffinityJson: rawAffinity, ...restData } = parsed.data;
  const issueAffinityJson = rawAffinity === null
    ? Prisma.JsonNull
    : rawAffinity !== undefined
      ? (rawAffinity as unknown as Prisma.InputJsonValue)
      : undefined;

  const sharedData = {
    ...restData,
    ...(issueAffinityJson !== undefined ? { issueAffinityJson } : {}),
    lastAssessedAt: new Date(),
    assessedByUserId: session!.user.id,
  };

  const updated = await prisma.supportProfile.upsert({
    where: { contactId: params.id },
    create: { contactId: params.id, ...sharedData } as Parameters<typeof prisma.supportProfile.upsert>[0]["create"],
    update: sharedData as Parameters<typeof prisma.supportProfile.upsert>[0]["update"],
  });

  // Write one audit entry per changed field
  const changedFields = Object.keys(parsed.data) as Array<keyof typeof parsed.data>;
  const auditEntries = changedFields
    .filter(field => parsed.data[field] !== undefined)
    .map(field => {
      const oldVal = before ? (before as Record<string, unknown>)[field] : undefined;
      const newVal = (parsed.data as Record<string, unknown>)[field];
      return {
        campaignId: access.contact.campaignId,
        contactId: params.id,
        entityType: "support_profile",
        entityId: updated.id,
        action: "updated",
        fieldName: field,
        oldValueJson: oldVal !== undefined ? ({ value: oldVal } as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValueJson: { value: newVal } as unknown as Prisma.InputJsonValue,
        actorUserId: session!.user.id,
        source: "manual",
      };
    });

  if (auditEntries.length > 0) {
    await prisma.contactAuditLog.createMany({ data: auditEntries });
  }

  return NextResponse.json({ data: updated });
}
