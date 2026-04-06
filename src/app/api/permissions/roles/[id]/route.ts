import { NextRequest, NextResponse } from "next/server";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { invalidateRoleCache } from "@/lib/permissions/engine";

/** GET — Get role details */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuthWithPermission(req, "team:read");
  if (error) return error;

  const role = await prisma.campaignRole.findUnique({
    where: { id: params.id },
    include: { _count: { select: { memberships: true } } },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  return NextResponse.json({ role });
}

/** PATCH — Update role permissions, name, etc. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "team:manage");
  if (error) return error;

  const existing = await prisma.campaignRole.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.colour !== undefined) updates.colour = body.colour;
  if (body.trustFloor !== undefined) updates.trustFloor = Math.max(1, Math.min(5, body.trustFloor));
  if (body.trustCeiling !== undefined) updates.trustCeiling = Math.max(1, Math.min(5, body.trustCeiling));
  if (body.isDefault !== undefined) {
    // Only one default per campaign
    if (body.isDefault) {
      await prisma.campaignRole.updateMany({
        where: { campaignId: existing.campaignId, isDefault: true },
        data: { isDefault: false },
      });
    }
    updates.isDefault = body.isDefault;
  }

  if (body.permissions !== undefined) {
    updates.permissions = (body.permissions as string[]).filter(
      (p) => ALL_PERMISSIONS.includes(p) || p === "*",
    );
  }

  const role = await prisma.campaignRole.update({
    where: { id: params.id },
    data: updates,
  });

  invalidateRoleCache(params.id);

  // Audit log
  await prisma.permissionAuditLog.create({
    data: {
      campaignId: existing.campaignId,
      actorUserId: session.user.id as string,
      action: "role.update",
      before: { name: existing.name, permissions: existing.permissions },
      after: { name: role.name, permissions: role.permissions },
    },
  });

  return NextResponse.json({ role });
}

/** DELETE — Delete a custom role (reassign members first) */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "team:manage");
  if (error) return error;

  const role = await prisma.campaignRole.findUnique({
    where: { id: params.id },
    include: { _count: { select: { memberships: true } } },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 });
  if (role._count.memberships > 0) {
    return NextResponse.json(
      { error: `Reassign ${role._count.memberships} member(s) before deleting this role` },
      { status: 400 },
    );
  }

  await prisma.campaignRole.delete({ where: { id: params.id } });
  invalidateRoleCache(params.id);

  await prisma.permissionAuditLog.create({
    data: {
      campaignId: role.campaignId,
      actorUserId: session.user.id as string,
      action: "role.delete",
      before: { name: role.name, slug: role.slug, permissions: role.permissions },
    },
  });

  return NextResponse.json({ ok: true });
}
