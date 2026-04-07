/**
 * Adoni Error Framework — structured 3-tier error recovery.
 *
 * Tier 1: SILENT AUTO-FIX — low-risk, auto-correctable issues
 *   - trimming whitespace, normalizing postal codes, normalizing phones,
 *     retrying transient requests, basic import cleanup
 *
 * Tier 2: ADONI INTERVENTION — recoverable issues needing user guidance
 *   - duplicates found in uploads, missing literature, missing streets,
 *     malformed columns, incomplete deployment requests, mixed addresses,
 *     volunteer not in campaign, route assignment gaps
 *
 * Tier 3: HARD STOP — must block the action
 *   - permissions violations, cross-campaign boundary risk, compliance/donation
 *     law violations, payment failures, corrupted files, security failures
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ErrorTier = "silent_fix" | "adoni_intervention" | "hard_stop";

export interface AdoniError {
  tier: ErrorTier;
  code: string;
  title: string;
  detail: string;
  /** What Adoni auto-fixed (tier 1 only) */
  autoFixApplied?: string;
  /** Structured suggestions for Adoni to present (tier 2 only) */
  suggestions?: string[];
  /** Whether this blocks the entire operation */
  blocking: boolean;
}

export interface ValidationReport {
  errors: AdoniError[];
  autoFixCount: number;
  interventionCount: number;
  hardStopCount: number;
  canProceed: boolean;
}

// ─── Normalizers (Tier 1 — silent auto-fix) ─────────────────────────────────

/** Normalize Canadian postal code: "m5v2h1" → "M5V 2H1" */
export function normalizePostalCode(raw: string): { value: string; fixed: boolean } {
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
  const match = cleaned.match(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/);
  if (match) {
    const formatted = `${match[1]} ${match[2]}`;
    return { value: formatted, fixed: formatted !== raw };
  }
  return { value: raw.trim(), fixed: false };
}

/** Normalize phone: strip non-digits, keep last 10, format as (416) 555-1234 */
export function normalizePhone(raw: string): { value: string; fixed: boolean } {
  const digits = raw.replace(/\D/g, "");
  const last10 = digits.length > 10 ? digits.slice(-10) : digits;
  if (last10.length === 10) {
    const formatted = `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
    return { value: formatted, fixed: formatted !== raw };
  }
  return { value: raw.trim(), fixed: raw !== raw.trim() };
}

/** Trim whitespace + normalize name casing: "  JOHN   DOE  " → "John Doe" */
export function normalizeName(raw: string): { value: string; fixed: boolean } {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const titled = trimmed.replace(
    /\b([a-zA-Z])([\w']*)/g,
    (_, first: string, rest: string) => first.toUpperCase() + rest.toLowerCase(),
  );
  // Fix common suffixes
  const final = titled.replace(/\bMc([a-z])/g, (_, c: string) => `Mc${c.toUpperCase()}`);
  return { value: final, fixed: final !== raw };
}

/** Normalize email: trim + lowercase */
export function normalizeEmail(raw: string): { value: string; fixed: boolean } {
  const fixed = raw.trim().toLowerCase();
  return { value: fixed, fixed: fixed !== raw };
}

// ─── Validators (classify errors by tier) ───────────────────────────────────

/** Validate a voter list row and return any errors with auto-fixes applied */
export function validateContactRow(
  row: Record<string, string>,
  existingPhones: Set<string>,
  existingEmails: Set<string>,
  campaignId: string,
): { cleaned: Record<string, string>; errors: AdoniError[] } {
  const errors: AdoniError[] = [];
  const cleaned = { ...row };

  // Tier 1: Auto-fix postal code
  if (row.postalCode) {
    const pc = normalizePostalCode(row.postalCode);
    if (pc.fixed) {
      cleaned.postalCode = pc.value;
      errors.push({
        tier: "silent_fix",
        code: "POSTAL_NORMALIZED",
        title: "Postal code normalized",
        detail: `"${row.postalCode}" → "${pc.value}"`,
        autoFixApplied: `Postal code formatted: ${pc.value}`,
        blocking: false,
      });
    }
  }

  // Tier 1: Auto-fix phone
  if (row.phone) {
    const ph = normalizePhone(row.phone);
    if (ph.fixed) {
      cleaned.phone = ph.value;
      errors.push({
        tier: "silent_fix",
        code: "PHONE_NORMALIZED",
        title: "Phone number normalized",
        detail: `"${row.phone}" → "${ph.value}"`,
        autoFixApplied: `Phone formatted: ${ph.value}`,
        blocking: false,
      });
    }
  }

  // Tier 1: Auto-fix name
  if (row.firstName) {
    const n = normalizeName(row.firstName);
    if (n.fixed) cleaned.firstName = n.value;
  }
  if (row.lastName) {
    const n = normalizeName(row.lastName);
    if (n.fixed) cleaned.lastName = n.value;
  }

  // Tier 1: Auto-fix email
  if (row.email) {
    const e = normalizeEmail(row.email);
    if (e.fixed) cleaned.email = e.value;
  }

  // Tier 2: Duplicate detection
  const phoneDigits = cleaned.phone?.replace(/\D/g, "");
  if (phoneDigits && phoneDigits.length === 10 && existingPhones.has(phoneDigits)) {
    errors.push({
      tier: "adoni_intervention",
      code: "DUPLICATE_PHONE",
      title: "Possible duplicate",
      detail: `Phone ${cleaned.phone} already exists in this campaign`,
      suggestions: ["Skip this row", "Update the existing contact", "Import as new (may create duplicate)"],
      blocking: false,
    });
  }

  if (cleaned.email && existingEmails.has(cleaned.email.toLowerCase())) {
    errors.push({
      tier: "adoni_intervention",
      code: "DUPLICATE_EMAIL",
      title: "Possible duplicate",
      detail: `Email ${cleaned.email} already exists in this campaign`,
      suggestions: ["Skip this row", "Update the existing contact", "Import as new (may create duplicate)"],
      blocking: false,
    });
  }

  // Tier 2: Missing required fields
  if (!cleaned.firstName && !cleaned.lastName) {
    errors.push({
      tier: "adoni_intervention",
      code: "MISSING_NAME",
      title: "Missing name",
      detail: "Row has no first name or last name",
      suggestions: ["Skip this row", "Use address as identifier"],
      blocking: false,
    });
  }

  // Tier 2: Missing geography
  if (!cleaned.ward && !cleaned.postalCode && !cleaned.address1) {
    errors.push({
      tier: "adoni_intervention",
      code: "MISSING_GEOGRAPHY",
      title: "No geographic data",
      detail: "Row has no ward, postal code, or address — cannot segment into walk lists",
      suggestions: ["Import anyway (no ward assignment)", "Skip this row"],
      blocking: false,
    });
  }

  // Tier 3: Campaign boundary
  if (row._campaignId && row._campaignId !== campaignId) {
    errors.push({
      tier: "hard_stop",
      code: "CROSS_CAMPAIGN",
      title: "Cross-campaign data detected",
      detail: "This row contains data from a different campaign",
      blocking: true,
    });
  }

  return { cleaned, errors };
}

/** Build a validation report from a collection of errors */
export function buildReport(allErrors: AdoniError[]): ValidationReport {
  const autoFixCount = allErrors.filter((e) => e.tier === "silent_fix").length;
  const interventionCount = allErrors.filter((e) => e.tier === "adoni_intervention").length;
  const hardStopCount = allErrors.filter((e) => e.tier === "hard_stop").length;

  return {
    errors: allErrors,
    autoFixCount,
    interventionCount,
    hardStopCount,
    canProceed: hardStopCount === 0,
  };
}

/** Format a validation report as a message Adoni can relay to the user */
export function formatReportForAdoni(report: ValidationReport): string {
  const parts: string[] = [];

  if (report.autoFixCount > 0) {
    parts.push(`I auto-fixed ${report.autoFixCount} small issue(s) — postal codes, phone formats, name casing.`);
  }

  if (report.interventionCount > 0) {
    // Group by code
    const byCode = new Map<string, AdoniError[]>();
    for (const e of report.errors.filter((e) => e.tier === "adoni_intervention")) {
      const list = byCode.get(e.code) ?? [];
      list.push(e);
      byCode.set(e.code, list);
    }

    for (const [code, errors] of Array.from(byCode.entries())) {
      const first = errors[0];
      parts.push(
        `${errors.length} row(s) need attention: ${first.title}. ${first.detail}` +
          (first.suggestions ? ` Options: ${first.suggestions.join(", ")}.` : ""),
      );
    }
  }

  if (report.hardStopCount > 0) {
    const hardStops = report.errors.filter((e) => e.tier === "hard_stop");
    for (const e of hardStops) {
      parts.push(`BLOCKED: ${e.title} — ${e.detail}. This must be resolved before proceeding.`);
    }
  }

  if (report.canProceed && report.interventionCount === 0) {
    parts.push("Everything looks clean — ready to proceed.");
  }

  return parts.join(" ");
}
