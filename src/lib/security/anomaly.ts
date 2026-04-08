/**
 * Lightweight anomaly detection — no external dependency.
 * Tracks suspicious patterns in memory (resets on deploy).
 *
 * Anomalies trigger a server-side log entry with severity.
 * When Sentry is added, these become alerts.
 */

interface AnomalyRecord {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

const store = new Map<string, AnomalyRecord>();

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

interface AnomalyEvent {
  type: string;
  identifier: string; // IP, userId, or campaignId
  severity: AnomalySeverity;
  details?: Record<string, unknown>;
  threshold: number;   // how many events before alert
  windowMs: number;    // time window
}

export function trackAnomaly(event: AnomalyEvent): boolean {
  const key = `${event.type}:${event.identifier}`;
  const now = Date.now();

  const record = store.get(key) ?? { count: 0, firstSeen: now, lastSeen: now };

  // Reset if outside window
  if (now - record.firstSeen > event.windowMs) {
    record.count = 0;
    record.firstSeen = now;
  }

  record.count++;
  record.lastSeen = now;
  store.set(key, record);

  if (record.count >= event.threshold) {
    const message = `[ANOMALY:${event.severity.toUpperCase()}] ${event.type} | identifier=${event.identifier} | count=${record.count} | window=${event.windowMs}ms`;

    if (event.severity === "critical" || event.severity === "high") {
      console.error(message, event.details ?? {});
    } else {
      console.warn(message, event.details ?? {});
    }

    // When Sentry is added: Sentry.captureMessage(message, event.severity)
    return true; // threshold breached
  }

  return false;
}

// Convenience helpers
export const anomaly = {
  failedLogin: (ip: string) =>
    trackAnomaly({
      type: "failed_login",
      identifier: ip,
      severity: "high",
      threshold: 10,
      windowMs: 60_000,
    }),

  rapidPollVote: (ip: string) =>
    trackAnomaly({
      type: "rapid_poll_vote",
      identifier: ip,
      severity: "medium",
      threshold: 20,
      windowMs: 60_000,
    }),

  suspiciousExport: (userId: string) =>
    trackAnomaly({
      type: "data_export",
      identifier: userId,
      severity: "medium",
      threshold: 5,
      windowMs: 3_600_000,
    }),

  adminActionBurst: (userId: string) =>
    trackAnomaly({
      type: "admin_action_burst",
      identifier: userId,
      severity: "high",
      threshold: 30,
      windowMs: 60_000,
    }),

  aiRequestBurst: (userId: string) =>
    trackAnomaly({
      type: "ai_request_burst",
      identifier: userId,
      severity: "medium",
      threshold: 20,
      windowMs: 60_000,
    }),
};
