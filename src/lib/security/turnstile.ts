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

export async function verifyTurnstileToken(req: NextRequest, token?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }

  if (!token || token.trim().length === 0) {
    return false;
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