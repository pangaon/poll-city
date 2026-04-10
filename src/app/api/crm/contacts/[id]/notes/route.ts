import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

async function verifyContactCampaignAccess(contactId: string, userId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!contact) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: contact.campaignId } },
  });
  return membership ? { contact, membership } : null;
}

const createNoteSchema = z.object({
  body: z.string().min(1).max(5000),
  noteType: z.enum(["general", "call", "canvass", "email", "event", "complaint", "system"]).default("general"),
  visibility: z.enum(["all_members", "managers_only", "admin_only"]).default("all_members"),
  isPinned: z.boolean().default(false),
});

function visibilityFilter(role: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return undefined; // see all
  if (role === "CAMPAIGN_MANAGER" || role === "VOLUNTEER_LEADER")
    return { visibility: { in: ["all_members", "managers_only"] as ("all_members" | "managers_only")[] } };
  return { visibility: "all_members" as const };
}

/**
 * GET /api/crm/contacts/[id]/notes
 * List notes for a contact — visibility filtered by caller's role
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyContactCampaignAccess(params.id, session!.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filter = visibilityFilter(access.membership.role);

  const notes = await prisma.contactNote.findMany({
    where: {
      contactId: params.id,
      ...(filter ?? {}),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: notes });
}

/**
 * POST /api/crm/contacts/[id]/notes
 * Create a note on a contact
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await verifyContactCampaignAccess(params.id, session!.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { body: noteBody, noteType, visibility, isPinned } = parsed.data;
  const role = access.membership.role;

  // Enforce visibility permissions
  if (visibility === "admin_only" && !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden — only Admins can create admin-only notes" }, { status: 403 });
  }
  if (visibility === "managers_only" && !["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden — insufficient role for this visibility level" }, { status: 403 });
  }

  const note = await prisma.contactNote.create({
    data: {
      campaignId: access.contact.campaignId,
      contactId: params.id,
      body: noteBody,
      noteType,
      visibility,
      isPinned: isPinned && ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(role),
      createdById: session!.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Audit log
  await prisma.contactAuditLog.create({
    data: {
      campaignId: access.contact.campaignId,
      contactId: params.id,
      entityType: "note",
      entityId: note.id,
      action: "created",
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ data: note }, { status: 201 });
}
