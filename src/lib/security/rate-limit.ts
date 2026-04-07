/**
 * In-memory rate limiter with TTL cleanup.
 * Drop-in replacement path: swap Map for Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 60s
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) store.delete(key);
    });
  }, 60_000);
  // Allow Node to exit without waiting for this timer
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

/** 5 requests per 15 minutes */
export function loginRateLimit(ip: string) {
  return rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
}

/** 100 requests per minute */
export function apiPublicRateLimit(ip: string) {
  return rateLimit(`api-public:${ip}`, 100, 60 * 1000);
}

/** 1000 requests per minute */
export function apiAuthRateLimit(userId: string) {
  return rateLimit(`api-auth:${userId}`, 1000, 60 * 1000);
}
