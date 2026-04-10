import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import type { ContactRelationshipType } from "@prisma/client";

const INVERSE_MAP: Partial<Record<ContactRelationshipType, ContactRelationshipType>> = {
  parent: "child",
  child: "parent",
  spouse_partner: "spouse_partner",
  sibling: "sibling",
  roommate: "roommate",
  colleague: "colleague",
  volunteer_captain: "other",
  introduced_donor: "other",
  staff_owner: "other",
  candidate_connection: "candidate_connection",
  influencer: "other",
  household_relative: "household_relative",
  other: "other",
};

const createRelSchema = z.object({
  toContactId: z.string().cuid(),
  relationshipType: z.enum([
    "spouse_partner", "parent", "child", "sibling", "roommate",
    "colleague", "volunteer_captain", "introduced_donor", "staff_owner",
    "candidate_connection", "influencer", "household_relative", "other",
  ]),
  strength: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
  source: z.string().optional(),
});

async function verifyAccess(contactId: string, userId: string, minRole?: string[]) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!contact) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: contact.campaignId } },
  });
  if (!membership) return null;
  if (minRole && !minRole.includes(membership.role)) return null;
  return { contact, membership };
}

/**
 * GET /api/crm/contacts/[id]/relationships
 * Returns outgoing + incoming relationships for this contact
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyAccess(params.id, session!.user.id,
    ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"]);
  if (!access) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  const [outgoing, incoming] = await Promise.all([
    prisma.contactRelationship.findMany({
      where: { fromContactId: params.id, isActive: true },
      include: {
        toContact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, supportLevel: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contactRelationship.findMany({
      where: { toContactId: params.id, isActive: true },
      include: {
        fromContact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, supportLevel: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ data: { outgoing, incoming } });
}

/**
 * POST /api/crm/contacts/[id]/relationships
 * Creates a bidirectional relationship between two contacts
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyAccess(params.id, session!.user.id,
    ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"]);
  if (!access) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createRelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { toContactId, relationshipType, strength, notes, source } = parsed.data;

  // Verify the target contact is in the same campaign
  const targetContact = await prisma.contact.findFirst({
    where: { id: toContactId, campaignId: access.contact.campaignId, deletedAt: null },
    select: { id: true },
  });
  if (!targetContact) {
    return NextResponse.json({ error: "Target contact not found in this campaign" }, { status: 404 });
  }

  // Check if relationship already exists
  const existing = await prisma.contactRelationship.findUnique({
    where: {
      campaignId_fromContactId_toContactId_relationshipType: {
        campaignId: access.contact.campaignId,
        fromContactId: params.id,
        toContactId,
        relationshipType,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Relationship already exists", existing }, { status: 409 });
  }

  const inverseType = INVERSE_MAP[relationshipType] ?? "other";

  // Create both directions in a transaction
  const [forward] = await prisma.$transaction([
    prisma.contactRelationship.create({
      data: {
        campaignId: access.contact.campaignId,
        fromContactId: params.id,
        toContactId,
        relationshipType,
        inverseType,
        strength,
        notes,
        source: source ?? "manual",
        createdById: session!.user.id,
      },
    }),
    // Mirror relationship — only if not self-referential
    ...(params.id !== toContactId ? [
      prisma.contactRelationship.upsert({
        where: {
          campaignId_fromContactId_toContactId_relationshipType: {
            campaignId: access.contact.campaignId,
            fromContactId: toContactId,
            toContactId: params.id,
            relationshipType: inverseType,
          },
        },
        create: {
          campaignId: access.contact.campaignId,
          fromContactId: toContactId,
          toContactId: params.id,
          relationshipType: inverseType,
          inverseType: relationshipType,
          strength,
          notes,
          source: source ?? "manual",
          createdById: session!.user.id,
        },
        update: { isActive: true },
      }),
    ] : []),
  ]);

  await prisma.contactAuditLog.create({
    data: {
      campaignId: access.contact.campaignId,
      contactId: params.id,
      entityType: "relationship",
      entityId: forward.id,
      action: "created",
      newValueJson: { toContactId, relationshipType },
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ data: forward }, { status: 201 });
}
