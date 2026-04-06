/**
 * API response time monitoring.
 * Target: every API route under 200ms (from POLL-CITY-TRUTH Section 9).
 * Logs slow responses for investigation.
 */

const SLOW_THRESHOLD_MS = 200;

/** Log API response time. Call at the end of every route handler. */
export function logApiTiming(route: string, startTime: number): void {
  const duration = Date.now() - startTime;
  if (duration > SLOW_THRESHOLD_MS) {
    console.warn(`[SLOW API] ${route} took ${duration}ms (target: ${SLOW_THRESHOLD_MS}ms)`);
  }
}

/** Measure and return duration */
export function measureDuration(startTime: number): number {
  return Date.now() - startTime;
}
