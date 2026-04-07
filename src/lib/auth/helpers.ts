import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolvePermissions, checkAccess } from "@/lib/permissions/engine";
import type { ResolvedPermissions, Permission } from "@/lib/permissions/types";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user || session.user.invalidSession) {
    return null;
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session?.user || session.user.invalidSession) return null;
  if (!allowedRoles.includes(session.user.role as Role)) return null;
  return session;
}

export function isAdmin(role: string): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function isManagerOrAbove(role: string): boolean {
  return ([Role.ADMIN, Role.SUPER_ADMIN, Role.CAMPAIGN_MANAGER] as Role[]).includes(role as Role);
}

/**
 * Permission strings follow the format `resource:action` where action is one of:
 * read, write, delete.
 *
 * Example permissions: contacts:read, contacts:write, donations:read, etc.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  CAMPAIGN_MANAGER: [
    "contacts:read", "contacts:write",
    "volunteers:read", "volunteers:write",
    "canvassing:read", "canvassing:write",
    "canvassing:viewMap",
    "gotv:read", "gotv:write",
    "signs:read", "signs:write",
    "polls:read", "polls:write",
    "notifications:read", "notifications:write",
    "analytics:read",
    "import:read", "import:write",
    "export:read",
    "donations:read", "donations:write",
    "budget:read", "budget:write",
    "tasks:read", "tasks:write",
    "events:read", "events:write",
  ],
  VOLUNTEER_LEADER: [
    "contacts:read", "contacts:write",
    "volunteers:read", "volunteers:write",
    "canvassing:read", "canvassing:write",
    "canvassing:viewMap",
    "gotv:read",
    "signs:read", "signs:write",
    "tasks:read", "tasks:write",
    "events:read",
  ],
  VOLUNTEER: [
    "contacts:read",
    "canvassing:read", "canvassing:write",
    "canvassing:viewMap",
    "tasks:read",
  ],
  PUBLIC_USER: [],
};

/**
 * Check whether a role has permission to perform an action.
 * SUPER_ADMIN and ADMIN always return true ("*" wildcard).
 */
export function hasPermission(role: string | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

/**
 * API route guard that requires a specific permission in addition to membership.
 * Returns 403 with a clear message if permission is missing.
 */
export function requirePermission(role: string | null | undefined, permission: string): NextResponse | null {
  if (hasPermission(role, permission)) return null;
  return NextResponse.json(
    { error: "You do not have permission to do this", code: "AUTH_001", permission },
    { status: 403 }
  );
}

/**
 * API route guard — returns session or writes 401/403 response.
 */
export async function apiAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<{ session: Awaited<ReturnType<typeof getSession>>; error?: NextResponse }> {
  const session = await getSession();
  if (!session?.user || session.user.invalidSession) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    return {
      session,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session };
}

// ─── Enterprise permission-aware auth ─────────────────────────────────────

export interface AuthWithPermissions {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  resolved: ResolvedPermissions;
  error?: NextResponse;
}

/**
 * API route guard with granular permission check.
 * Loads the user's campaign role, permissions, and trust level.
 * If `requiredPermission` is provided, returns 403 if not granted.
 */
export async function apiAuthWithPermission(
  req: NextRequest,
  requiredPermission?: Permission,
): Promise<AuthWithPermissions> {
  const session = await getSession();
  if (!session?.user || session.user.invalidSession) {
    return {
      session: session as unknown as AuthWithPermissions["session"],
      resolved: { permissions: [], trustLevel: 1, roleSlug: "none", roleName: "None", campaignRoleId: null },
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const activeCampaignId = session.user.activeCampaignId as string | null;
  if (!activeCampaignId) {
    return {
      session,
      resolved: { permissions: [], trustLevel: 1, roleSlug: "none", roleName: "None", campaignRoleId: null },
      error: NextResponse.json({ error: "No active campaign" }, { status: 403 }),
    };
  }

  const resolved = await resolvePermissions(session.user.id as string, activeCampaignId);

  if (requiredPermission && !checkAccess(resolved, requiredPermission)) {
    return {
      session,
      resolved,
      error: NextResponse.json(
        { error: "You do not have permission to do this", code: "AUTH_001", permission: requiredPermission },
        { status: 403 },
      ),
    };
  }

  return { session, resolved };
}
