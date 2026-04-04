import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of Array.from(store.entries())) {
    record.timestamps = record.timestamps.filter((t) => now - t < 3600_000);
    if (record.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

type Tier = "auth" | "form" | "read";

const TIER_CONFIG: Record<Tier, { windowMs: number; max: number }> = {
  auth: { windowMs: 60_000, max: 10 },       // 10 per minute
  form: { windowMs: 3600_000, max: 5 },      // 5 per hour
  read: { windowMs: 60_000, max: 100 },      // 100 per minute
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimit(req: NextRequest, tier: Tier = "read"): NextResponse | null {
  const ip = getIp(req);
  const config = TIER_CONFIG[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();

  const record = store.get(key) ?? { timestamps: [] };
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
      }
    );
  }

  record.timestamps.push(now);
  store.set(key, record);
  return null;
}
