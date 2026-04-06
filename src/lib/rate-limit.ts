import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkLimit, isRedisConfigured } from "@/lib/rate-limit-redis";

interface RateLimitRecord {
  timestamps: number[];
}

const localStore = new Map<string, RateLimitRecord>();

type Tier = "auth" | "form" | "read";

const TIER_CONFIG: Record<Tier, { windowMs: number; max: number }> = {
  auth: { windowMs: 60_000, max: 10 },
  form: { windowMs: 3_600_000, max: 5 },
  read: { windowMs: 60_000, max: 100 },
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function localLimit(req: NextRequest, tier: Tier): NextResponse | undefined {
  const ip = getIp(req);
  const config = TIER_CONFIG[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();

  const record = localStore.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < config.windowMs);

  if (record.timestamps.length >= config.max) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(config.windowMs / 1000)),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  record.timestamps.push(now);
  localStore.set(key, record);
  return undefined;
}

async function distributedLimit(req: NextRequest, tier: Tier): Promise<NextResponse | undefined> {
  const ip = getIp(req);

  const limiterName =
    tier === "auth" ? "login" :
    tier === "form" ? "publicForm" :
    "api";

  const outcome = await checkLimit(limiterName, `${limiterName}:${ip}`);
  if (outcome.success) return undefined;

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

export async function rateLimit(req: NextRequest, tier: Tier = "read"): Promise<NextResponse | undefined> {
  if (isRedisConfigured()) {
    return distributedLimit(req, tier);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("[RateLimit] Redis not configured in production; using local fallback limiter.");
  }

  return localLimit(req, tier);
}
