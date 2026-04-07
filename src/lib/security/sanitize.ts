/**
 * Input sanitization helpers — strips script tags, null bytes, dangerous HTML.
 */

const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_RE = /\bon\w+\s*=\s*["'][^"']*["']/gi;
const DANGEROUS_TAGS_RE = /<\/?(?:script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)\b[^>]*>/gi;
const NULL_BYTE_RE = /\0/g;

export function sanitizeInput(input: string): string {
  return input
    .replace(NULL_BYTE_RE, "")
    .replace(SCRIPT_TAG_RE, "")
    .replace(DANGEROUS_TAGS_RE, "")
    .replace(EVENT_HANDLER_RE, "");
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeInput(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }

  return obj;
}
