import { NextRequest, NextResponse } from "next/server";
import prisma, { Prisma } from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const createRoleSchema = z.object({
  roleType: z.enum(["voter", "donor", "volunteer", "supporter", "staff", "event_attendee", "influencer", "candidate_contact", "vendor_contact"]),
  roleStatus: z.enum(["active", "inactive", "pending"]).default("active"),
  metadataJson: z.record(z.unknown()).optional(),
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
 * GET /api/crm/contacts/[id]/roles
 * List all role profiles for this contact
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyAccess(params.id, session!.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const roles = await prisma.contactRoleProfile.findMany({
    where: { contactId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: roles });
}

/**
 * POST /api/crm/contacts/[id]/roles
 * Assign a role profile to this contact. CAMPAIGN_MANAGER+ only.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyAccess(params.id, session!.user.id,
    ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"]);
  if (!access) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Upsert — one role type per contact
  const role = await prisma.contactRoleProfile.upsert({
    where: { contactId_roleType: { contactId: params.id, roleType: parsed.data.roleType } },
    create: { contactId: params.id, ...parsed.data },
    update: { roleStatus: parsed.data.roleStatus, metadataJson: parsed.data.metadataJson },
  });

  await prisma.contactAuditLog.create({
    data: {
      campaignId: access.contact.campaignId,
      contactId: params.id,
      entityType: "role_profile",
      entityId: role.id,
      action: "created",
      newValueJson: { roleType: parsed.data.roleType, roleStatus: parsed.data.roleStatus },
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ data: role }, { status: 201 });
}
