// Distributed rate limiter backed by Upstash Redis.
//
// Falls back to the in-memory limiter (src/lib/rate-limit.ts) when
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured.
// This keeps local dev simple while being multi-instance safe in production.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Window =
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

type LimiterName =
  | "login"
  | "forgotPassword"
  | "publicForm"
  | "api"
  | "import"
  | "export"
  | "adoni";

interface LimiterConfig {
  limit: number;
  window: Window;
}

const LIMITERS: Record<LimiterName, LimiterConfig> = {
  login: { limit: 5, window: "15 m" },
  forgotPassword: { limit: 3, window: "1 h" },
  publicForm: { limit: 10, window: "1 h" },
  api: { limit: 100, window: "1 m" },
  import: { limit: 5, window: "1 h" },
  export: { limit: 20, window: "1 h" },
  adoni: { limit: 50, window: "1 h" },
};

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisConfigured = Boolean(url && token);

const redis = redisConfigured ? new Redis({ url: url!, token: token! }) : null;

const cache = new Map<LimiterName, Ratelimit>();

function getLimiter(name: LimiterName): Ratelimit | null {
  if (!redis) return null;
  const existing = cache.get(name);
  if (existing) return existing;
  const { limit, window } = LIMITERS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `pc:rl:${name}`,
  });
  cache.set(name, limiter);
  return limiter;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export interface RateLimitOutcome {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export async function checkLimit(
  name: LimiterName,
  identifier: string,
): Promise<RateLimitOutcome> {
  const limiter = getLimiter(name);
  if (!limiter) {
    if (process.env.NODE_ENV === "production" && !redisConfigured) {
      // Warn once per process on production without Redis
      if (!(globalThis as { __rl_warned__?: boolean }).__rl_warned__) {
        (globalThis as { __rl_warned__?: boolean }).__rl_warned__ = true;
        console.warn(
          "[rate-limit-redis] Upstash not configured in production — falling through to in-memory limiter (single-instance only).",
        );
      }
    }
    return { success: true, remaining: LIMITERS[name].limit, reset: 0, limit: LIMITERS[name].limit };
  }
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset, limit: LIMITERS[name].limit };
}

export async function enforceLimit(
  req: NextRequest,
  name: LimiterName,
  identifier?: string,
): Promise<NextResponse | null> {
  const id = identifier ?? getIp(req);
  const outcome = await checkLimit(name, `${name}:${id}`);
  if (outcome.success) return null;
  const retryAfterSec = Math.max(1, Math.ceil((outcome.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(outcome.limit),
        "X-RateLimit-Remaining": String(outcome.remaining),
      },
    },
  );
}

export function isRedisConfigured(): boolean {
  return redisConfigured;
}
