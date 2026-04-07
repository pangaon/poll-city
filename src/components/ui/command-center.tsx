// ─── Poll City Command Center Components ─────────────────────────────────────
// Enterprise operations UI components. Every page MUST use these.
// These complement (not replace) the base UI primitives in @/components/ui.

import React from "react";
import { cn } from "@/lib/utils";
import { T, statusColor, type Severity } from "@/lib/design-tokens";
import { AlertTriangle, CheckCircle2, Info, XCircle, Clock, ChevronRight } from "lucide-react";

// ─── AlertBanner ─────────────────────────────────────────────────────────────
// Full-width, high-contrast alert strip for the top of any page.
// severity: "critical" | "warning" | "inProgress" | "success" | "info"

interface AlertBannerProps {
  severity: Severity;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const ALERT_ICONS: Record<Severity, React.ElementType> = {
  critical: XCircle,
  warning: AlertTriangle,
  inProgress: Clock,
  success: CheckCircle2,
  info: Info,
  inactive: Info,
};

export function AlertBanner({ severity, children, action, dismissible, onDismiss, className }: AlertBannerProps) {
  const c = statusColor(severity);
  const Icon = ALERT_ICONS[severity];

  return (
    <div
      className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border", className)}
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: c.fill }} />
      <div className="flex-1 text-sm font-medium">{children}</div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-bold underline underline-offset-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ color: c.text }}
        >
          {action.label}
        </button>
      )}
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 hover:opacity-60 transition-opacity" aria-label="Dismiss">
          <XCircle className="w-4 h-4" style={{ color: c.text }} />
        </button>
      )}
    </div>
  );
}

// ─── MetricCard ──────────────────────────────────────────────────────────────
// Number-first card: the numeric value is the LARGEST element, label is secondary.

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeTrend?: "up" | "down" | "flat";
  severity?: Severity;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  onClick?: () => void;
  className?: string;
}

export function MetricCard({ label, value, change, changeTrend, severity = "info", icon, prefix, suffix, onClick, className }: MetricCardProps) {
  const c = statusColor(severity);
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      className={cn(
        "bg-white rounded-lg border p-4 text-left transition-all",
        onClick && "hover:shadow-md cursor-pointer active:scale-[0.98]",
        className,
      )}
      style={{ borderColor: T.color.border.default }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.color.text.tertiary }}>
          {label}
        </p>
        {icon && (
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: c.bg, color: c.fill }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 font-extrabold leading-none" style={{ fontSize: T.font.metric.size, letterSpacing: T.font.metric.tracking, color: T.color.text.primary }}>
        {prefix}{formattedValue}{suffix}
      </p>
      {change && (
        <p className="mt-1.5 text-xs font-medium" style={{
          color: changeTrend === "up" ? T.color.success.text
            : changeTrend === "down" ? T.color.critical.text
            : T.color.text.tertiary,
        }}>
          {changeTrend === "up" && "+"}{change}
        </p>
      )}
    </Wrapper>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
// Compact status indicator with dot + label.

interface StatusBadgeProps {
  severity: Severity;
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ severity, children, size = "sm", className }: StatusBadgeProps) {
  const c = statusColor(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.fill }} />
      {children}
    </span>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
// Consistent section titles with optional action slot.

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, badge, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-bold" style={{ fontSize: T.font.h2.size, letterSpacing: T.font.h2.tracking, color: T.color.text.primary }}>
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="mt-0.5 text-sm" style={{ color: T.color.text.secondary }}>{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ─── DataTable ───────────────────────────────────────────────────────────────
// Consistent tabular data display with fixed header style.

interface Column<R> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: R, idx: number) => React.ReactNode;
}

interface DataTableProps<R> {
  columns: Column<R>[];
  data: R[];
  rowKey: (row: R, idx: number) => string;
  emptyLabel?: string;
  compact?: boolean;
  className?: string;
}

export function DataTable<R>({ columns, data, rowKey, emptyLabel = "No data", compact, className }: DataTableProps<R>) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)} style={{ borderColor: T.color.border.default }}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: T.color.surface.inset }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  compact ? "px-3 py-2" : "px-4 py-3",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
                style={{ color: T.color.text.tertiary, width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: T.color.border.subtle }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-sm" style={{ color: T.color.text.tertiary }}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={rowKey(row, idx)} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "text-sm",
                      compact ? "px-3 py-2" : "px-4 py-3",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                    style={{ color: T.color.text.primary }}
                  >
                    {col.render
                      ? col.render(row, idx)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── ActionButton ────────────────────────────────────────────────────────────
// Command center action button with optional severity coloring.

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  severity?: Severity;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function ActionButton({ severity = "info", icon, size = "md", children, className, ...props }: ActionButtonProps) {
  const c = statusColor(severity);
  const sizes = {
    sm: "text-xs px-3 py-1.5 h-7",
    md: "text-sm px-4 py-2 h-9",
    lg: "text-sm px-5 py-2.5 h-10",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all active:scale-[0.97]",
        sizes[size],
        className,
      )}
      style={{ background: c.fill, color: "#FFFFFF" }}
      {...props}
    >
      {icon}{children}
    </button>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
// Horizontal progress bar with semantic coloring.

interface ProgressBarProps {
  value: number; // 0-100
  severity?: Severity;
  height?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, severity, height = "md", showLabel, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 90 ? "success" : pct > 0 ? "inProgress" : "inactive";
  const c = statusColor(severity ?? auto);
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full rounded-full overflow-hidden", heights[height])} style={{ background: T.color.surface.inset }}>
        <div
          className={cn("h-full rounded-full transition-all duration-700")}
          style={{ width: `${pct}%`, background: c.fill }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs font-semibold" style={{ color: c.text }}>{pct}%</p>
      )}
    </div>
  );
}

// ─── LiveStatusBar ───────────────────────────────────────────────────────────
// Horizontal strip showing key KPIs in a row.

interface KPI {
  label: string;
  value: string | number;
  severity?: Severity;
}

interface LiveStatusBarProps {
  kpis: KPI[];
  className?: string;
}

export function LiveStatusBar({ kpis, className }: LiveStatusBarProps) {
  return (
    <div
      className={cn("flex items-center gap-0 rounded-lg border overflow-hidden divide-x", className)}
      style={{ borderColor: T.color.border.default, background: T.color.surface.card }}
    >
      {kpis.map((kpi) => {
        const c = statusColor(kpi.severity ?? "info");
        return (
          <div key={kpi.label} className="flex-1 px-4 py-2.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: T.color.text.tertiary }}>
              {kpi.label}
            </p>
            <p className="text-lg font-extrabold leading-tight truncate" style={{ color: c.fill }}>
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── QuickAction ─────────────────────────────────────────────────────────────
// Clickable action tile for command center quick-action strips.

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function QuickAction({ icon, label, description, onClick, href, className }: QuickActionProps) {
  const inner = (
    <>
      <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: T.color.info.bg, color: T.color.info.fill }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: T.color.text.primary }}>{label}</p>
        {description && <p className="text-xs truncate" style={{ color: T.color.text.tertiary }}>{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: T.color.text.tertiary }} />
    </>
  );

  const classes = cn(
    "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-sm active:scale-[0.98] cursor-pointer",
    className,
  );
  const style = { borderColor: T.color.border.default, background: T.color.surface.card };

  if (href) {
    // When used with Next.js Link, wrap QuickAction in <Link>
    return <div className={classes} style={style} onClick={onClick}>{inner}</div>;
  }

  return <button className={classes} style={style} onClick={onClick}>{inner}</button>;
}
