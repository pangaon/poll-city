/** Permissions resolution engine with caching, trust levels, and wildcard support */

import prisma from "@/lib/db/prisma";
import { PERMISSION_TRUST_REQUIREMENTS, DEFAULT_ROLE_TEMPLATES, LEGACY_ROLE_MAP } from "./constants";
import type { Permission, ResolvedPermissions } from "./types";

// ─── In-memory cache (roles change rarely) ──────────────────────────────────

const roleCache = new Map<string, { permissions: string[]; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function getCachedPermissions(campaignRoleId: string): string[] | null {
  const entry = roleCache.get(campaignRoleId);
  if (!entry || Date.now() > entry.expiresAt) {
    roleCache.delete(campaignRoleId);
    return null;
  }
  return entry.permissions;
}

function setCachedPermissions(campaignRoleId: string, permissions: string[]): void {
  roleCache.set(campaignRoleId, { permissions, expiresAt: Date.now() + CACHE_TTL });
}

/** Invalidate cache for a role (call after role permissions are updated) */
export function invalidateRoleCache(campaignRoleId: string): void {
  roleCache.delete(campaignRoleId);
}

// ─── Permission Resolution ──────────────────────────────────────────────────

/** Resolve a user's full permissions for a campaign from their membership */
export async function resolvePermissions(
  userId: string,
  campaignId: string,
): Promise<ResolvedPermissions> {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    include: { campaignRole: true },
  });

  if (!membership) {
    return { permissions: [], trustLevel: 1, roleSlug: "none", roleName: "None", campaignRoleId: null };
  }

  // If membership has a CampaignRole, use its permissions
  if (membership.campaignRole) {
    const cached = getCachedPermissions(membership.campaignRole.id);
    const permissions = cached ?? membership.campaignRole.permissions;
    if (!cached) setCachedPermissions(membership.campaignRole.id, permissions);

    return {
      permissions,
      trustLevel: membership.trustLevel ?? 2,
      roleSlug: membership.campaignRole.slug,
      roleName: membership.campaignRole.name,
      campaignRoleId: membership.campaignRole.id,
    };
  }

  // Fallback: legacy role string -> find matching template
  const legacySlug = LEGACY_ROLE_MAP[membership.role] ?? "volunteer";
  const template = DEFAULT_ROLE_TEMPLATES.find((t) => t.slug === legacySlug);

  return {
    permissions: template?.permissions ?? [],
    trustLevel: membership.trustLevel ?? 2,
    roleSlug: legacySlug,
    roleName: template?.name ?? membership.role,
    campaignRoleId: null,
  };
}

// ─── Permission Checking ────────────────────────────────────────────────────

/** Check if a permission set includes a specific permission (supports wildcards) */
export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;

  // Check wildcard: "contacts:*" matches "contacts:read"
  const [resource] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

/** Check if trust level meets minimum requirement for a permission */
export function meetsTrustRequirement(trustLevel: number, permission: Permission): boolean {
  const required = PERMISSION_TRUST_REQUIREMENTS[permission];
  if (!required) return true; // no trust requirement
  return trustLevel >= required;
}

/** Combined check: has permission AND meets trust requirement */
export function checkAccess(
  resolved: Pick<ResolvedPermissions, "permissions" | "trustLevel">,
  permission: Permission,
): boolean {
  if (!hasPermission(resolved.permissions, permission)) return false;
  if (!meetsTrustRequirement(resolved.trustLevel, permission)) return false;
  return true;
}

/** Check if user has any of the given permissions */
export function hasAnyPermission(permissions: Permission[], required: Permission[]): boolean {
  return required.some((p) => hasPermission(permissions, p));
}

// ─── Route guard helper ──────────────────────────────────────────────────────

import { NextResponse } from "next/server";

/**
 * Drop-in replacement for the legacy two-step pattern:
 *   requirePermission(session.user.role, "perm") + membership.findUnique
 *
 * Usage:
 *   const { resolved, forbidden } = await guardCampaignRoute(userId, campaignId, "contacts:read");
 *   if (forbidden) return forbidden;
 *
 * Returns `forbidden` (a 403 NextResponse) when:
 *   - User is not a member of the campaign
 *   - User lacks the required permission in their campaign role
 * Returns `resolved` with full permission context when access is granted.
 */
export async function guardCampaignRoute(
  userId: string,
  campaignId: string | null | undefined,
  ...requiredPerms: Permission[]
): Promise<{ resolved: Awaited<ReturnType<typeof resolvePermissions>>; forbidden: null } | { resolved: null; forbidden: NextResponse }> {
  if (!campaignId) {
    return { resolved: null, forbidden: NextResponse.json({ error: "campaignId required" }, { status: 400 }) };
  }
  const resolved = await resolvePermissions(userId, campaignId);
  if (!resolved || resolved.roleSlug === "none") {
    return { resolved: null, forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requiredPerms.length > 0 && !resolved.permissions.includes("*")) {
    const hasAny = requiredPerms.some((p) => hasPermission(resolved.permissions as Permission[], p));
    if (!hasAny) {
      return { resolved: null, forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }
  return { resolved, forbidden: null };
}

// ─── Seed default roles for a campaign ──────────────────────────────────────

export async function seedDefaultRoles(campaignId: string): Promise<void> {
  for (const template of DEFAULT_ROLE_TEMPLATES) {
    await prisma.campaignRole.upsert({
      where: { campaignId_slug: { campaignId, slug: template.slug } },
      create: {
        campaignId,
        name: template.name,
        slug: template.slug,
        description: template.description,
        colour: template.colour,
        permissions: template.permissions,
        isSystem: template.isSystem,
        trustFloor: template.trustFloor,
        trustCeiling: template.trustCeiling,
        priority: template.priority,
      },
      update: {}, // don't overwrite if customized
    });
  }
}
