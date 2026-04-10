import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const patchRoleSchema = z.object({
  roleStatus: z.enum(["active", "inactive", "pending"]).optional(),
  metadataJson: z.record(z.unknown()).nullable().optional(),
}).strict();

/**
 * PATCH /api/crm/contacts/[id]/roles/[roleId]
 * Update role status or metadata. CAMPAIGN_MANAGER+ only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const roleProfile = await prisma.contactRoleProfile.findUnique({
    where: { id: params.roleId },
    select: { id: true, contactId: true },
  });
  if (!roleProfile || roleProfile.contactId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { campaignId: true },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await prisma.contactRoleProfile.update({
    where: { id: params.roleId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/crm/contacts/[id]/roles/[roleId]
 * Remove a role profile. ADMIN+ only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const roleProfile = await prisma.contactRoleProfile.findUnique({
    where: { id: params.roleId },
    select: { id: true, contactId: true },
  });
  if (!roleProfile || roleProfile.contactId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { campaignId: true },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden — ADMIN required to remove role profiles" }, { status: 403 });
  }

  await prisma.contactRoleProfile.delete({ where: { id: params.roleId } });

  return NextResponse.json({ message: "Role profile removed" });
}
