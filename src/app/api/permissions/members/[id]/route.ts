import { NextRequest, NextResponse } from "next/server";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/** PATCH — Change a member's role or trust level */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "team:manage");
  if (error) return error;

  const membership = await prisma.membership.findUnique({
    where: { id: params.id },
    include: { campaignRole: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  const beforeState: Record<string, string | number | boolean> = {};
  const afterState: Record<string, string | number | boolean> = {};

  // Role change
  if (body.campaignRoleId !== undefined) {
    const newRole = await prisma.campaignRole.findUnique({ where: { id: body.campaignRoleId } });
    if (!newRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Enforce trust bounds
    const currentTrust = body.trustLevel ?? membership.trustLevel ?? 2;
    if (currentTrust < newRole.trustFloor || currentTrust > newRole.trustCeiling) {
      updates.trustLevel = Math.max(newRole.trustFloor, Math.min(newRole.trustCeiling, currentTrust));
    }

    beforeState.role = membership.campaignRole?.name ?? membership.role;
    afterState.role = newRole.name;
    updates.campaignRoleId = body.campaignRoleId;
  }

  // Trust level change
  if (body.trustLevel !== undefined) {
    const newTrust = Math.max(1, Math.min(5, body.trustLevel));
    beforeState.trustLevel = membership.trustLevel;
    afterState.trustLevel = newTrust;
    updates.trustLevel = newTrust;
  }

  // Status change (active / suspended)
  if (body.status !== undefined && ["active", "suspended"].includes(body.status)) {
    beforeState.status = membership.status;
    afterState.status = body.status;
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.membership.update({
    where: { id: params.id },
    data: updates,
    include: { campaignRole: true, user: { select: { name: true, email: true } } },
  });

  // Audit log
  await prisma.permissionAuditLog.create({
    data: {
      campaignId: membership.campaignId,
      actorUserId: session.user.id as string,
      targetUserId: membership.userId,
      action: body.campaignRoleId ? "member.role_change" : body.trustLevel !== undefined ? "member.trust_change" : "member.status_change",
      before: beforeState,
      after: afterState,
      reason: body.reason || null,
    },
  });

  return NextResponse.json({ membership: updated });
}
