"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  Target,
  Pencil,
  Palette,
  Puzzle,
  Link2,
  HelpCircle,
  ThumbsUp,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── types ──────────────────────────────────────────────────────────────────

interface Annotation {
  id: string;
  pagePath: string;
  issueType: string;
  severity: string;
  notes: string | null;
  elementText: string | null;
  status: string;
  createdAt: string;
  createdBy: { name: string | null; email: string | null };
}

// ── constants ──────────────────────────────────────────────────────────────

const ISSUE_TYPES: Record<string, { label: string; color: string }> = {
  bug:      { label: "Bug",         color: "#E24B4A" },
  ux:       { label: "UX Issue",    color: "#EF9F27" },
  copy:     { label: "Copy Error",  color: "#6366f1" },
  design:   { label: "Design",      color: "#8b5cf6" },
  missing:  { label: "Missing",     color: "#0A2342" },
  broken:   { label: "Broken",      color: "#dc2626" },
  question: { label: "Question",    color: "#64748b" },
  positive: { label: "Looks Great", color: "#1D9E75" },
};

const SEVERITIES: Record<string, { label: string; bg: string; text: string; border: string; dot: string; order: number }> = {
  critical: { label: "Critical", bg: "bg-red-100",    text: "text-red-700",    border: "border-red-400",    dot: "#E24B4A", order: 0 },
  high:     { label: "High",     bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-400", dot: "#f97316", order: 1 },
  medium:   { label: "Medium",   bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-400",  dot: "#EF9F27", order: 2 },
  low:      { label: "Low",      bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-400",   dot: "#3b82f6", order: 3 },
  note:     { label: "Note",     bg: "bg-slate-100",  text: "text-slate-700",  border: "border-slate-400",  dot: "#94a3b8", order: 4 },
};

const STATUS_OPTIONS = [
  { value: "open",        label: "Open",        icon: AlertTriangle, color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200" },
  { value: "in_progress", label: "In Progress", icon: Clock,         color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "fixed",       label: "Fixed",       icon: CheckCircle2,  color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { value: "wont_fix",    label: "Won't Fix",   icon: MinusCircle,   color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
] as const;

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── helpers ────────────────────────────────────────────────────────────────

function severityOrder(s: string) {
  return SEVERITIES[s]?.order ?? 99;
}

function IssueIcon({ type, size = 14 }: { type: string; size?: number }) {
  const icons: Record<string, React.ComponentType<{ style?: React.CSSProperties; className?: string }>> = {
    bug: Bug, ux: Target, copy: Pencil, design: Palette,
    missing: Puzzle, broken: Link2, question: HelpCircle, positive: ThumbsUp,
  };
  const Icon = icons[type] ?? Bug;
  const color = ISSUE_TYPES[type]?.color ?? "#64748b";
  return <Icon style={{ color, width: size, height: size }} />;
}

// ── status dropdown ────────────────────────────────────────────────────────

function StatusDropdown({
  currentStatus,
  disabled,
  onChange,
}: {
  currentStatus: string;
  disabled: boolean;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = STATUS_OPTIONS.find((s) => s.value === currentStatus);
  const Icon = current?.icon ?? AlertTriangle;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50",
          current?.bg ?? "bg-white",
          current?.border ?? "border-slate-200",
          current?.color ?? "text-slate-600"
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {current?.label ?? currentStatus}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 w-36"
          >
            {STATUS_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors",
                    opt.color,
                    currentStatus === opt.value && "bg-slate-50"
                  )}
                >
                  <OptIcon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function OpsVerifyPage() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterPage, setFilterPage] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/qa-annotations");
      const data = await res.json();
      setAnnotations(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    open:        annotations.filter((a) => a.status === "open").length,
    in_progress: annotations.filter((a) => a.status === "in_progress").length,
    fixed:       annotations.filter((a) => a.status === "fixed").length,
    wont_fix:    annotations.filter((a) => a.status === "wont_fix").length,
    critical:    annotations.filter((a) => a.severity === "critical" && a.status !== "fixed" && a.status !== "wont_fix").length,
  };

  const pages = Array.from(new Set(annotations.map((a) => a.pagePath))).sort();

  const filtered = annotations
    .filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterPage !== "all" && a.pagePath !== filterPage) return false;
      return true;
    })
    .sort((a, b) => {
      if (severityOrder(a.severity) !== severityOrder(b.severity))
        return severityOrder(a.severity) - severityOrder(b.severity);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/ops/qa-annotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QA Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Browse to any page and click the QA button to annotate
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Open",        value: stats.open,        color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200" },
          { label: "In Progress", value: stats.in_progress, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Fixed",       value: stats.fixed,       color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
          { label: "Won't Fix",   value: stats.wont_fix,    color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
          { label: "Critical",    value: stats.critical,    color: "text-red-700",   bg: "bg-red-100",  border: "border-red-300" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn("rounded-xl border p-3 text-center", stat.bg, stat.border)}
          >
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className={cn("text-xs font-medium", stat.color)}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />

        {["all", "open", "in_progress", "fixed", "wont_fix"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
              filterStatus === s
                ? "bg-[#0A2342] text-white border-[#0A2342]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {s === "all" ? "All" : s === "in_progress" ? "In progress" : s === "wont_fix" ? "Won't fix" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">All severities</option>
          {Object.entries(SEVERITIES).map(([v, s]) => (
            <option key={v} value={v}>{s.label}</option>
          ))}
        </select>

        {pages.length > 0 && (
          <select
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none max-w-[200px]"
          >
            <option value="all">All pages</option>
            {pages.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} annotation{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
          <p className="text-lg font-semibold text-slate-700">
            {annotations.length === 0 ? "No annotations yet" : "Nothing matching these filters"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {annotations.length === 0
              ? "Browse to any page in the app and click the QA button to start"
              : "Try adjusting the filters above"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((ann) => {
              const sev = SEVERITIES[ann.severity];
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === ann.status);
              const StatusIcon = statusOpt?.icon ?? AlertTriangle;

              return (
                <motion.div
                  key={ann.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                  className={cn(
                    "bg-white rounded-xl border shadow-sm overflow-hidden",
                    (ann.status === "fixed" || ann.status === "wont_fix") && "opacity-60"
                  )}
                >
                  <div style={{ height: 3, backgroundColor: sev?.dot ?? "#94a3b8" }} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${ISSUE_TYPES[ann.issueType]?.color ?? "#64748b"}18` }}
                      >
                        <IssueIcon type={ann.issueType} size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {ISSUE_TYPES[ann.issueType]?.label ?? ann.issueType}
                          </span>
                          {sev && (
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", sev.bg, sev.text, sev.border)}>
                              {sev.label}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <code className="text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              {ann.pagePath}
                            </code>
                            <a
                              href={ann.pagePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-[#0A2342] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        {ann.notes && (
                          <p className="text-sm text-slate-700 mb-2">{ann.notes}</p>
                        )}

                        {ann.elementText && (
                          <p className="text-xs text-slate-400 italic line-clamp-1 mb-2">
                            &ldquo;{ann.elementText}&rdquo;
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400">
                          {new Date(ann.createdAt).toLocaleString("en-CA", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                          {ann.createdBy.name && ` · ${ann.createdBy.name}`}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <StatusDropdown
                          currentStatus={ann.status}
                          disabled={updatingId === ann.id}
                          onChange={(s) => updateStatus(ann.id, s)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
