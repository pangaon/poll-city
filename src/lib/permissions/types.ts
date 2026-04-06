/** Enterprise permissions system types */

export type Permission = string; // format: "resource:action" e.g. "contacts:read"

export interface PermissionDef {
  key: Permission;
  label: string;
  description: string;
  sensitive?: boolean; // shows warning icon in UI
  minTrust?: number; // minimum trust level required even if role has it
}

export interface PermissionGroup {
  id: string;
  label: string;
  icon: string; // lucide icon name
  permissions: PermissionDef[];
}

export interface RoleTemplate {
  slug: string;
  name: string;
  description: string;
  colour: string;
  permissions: Permission[];
  isSystem: boolean;
  trustFloor: number;
  trustCeiling: number;
  priority: number;
}

export interface ResolvedPermissions {
  permissions: Permission[];
  trustLevel: number;
  roleSlug: string;
  roleName: string;
  campaignRoleId: string | null;
}

export const TRUST_LEVELS = [
  { level: 1, label: "Restricted", description: "New joiners. Minimal data access. Adoni shares basics only." },
  { level: 2, label: "Standard", description: "Normal access. Role permissions apply as defined." },
  { level: 3, label: "Trusted", description: "Extended reads. Can see cross-role aggregate data." },
  { level: 4, label: "Senior", description: "Near-full visibility. Campaign manager level data." },
  { level: 5, label: "Full Trust", description: "Admin-level data visibility regardless of role." },
] as const;
