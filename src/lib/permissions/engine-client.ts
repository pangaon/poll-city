/** Client-safe permission checking (no Prisma imports) */

import type { Permission } from "./types";
import { PERMISSION_TRUST_REQUIREMENTS } from "./constants";

/** Check if a permission set includes a specific permission (supports wildcards) */
export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;
  const [resource] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;
  return false;
}

/** Check trust level meets requirement */
export function meetsTrustRequirement(trustLevel: number, permission: Permission): boolean {
  const required = PERMISSION_TRUST_REQUIREMENTS[permission];
  if (!required) return true;
  return trustLevel >= required;
}

/** Combined check */
export function checkAccess(
  permissions: Permission[],
  trustLevel: number,
  permission: Permission,
): boolean {
  return hasPermission(permissions, permission) && meetsTrustRequirement(trustLevel, permission);
}
