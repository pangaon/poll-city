"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Permission } from "./types";
import { hasPermission } from "./engine-client";

interface PermissionsContextValue {
  permissions: Permission[];
  trustLevel: number;
  roleSlug: string;
  roleName: string;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  trustLevel: 2,
  roleSlug: "volunteer",
  roleName: "Volunteer",
});

export function PermissionsProvider({
  children,
  permissions,
  trustLevel,
  roleSlug,
  roleName,
}: {
  children: ReactNode;
  permissions: Permission[];
  trustLevel: number;
  roleSlug: string;
  roleName: string;
}) {
  return (
    <PermissionsContext.Provider value={{ permissions, trustLevel, roleSlug, roleName }}>
      {children}
    </PermissionsContext.Provider>
  );
}

/** Check a single permission against the current user's role */
export function usePermission(permission: Permission): boolean {
  const { permissions } = useContext(PermissionsContext);
  return hasPermission(permissions, permission);
}

/** Get the full permissions context */
export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
