import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";

const DEBUG_COOKIE_NAME = "debug_access";

function authorizedDebugIds(): string[] {
  return [
    process.env.GEORGE_USER_ID,
    process.env.DEBUG_DESIGNATE_1,
    process.env.DEBUG_DESIGNATE_2,
  ].filter((value): value is string => Boolean(value));
}

function debugSecret(): string {
  return process.env.DEBUG_SECRET_KEY ?? "";
}

function hasAuthorizedUserId(userId: string): boolean {
  return authorizedDebugIds().includes(userId);
}

export function hasValidDebugCookieValue(value: string | undefined): boolean {
  const secret = debugSecret();
  if (!secret) return false;
  return value === secret;
}

export async function canRenderDebugToolbarServer(): Promise<boolean> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !hasAuthorizedUserId(userId)) return false;

  const cookieStore = cookies();
  return hasValidDebugCookieValue(cookieStore.get(DEBUG_COOKIE_NAME)?.value);
}

export async function validateDebugAccess(request: NextRequest): Promise<{ ok: true; userId: string } | { ok: false }> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !hasAuthorizedUserId(userId)) return { ok: false };

  const debugCookie = request.cookies.get(DEBUG_COOKIE_NAME)?.value;
  if (!hasValidDebugCookieValue(debugCookie)) return { ok: false };

  return { ok: true, userId };
}

export const DEBUG_ACCESS_COOKIE = DEBUG_COOKIE_NAME;
