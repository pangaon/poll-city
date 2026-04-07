// ─── Poll City Design System — Single Source of Truth ────────────────────────
// Every color, spacing, and typography constant lives here.
// Import T (tokens) from this file — never hardcode hex values elsewhere.

export const T = {
  // ── Semantic Status Colors ──────────────────────────────────────────────────
  // These MUST be used consistently across the entire app.
  color: {
    critical:    { bg: "#FEE2E2", text: "#991B1B", fill: "#DC2626", border: "#FECACA" }, // RED = action required
    warning:     { bg: "#FFF7ED", text: "#9A3412", fill: "#EA580C", border: "#FED7AA" }, // ORANGE = needs attention
    inProgress:  { bg: "#FEFCE8", text: "#854D0E", fill: "#CA8A04", border: "#FEF08A" }, // YELLOW = in progress
    success:     { bg: "#F0FDF4", text: "#166534", fill: "#16A34A", border: "#BBF7D0" }, // GREEN = complete
    info:        { bg: "#EFF6FF", text: "#1E40AF", fill: "#2563EB", border: "#BFDBFE" }, // BLUE = neutral info
    inactive:    { bg: "#F9FAFB", text: "#6B7280", fill: "#9CA3AF", border: "#E5E7EB" }, // GREY = inactive

    // ── Brand ────────────────────────────────────────────────────────────────
    brand:       { primary: "#0F172A", accent: "#2563EB", surface: "#FFFFFF" },

    // ── Surfaces ─────────────────────────────────────────────────────────────
    surface: {
      page:       "#F8FAFC",  // page background
      card:       "#FFFFFF",  // card background
      elevated:   "#FFFFFF",  // modals, dropdowns
      inset:      "#F1F5F9",  // table headers, input backgrounds
      dark:       "#0F172A",  // dark mode / war room
      darkCard:   "#1E293B",  // dark mode card
    },

    // ── Text ─────────────────────────────────────────────────────────────────
    text: {
      primary:    "#0F172A",
      secondary:  "#475569",
      tertiary:   "#94A3B8",
      inverse:    "#FFFFFF",
      link:       "#2563EB",
    },

    // ── Borders ──────────────────────────────────────────────────────────────
    border: {
      default:    "#E2E8F0",
      subtle:     "#F1F5F9",
      focus:      "#2563EB",
    },
  },

  // ── Typography Scale ────────────────────────────────────────────────────────
  // H1 = Command center title, H2 = section titles, H3 = widget/card titles
  // metric = LARGE bold numbers (the most prominent element on any card)
  font: {
    family:       "'Inter', system-ui, -apple-system, sans-serif",
    h1:           { size: "1.5rem",   weight: 800, tracking: "-0.025em", lineHeight: 1.2 },
    h2:           { size: "1.125rem", weight: 700, tracking: "-0.015em", lineHeight: 1.3 },
    h3:           { size: "0.875rem", weight: 600, tracking: "0",        lineHeight: 1.4 },
    body:         { size: "0.875rem", weight: 400, tracking: "0",        lineHeight: 1.5 },
    caption:      { size: "0.75rem",  weight: 500, tracking: "0.01em",   lineHeight: 1.4 },
    label:        { size: "0.6875rem",weight: 600, tracking: "0.05em",   lineHeight: 1.3 },
    metric:       { size: "2rem",     weight: 800, tracking: "-0.03em",  lineHeight: 1 },
    metricLg:     { size: "2.5rem",   weight: 800, tracking: "-0.03em",  lineHeight: 1 },
  },

  // ── Spacing ────────────────────────────────────────────────────────────────
  space: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "0.75rem",   // 12px
    lg: "1rem",      // 16px
    xl: "1.5rem",    // 24px
    xxl: "2rem",     // 32px
  },

  // ── Radii ──────────────────────────────────────────────────────────────────
  radius: {
    sm: "0.375rem",  // 6px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    xl: "1rem",      // 16px
    full: "9999px",
  },

  // ── Shadows ────────────────────────────────────────────────────────────────
  shadow: {
    sm:   "0 1px 2px 0 rgba(0,0,0,0.05)",
    md:   "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
    lg:   "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    none: "none",
  },

  // ── Breakpoints ────────────────────────────────────────────────────────────
  breakpoint: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
} as const;

// ── Helper: get status color set by completion percentage ──────────────────
export function statusByPercent(pct: number) {
  if (pct >= 90) return T.color.success;
  if (pct > 0)  return T.color.inProgress;
  return T.color.inactive;
}

// ── Helper: get status color set by severity ──────────────────────────────
export type Severity = "critical" | "warning" | "inProgress" | "success" | "info" | "inactive";
export function statusColor(severity: Severity) {
  return T.color[severity];
}

// ── Helper: urgency label ─────────────────────────────────────────────────
export function urgencyLabel(daysToElection: number): { label: string; severity: Severity } {
  if (daysToElection <= 3)  return { label: "ELECTION DAY", severity: "critical" };
  if (daysToElection <= 10) return { label: "GOTV FINAL",   severity: "critical" };
  if (daysToElection <= 30) return { label: "GOTV EARLY",   severity: "warning" };
  if (daysToElection <= 90) return { label: "MOMENTUM",     severity: "inProgress" };
  return { label: "FOUNDATION", severity: "info" };
}
