/**
 * Account lockout after repeated failed login attempts.
 * 5 failures → 15-minute lockout.
 */

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
}

const store = new Map<string, LockoutEntry>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function recordFailedLogin(
  identifier: string,
): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const now = Date.now();
  const entry = store.get(identifier) ?? { failedAttempts: 0, lockedUntil: null };

  // If previously locked but expired, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.failedAttempts = 0;
    entry.lockedUntil = null;
  }

  entry.failedAttempts++;

  if (entry.failedAttempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    store.set(identifier, entry);
    return { locked: true, attemptsRemaining: 0 };
  }

  store.set(identifier, entry);
  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - entry.failedAttempts };
}

export async function isAccountLocked(
  identifier: string,
): Promise<{ locked: boolean; minutesRemaining: number }> {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || !entry.lockedUntil) {
    return { locked: false, minutesRemaining: 0 };
  }

  if (entry.lockedUntil <= now) {
    // Lockout expired — clear it
    entry.failedAttempts = 0;
    entry.lockedUntil = null;
    store.set(identifier, entry);
    return { locked: false, minutesRemaining: 0 };
  }

  const minutesRemaining = Math.ceil((entry.lockedUntil - now) / 60_000);
  return { locked: true, minutesRemaining };
}

export function clearLockout(identifier: string): void {
  store.delete(identifier);
}
