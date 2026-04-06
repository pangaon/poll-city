import type { NextRequest } from "next/server";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return req.headers.get("x-real-ip") ?? "";
}

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

let warnedSiteKey = false;

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NODE_ENV === "development" && !warnedSiteKey) {
    warnedSiteKey = true;
    console.warn("[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY not set — widget will not render correctly");
  }

  // Fail closed in production unless explicitly running local development.
  if (!secretKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set — skipping in development");
      return true;
    }
    console.error("[Turnstile] TURNSTILE_SECRET_KEY not set — blocking request for security");
    return false;
  }

  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
      cache: "no-store",
    });

    const data = (await response.json()) as TurnstileResponse;
    return data.success === true;
  } catch (error) {
    console.error("[Turnstile] Verification failed:", error);
    return false;
  }
}

export async function verifyTurnstileToken(req: NextRequest, token?: string): Promise<boolean> {
  if (!token || token.trim().length === 0) {
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return verifyTurnstile(token);
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const ip = getClientIp(req);
  if (ip) {
    body.append("remoteip", ip);
  }

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!resp.ok) {
      return false;
    }

    const data = (await resp.json()) as TurnstileResponse;
    return data.success === true;
  } catch {
    return false;
  }
}