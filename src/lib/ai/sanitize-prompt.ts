/**
 * Strips prompt injection attempts from user-supplied text before it reaches Claude.
 *
 * Blocks:
 * - "ignore previous instructions"
 * - "you are now" / "act as" / "pretend you are"
 * - "system prompt" / "your instructions"
 * - Excessive repetition (>200 chars of same char)
 * - Null bytes and control characters
 * - Excessively long inputs
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
  /you\s+are\s+now\s+(a|an|the)\s/gi,
  /act\s+as\s+(a|an|the|if)\s/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /forget\s+(everything|all|your)\s/gi,
  /your\s+(system\s+)?(prompt|instructions?|rules?|constraints?)/gi,
  /\[\s*system\s*\]/gi,
  /\[\s*assistant\s*\]/gi,
  /\[\s*user\s*\]/gi,
  /<\s*system\s*>/gi,
  /disregard\s+(all\s+)?(previous|prior|your)/gi,
  /new\s+(instructions?|task|role|persona)/gi,
];

export function sanitizePrompt(input: string, maxLength = 2000): string | null {
  if (!input || typeof input !== "string") return null;

  // Strip null bytes and control characters (except newline/tab)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Check length
  if (cleaned.length > maxLength) return null; // reject, don't truncate silently

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }

  // Check for excessive repetition (DoS via token inflation)
  const repeatMatch = /(.)\1{200,}/.exec(cleaned);
  if (repeatMatch) return null;

  return cleaned;
}

export function sanitizePromptOrThrow(input: string, maxLength = 2000): string {
  const result = sanitizePrompt(input, maxLength);
  if (result === null) throw new Error("Invalid prompt content");
  return result;
}
