"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  X,
  Save,
  Target,
  Pencil,
  Palette,
  Puzzle,
  Link2,
  HelpCircle,
  ThumbsUp,
  Trash2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── types ────────────────────────────────────────────────────────────────────

interface Annotation {
  id: string;
  pagePath: string;
  posX: number;
  posY: number;
  elementSelector: string | null;
  elementText: string | null;
  issueType: string;
  severity: string;
  notes: string | null;
  status: string;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
}

interface PendingAnnotation {
  posX: number;
  posY: number;
  clientX: number;
  clientY: number;
  elementSelector: string;
  elementText: string;
}

interface AnnotationForm {
  issueType: string;
  severity: string;
  notes: string;
}

// ── constants ────────────────────────────────────────────────────────────────

const ISSUE_TYPES = [
  { value: "bug",      label: "Bug",            icon: Bug,         color: "#E24B4A" },
  { value: "ux",       label: "UX Issue",       icon: Target,      color: "#EF9F27" },
  { value: "copy",     label: "Copy Error",     icon: Pencil,      color: "#6366f1" },
  { value: "design",   label: "Design",         icon: Palette,     color: "#8b5cf6" },
  { value: "missing",  label: "Missing",        icon: Puzzle,      color: "#0A2342" },
  { value: "broken",   label: "Broken",         icon: Link2,       color: "#dc2626" },
  { value: "question", label: "Question",       icon: HelpCircle,  color: "#64748b" },
  { value: "positive", label: "Looks Great",    icon: ThumbsUp,    color: "#1D9E75" },
] as const;

const SEVERITIES = [
  { value: "critical", label: "Critical", bg: "bg-red-100",    text: "text-red-700",    border: "border-red-400",    dot: "#E24B4A" },
  { value: "high",     label: "High",     bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-400", dot: "#f97316" },
  { value: "medium",   label: "Medium",   bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-400",  dot: "#EF9F27" },
  { value: "low",      label: "Low",      bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-400",   dot: "#3b82f6" },
  { value: "note",     label: "Note",     bg: "bg-slate-100",  text: "text-slate-700",  border: "border-slate-400",  dot: "#94a3b8" },
] as const;

const STATUS_OPTIONS = [
  { value: "open",        label: "Open",        color: "text-red-600" },
  { value: "in_progress", label: "In Progress", color: "text-amber-600" },
  { value: "fixed",       label: "Fixed",       color: "text-green-600" },
  { value: "wont_fix",    label: "Won't Fix",   color: "text-slate-500" },
] as const;

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── helpers ───────────────────────────────────────────────────────────────────

function getSeverity(value: string) {
  return SEVERITIES.find((s) => s.value === value) ?? SEVERITIES[2];
}

function getIssueType(value: string) {
  return ISSUE_TYPES.find((t) => t.value === value) ?? ISSUE_TYPES[0];
}

function getElementContext(el: Element): { selector: string; text: string } {
  let sel = el.tagName.toLowerCase();
  if (el.id) {
    sel += `#${el.id}`;
  } else if (el.className && typeof el.className === "string") {
    const cls = el.className
      .split(" ")
      .filter((c) => c && !c.includes(":") && !c.includes("["))
      .slice(0, 3)
      .join(".");
    if (cls) sel += `.${cls}`;
  }
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  return { selector: sel, text };
}

function clampPopover(
  clientX: number,
  clientY: number,
  width: number,
  height: number
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const OFFSET = 16;
  let left = clientX + OFFSET;
  let top = clientY + OFFSET;
  if (left + width > vw - 8) left = clientX - width - OFFSET;
  if (top + height > vh - 8) top = clientY - height - OFFSET;
  left = Math.max(8, left);
  top = Math.max(8, top);
  return { left, top };
}

// ── sub-components ───────────────────────────────────────────────────────────

function PinMarker({
  annotation,
  index,
  onClick,
}: {
  annotation: Annotation;
  index: number;
  onClick: () => void;
}) {
  const sev = getSeverity(annotation.severity);
  const resolved = annotation.status === "fixed" || annotation.status === "wont_fix";

  return (
    <motion.button
      data-qa-ui
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: resolved ? 0.5 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={spring}
      onClick={onClick}
      title={annotation.notes ?? annotation.elementText ?? annotation.issueType}
      style={{
        position: "fixed",
        left: `${annotation.posX * 100}%`,
        top: `${annotation.posY * 100}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 49,
        backgroundColor: sev.dot,
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {index}
    </motion.button>
  );
}

function AnnotationFormPanel({
  pending,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  pending: PendingAnnotation;
  form: AnnotationForm;
  setForm: (f: AnnotationForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const FORM_W = 300;
  const FORM_H = 420;
  const { left, top } = clampPopover(pending.clientX, pending.clientY, FORM_W, FORM_H);

  return (
    <motion.div
      data-qa-ui
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={spring}
      style={{ position: "fixed", left, top, width: FORM_W, zIndex: 52 }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0A2342]">
        <span className="text-sm font-semibold text-white">New annotation</span>
        <button
          data-qa-ui
          onClick={onCancel}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Element context */}
        {pending.elementText && (
          <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              Element
            </p>
            <p className="text-xs text-slate-600 line-clamp-2">{pending.elementText}</p>
          </div>
        )}

        {/* Issue type grid */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Type
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {ISSUE_TYPES.map((t) => {
              const Icon = t.icon;
              const active = form.issueType === t.value;
              return (
                <button
                  key={t.value}
                  data-qa-ui
                  onClick={() => setForm({ ...form, issueType: t.value })}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-2 rounded-lg border text-[10px] font-medium transition-all",
                    active
                      ? "border-current bg-opacity-10"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                  )}
                  style={active ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}15` } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Severity
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {SEVERITIES.map((s) => {
              const active = form.severity === s.value;
              return (
                <button
                  key={s.value}
                  data-qa-ui
                  onClick={() => setForm({ ...form, severity: s.value })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                    active
                      ? `${s.bg} ${s.text} ${s.border}`
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Notes
          </p>
          <textarea
            data-qa-ui
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="What's wrong here? Be specific."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 focus:border-[#0A2342]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            data-qa-ui
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            data-qa-ui
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-semibold bg-[#0A2342] text-white rounded-lg hover:bg-[#0A2342]/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AnnotationDetailPanel({
  annotation,
  onClose,
  onStatusChange,
  onDelete,
}: {
  annotation: Annotation;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const sev = getSeverity(annotation.severity);
  const issue = getIssueType(annotation.issueType);
  const IssueIcon = issue.icon;
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <motion.div
      data-qa-ui
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring}
      style={{ position: "fixed", right: 16, top: "50%", transform: "translateY(-50%)", width: 300, zIndex: 52 }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      {/* Severity bar */}
      <div style={{ height: 4, backgroundColor: sev.dot }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <IssueIcon className="w-4 h-4" style={{ color: issue.color }} />
          <span className="text-sm font-semibold text-slate-800">{issue.label}</span>
          <span
            className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sev.bg, sev.text)}
          >
            {sev.label}
          </span>
        </div>
        <button
          data-qa-ui
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Page */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Page
          </p>
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex-1 truncate">
              {annotation.pagePath}
            </code>
            <a
              data-qa-ui
              href={annotation.pagePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#0A2342] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Element context */}
        {annotation.elementText && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Element
            </p>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 line-clamp-3">
              {annotation.elementText}
            </p>
          </div>
        )}

        {/* Notes */}
        {annotation.notes && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-sm text-slate-700">{annotation.notes}</p>
          </div>
        )}

        {/* Date */}
        <p className="text-[10px] text-slate-400">
          {new Date(annotation.createdAt).toLocaleString("en-CA", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Status */}
        <div className="relative">
          <button
            data-qa-ui
            onClick={() => setShowStatusMenu((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors"
          >
            <span className={STATUS_OPTIONS.find((s) => s.value === annotation.status)?.color}>
              {STATUS_OPTIONS.find((s) => s.value === annotation.status)?.label ?? annotation.status}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <AnimatePresence>
            {showStatusMenu && (
              <motion.div
                data-qa-ui
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    data-qa-ui
                    onClick={() => {
                      onStatusChange(annotation.id, opt.value);
                      setShowStatusMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                      opt.color,
                      annotation.status === opt.value && "font-semibold bg-slate-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete */}
        <button
          data-qa-ui
          onClick={() => {
            if (confirm("Delete this annotation?")) onDelete(annotation.id);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete annotation
        </button>
      </div>
    </motion.div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export function QaOverlay() {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [selected, setSelected] = useState<Annotation | null>(null);
  const [form, setForm] = useState<AnnotationForm>({ issueType: "bug", severity: "medium", notes: "" });
  const [saving, setSaving] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  // Load annotations for current page
  const loadAnnotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/ops/qa-annotations?path=${encodeURIComponent(pathname)}`);
      if (!res.ok) return;
      const data = await res.json();
      setAnnotations(data.data ?? []);
    } catch {
      // silently ignore — don't break the app
    }
  }, [pathname]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Click interception when QA mode is active
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest("[data-qa-ui]")) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const posX = e.clientX / window.innerWidth;
      const posY = e.clientY / window.innerHeight;
      const { selector, text } = getElementContext(target);

      setPending({ posX, posY, clientX: e.clientX, clientY: e.clientY, elementSelector: selector, elementText: text });
      setSelected(null);
    },
    []
  );

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener("click", handleClick, true);
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.body.style.cursor = "";
    };
  }, [isActive, handleClick]);

  // Keyboard handling: Shift+Q to toggle, Escape to exit/dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Q" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setIsActive((v) => !v);
        setPending(null);
        setSelected(null);
        return;
      }
      if (e.key !== "Escape") return;
      if (pending) { setPending(null); return; }
      if (selected) { setSelected(null); return; }
      setIsActive(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, selected]);

  // Reset pending/selected when page changes
  useEffect(() => {
    setPending(null);
    setSelected(null);
  }, [pathname]);

  async function saveAnnotation() {
    if (!pending || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ops/qa-annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pathname,
          posX: pending.posX,
          posY: pending.posY,
          elementSelector: pending.elementSelector,
          elementText: pending.elementText || undefined,
          issueType: formRef.current.issueType,
          severity: formRef.current.severity,
          notes: formRef.current.notes || undefined,
        }),
      });
      const data = await res.json();
      setAnnotations((prev) => [...prev, data.data]);
      setPending(null);
      setForm({ issueType: "bug", severity: "medium", notes: "" });
      toast.success("Annotation saved");
    } catch {
      toast.error("Failed to save annotation");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/ops/qa-annotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function deleteAnnotation(id: string) {
    try {
      await fetch(`/api/ops/qa-annotations/${id}`, { method: "DELETE" });
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setSelected(null);
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <>
      {/* Dim overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="qa-dim"
            data-qa-ui
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.08)", pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* "Click to annotate" hint bar */}
      <AnimatePresence>
        {isActive && !pending && !selected && (
          <motion.div
            data-qa-ui
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 53 }}
            className="bg-[#0A2342] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg select-none pointer-events-none"
          >
            Click anywhere to annotate · Esc to exit
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing annotation pins */}
      <AnimatePresence>
        {isActive &&
          annotations.map((ann, idx) => (
            <PinMarker
              key={ann.id}
              annotation={ann}
              index={idx + 1}
              onClick={() => {
                setSelected(ann);
                setPending(null);
              }}
            />
          ))}
      </AnimatePresence>

      {/* New annotation form */}
      <AnimatePresence>
        {pending && (
          <AnnotationFormPanel
            key="qa-form"
            pending={pending}
            form={form}
            setForm={setForm}
            onSave={saveAnnotation}
            onCancel={() => setPending(null)}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Annotation detail */}
      <AnimatePresence>
        {selected && !pending && (
          <AnnotationDetailPanel
            key={`qa-detail-${selected.id}`}
            annotation={selected}
            onClose={() => setSelected(null)}
            onStatusChange={updateStatus}
            onDelete={deleteAnnotation}
          />
        )}
      </AnimatePresence>

      {/* QA mode is toggled with Shift+Q — no persistent button to accidentally click */}
    </>
  );
}
