import { NextRequest, NextResponse } from "next/server";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { createRoleSchema } from "@/lib/validators/permissions";

/** GET — List all roles for the active campaign */
export async function GET(req: NextRequest) {
  const { session, resolved, error } = await apiAuthWithPermission(req, "team:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  const roles = await prisma.campaignRole.findMany({
    where: { campaignId },
    orderBy: { priority: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  return NextResponse.json({ roles });
}

/** POST — Create a custom role */
export async function POST(req: NextRequest) {
  const { session, resolved, error } = await apiAuthWithPermission(req, "team:manage");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { name, description, colour, permissions, trustFloor, trustCeiling, copyFromRoleId } = parsed.data;

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Check uniqueness
  const existing = await prisma.campaignRole.findUnique({
    where: { campaignId_slug: { campaignId, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
  }

  // If copying from another role, load its permissions
  let finalPermissions: string[] = permissions ?? [];
  if (copyFromRoleId) {
    const source = await prisma.campaignRole.findUnique({ where: { id: copyFromRoleId } });
    if (source) finalPermissions = source.permissions;
  }

  // Validate permissions
  finalPermissions = finalPermissions.filter((p: string) => ALL_PERMISSIONS.includes(p) || p === "*");

  const role = await prisma.campaignRole.create({
    data: {
      campaignId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      colour: colour || "#6b7280",
      permissions: finalPermissions,
      trustFloor: trustFloor ?? 1,
      trustCeiling: trustCeiling ?? 5,
      isSystem: false,
      priority: 50, // custom roles sort after system roles
    },
  });

  // Audit log
  await prisma.permissionAuditLog.create({
    data: {
      campaignId,
      actorUserId: session.user.id as string,
      action: "role.create",
      after: { name: role.name, slug: role.slug, permissions: role.permissions },
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}
