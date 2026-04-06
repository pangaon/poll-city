// Security monitor — injection detection, brute force tracking, anomaly alerting.
// Called from middleware and API routes.

import prisma from "@/lib/db/prisma";

// ─── Injection detection ────────────────────────────────────────────────────

const SQL_PATTERNS = [
  /(\bSELECT\b.*\bFROM\b|\bINSERT\b.*\bINTO\b|\bUPDATE\b.*\bSET\b|\bDELETE\b.*\bFROM\b|\bDROP\b\s+\bTABLE\b|\bUNION\b.*\bSELECT\b)/i,
  /(1\s*=\s*1|'\s*OR\s*'|"\s*OR\s*"|;\s*--)/i,
];

const XSS_PATTERNS = [
  /<script\b/i,
  /javascript\s*:/i,
  /\bon\w+\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|your)\s+instructions/i,
  /you\s+are\s+now\b/i,
  /disregard\s+(your|all|the)/i,
  /forget\s+everything/i,
  /new\s+persona/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+if/i,
  /show\s+me\s+(the\s+)?(system\s+prompt|instructions)/i,
  /override\s+(your|the)\s+(rules|instructions)/i,
  /jailbreak/i,
];

export type InjectionType = "sql" | "xss" | "prompt" | null;

export function detectInjection(input: string): InjectionType {
  if (!input || typeof input !== "string") return null;
  if (SQL_PATTERNS.some((p) => p.test(input))) return "sql";
  if (XSS_PATTERNS.some((p) => p.test(input))) return "xss";
  if (PROMPT_INJECTION_PATTERNS.some((p) => p.test(input))) return "prompt";
  return null;
}

export function detectPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(input));
}

// ─── Security event logging ────────────────────────────────────────────────

export async function logSecurityThreat(args: {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  campaignId?: string | null;
  route?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type: args.type,
        ip: args.ip ?? null,
        userAgent: args.userAgent ?? null,
        userId: args.userId ?? null,
        success: false,
        details: {
          severity: args.severity,
          route: args.route,
          ...(args.details ?? {}),
        } as object,
      },
    });

    // Console alert for high/critical
    if (args.severity === "high" || args.severity === "critical") {
      console.error(
        `[SECURITY ${args.severity.toUpperCase()}] ${args.type} from ${args.ip ?? "unknown"} at ${args.route ?? "unknown"}`,
      );
    }
  } catch (e) {
    console.error("[security/monitor] log failed:", e);
  }
}

// ─── Blocked user-agents (known attack tools) ──────────────────────────────

const BLOCKED_AGENTS = ["sqlmap", "nikto", "nmap", "masscan", "dirbuster", "gobuster", "wfuzz", "hydra"];

export function isBlockedAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return BLOCKED_AGENTS.some((a) => lower.includes(a));
}
