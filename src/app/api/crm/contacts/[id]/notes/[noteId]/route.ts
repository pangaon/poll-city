import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

/**
 * DELETE /api/crm/contacts/[id]/notes/[noteId]
 * Delete a note. Own note = any role. Others' notes = ADMIN/CM only.
 * PATCH /api/crm/contacts/[id]/notes/[noteId]
 * Update a note (body, visibility, isPinned). CM+ only for isPinned.
 */

const patchSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
  visibility: z.enum(["all_members", "managers_only", "admin_only"]).optional(),
}).strict();

async function resolveNote(contactId: string, noteId: string, userId: string) {
  const note = await prisma.contactNote.findUnique({
    where: { id: noteId },
    select: { id: true, contactId: true, campaignId: true, createdById: true, visibility: true },
  });
  if (!note || note.contactId !== contactId) return null;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: note.campaignId } },
  });
  if (!membership) return null;

  return { note, membership };
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveNote(params.id, params.noteId, session!.user.id);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { note, membership } = resolved;
  const role = membership.role;
  const isOwner = note.createdById === session!.user.id;
  const canDeleteAny = ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(role);

  if (!isOwner && !canDeleteAny) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.contactNote.delete({ where: { id: params.noteId } });

  await prisma.contactAuditLog.create({
    data: {
      campaignId: note.campaignId,
      contactId: params.id,
      entityType: "note",
      entityId: params.noteId,
      action: "deleted",
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ message: "Note deleted" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveNote(params.id, params.noteId, session!.user.id);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { note, membership } = resolved;
  const role = membership.role;
  const isOwner = note.createdById === session!.user.id;
  const isManager = ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(role);

  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Only managers can pin/unpin
  if (parsed.data.isPinned !== undefined && !isManager) {
    return NextResponse.json({ error: "Forbidden — only Campaign Managers can pin notes" }, { status: 403 });
  }

  const updated = await prisma.contactNote.update({
    where: { id: params.noteId },
    data: parsed.data,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: updated });
}
