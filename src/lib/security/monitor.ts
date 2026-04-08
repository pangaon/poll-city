// Security monitor — injection detection, brute force tracking, anomaly alerting.
// Called from middleware and API routes.

import prisma from "@/lib/db/prisma";

// ─── Unicode normalisation ───────────────────────────────────────────────────
// Attackers use Cyrillic/Greek lookalikes (е → e, а → a) to bypass regex.
// Normalise to NFC, then transliterate confusables before pattern matching.

function normalizeForDetection(input: string): string {
  // NFC normalisation collapses combining characters
  let s = input.normalize("NFC");
  // Transliterate common Cyrillic/Greek lookalikes to ASCII
  const confusables: [RegExp, string][] = [
    [/[\u0430]/g, "a"], // а → a (Cyrillic)
    [/[\u0435]/g, "e"], // е → e (Cyrillic)
    [/[\u0456]/g, "i"], // і → i (Cyrillic)
    [/[\u043E]/g, "o"], // о → o (Cyrillic)
    [/[\u0440]/g, "r"], // р → r (Cyrillic)
    [/[\u0441]/g, "c"], // с → c (Cyrillic)
    [/[\u0445]/g, "x"], // х → x (Cyrillic)
    [/[\u0440]/g, "r"], // р → r
    [/[\u03B1]/g, "a"], // α → a (Greek)
    [/[\u03B5]/g, "e"], // ε → e (Greek)
    [/[\u03BF]/g, "o"], // ο → o (Greek)
    [/[\u0966-\u096F]/g, ""], // Devanagari digits (noise reduction)
  ];
  for (const [pattern, replacement] of confusables) {
    s = s.replace(pattern, replacement);
  }
  // Collapse zero-width and invisible characters
  s = s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
  // Collapse whitespace variations
  s = s.replace(/\s+/g, " ");
  return s;
}

// ─── Injection patterns ──────────────────────────────────────────────────────

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
  // Classic override attempts
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
  // DAN and persona hijack patterns
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /developer\s+mode/i,
  /god\s+mode/i,
  /unrestricted\s+mode/i,
  /no\s+restrictions/i,
  /without\s+(any\s+)?(restrictions|limits|filters)/i,
  // System prompt extraction attempts
  /repeat\s+(the\s+)?(above|your\s+instructions|system)/i,
  /print\s+(your\s+)?(instructions|prompt|system)/i,
  /what\s+(are\s+)?(your\s+)?(instructions|rules|prompt)/i,
  /translate\s+(your\s+)?(instructions|system\s+prompt)/i,
  /summarize\s+(your\s+)?(instructions|system\s+prompt|rules)/i,
  /write\s+a\s+poem\s+(about|that\s+summarizes)\s+(your|the)\s+(instructions|rules)/i,
  // Roleplay-based escapes
  /in\s+(this\s+)?(roleplay|scenario|story|game)/i,
  /for\s+a\s+(school|class|research)\s+project/i,
  /hypothetically\s+(speaking\s+)?(if\s+you\s+(had\s+no|were\s+free|could))/i,
  /what\s+would\s+you\s+say\s+if\s+you\s+had\s+no/i,
  // Continuation injection
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|system\|>/i,
  /---+\s*(system|instructions|new\s+context)/i,
];

export type InjectionType = "sql" | "xss" | "prompt" | null;

export function detectInjection(input: string): InjectionType {
  if (!input || typeof input !== "string") return null;
  const normalized = normalizeForDetection(input);
  if (SQL_PATTERNS.some((p) => p.test(normalized))) return "sql";
  if (XSS_PATTERNS.some((p) => p.test(normalized))) return "xss";
  if (PROMPT_INJECTION_PATTERNS.some((p) => p.test(normalized))) return "prompt";
  return null;
}

export function detectPromptInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const normalized = normalizeForDetection(input);
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(normalized));
}

// ─── Tool result sanitisation ────────────────────────────────────────────────
// DB data fed back into the agentic loop could contain injection strings placed
// by a bad actor (e.g. a contact's name or notes field).
// Strip known injection triggers before the string re-enters the AI context.

const TOOL_RESULT_STRIP_PATTERNS = [
  /ignore\s+(previous|all|your)\s+instructions/gi,
  /you\s+are\s+now\b/gi,
  /disregard\s+(your|all|the)/gi,
  /forget\s+everything/gi,
  /\bDAN\b/g,
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|system\|>/gi,
  /show\s+me\s+(the\s+)?(system\s+prompt|instructions)/gi,
  /override\s+(your|the)\s+(rules|instructions)/gi,
  /new\s+persona/gi,
  /developer\s+mode/gi,
  /god\s+mode/gi,
];

/**
 * Sanitise a string that came from the database before returning it as a tool
 * result into the Anthropic agentic loop. This prevents indirect prompt
 * injection via crafted contact names, notes, or other user-generated fields.
 */
export function sanitizeForAI(value: string): string {
  let s = value;
  for (const pattern of TOOL_RESULT_STRIP_PATTERNS) {
    s = s.replace(pattern, "[removed]");
  }
  return s;
}

/**
 * Recursively sanitise all string values in a tool result object.
 */
export function sanitizeToolResult(obj: unknown): unknown {
  if (typeof obj === "string") return sanitizeForAI(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeToolResult);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitizeToolResult(v);
    }
    return out;
  }
  return obj;
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

// ─── Write-time sanitization for user-entered text ──────────────────────────
// Applied at the database write boundary for any text field that could later
// be read back by Adoni as a tool result (notes, questions, interaction notes,
// canvass debriefs, etc.).
//
// Goals:
//   1. Normalize Unicode (NFC) — stops homoglyph attacks that bypass pattern matching
//   2. Remove invisible/control characters — zero-width spaces, soft hyphens, etc.
//   3. Neutralize prompt injection triggers — replace known attack strings with [blocked]
//   4. Preserve all legitimate multilingual text — Arabic, Chinese, French, etc.
//   5. Do NOT strip content the user actually wrote — just the injection payload
//
// This is defence-in-depth: the AI layer also sanitizes tool results, but
// write-time sanitization prevents the payload from ever reaching the DB.

const WRITE_TIME_INJECTION_REPLACEMENTS: [RegExp, string][] = [
  [/ignore\s+(previous|all|your)\s+instructions/gi, "[blocked]"],
  [/disregard\s+(your|all|the)\s+(instructions|rules|guidelines)/gi, "[blocked]"],
  [/forget\s+everything\s+(above|before|I\s+told\s+you)/gi, "[blocked]"],
  [/you\s+are\s+now\s+(a\s+|an\s+)?(?:DAN|jailbreak|unrestricted|unfiltered)/gi, "[blocked]"],
  [/\bDAN\b.*?(mode|enabled|activated)/gi, "[blocked]"],
  [/show\s+me\s+(the\s+)?(system\s+prompt|your\s+instructions|your\s+rules)/gi, "[blocked]"],
  [/override\s+(your|the)\s+(rules|safety|guidelines|restrictions)/gi, "[blocked]"],
  [/\[SYSTEM\]\s*:/gi, "[blocked]:"],
  [/\[INST\]\s*:/gi, "[blocked]:"],
  [/<<SYS>>/gi, "[blocked]"],
  [/<\|system\|>/gi, "[blocked]"],
];

/**
 * Sanitize user-provided text before writing to the database.
 *
 * Safe for multilingual content — only targets injection patterns,
 * not language-specific characters.
 *
 * Use this on: notes, questions, interaction notes, debrief fields,
 * canvass intelligence notes, donation notes, any free-text field
 * that could later be read back by Adoni.
 */
export function sanitizeUserText(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  // 1. NFC normalization — collapses combining characters
  let s = value.normalize("NFC");

  // 2. Remove invisible/control characters (zero-width spaces, soft hyphens, BOM, etc.)
  // Keep: tabs (\t), newlines (\n, \r), standard Unicode
  s = s.replace(/[\u200B-\u200D\uFEFF\u00AD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // 3. Neutralize injection triggers — replace with [blocked] marker
  for (const [pattern, replacement] of WRITE_TIME_INJECTION_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }

  return s.trim() || null;
}

// ─── Blocked user-agents (known attack tools) ──────────────────────────────

const BLOCKED_AGENTS = ["sqlmap", "nikto", "nmap", "masscan", "dirbuster", "gobuster", "wfuzz", "hydra"];

export function isBlockedAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return BLOCKED_AGENTS.some((a) => lower.includes(a));
}
