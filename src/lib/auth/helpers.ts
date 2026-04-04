import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session?.user) return null;
  if (!allowedRoles.includes(session.user.role as Role)) return null;
  return session;
}

export function isAdmin(role: string): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function isManagerOrAbove(role: string): boolean {
  return [Role.ADMIN, Role.SUPER_ADMIN, Role.CAMPAIGN_MANAGER].includes(role as Role);
}

/**
 * API route guard — returns session or writes 401/403 response.
 */
export async function apiAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<{ session: Awaited<ReturnType<typeof getSession>>; error?: NextResponse }> {
  const session = await getSession();
  if (!session?.user) {
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
