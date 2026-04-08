"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  DollarSign,
  Eye,
  Filter,
  Footprints,
  Megaphone,
  MessageSquare,
  Search,
  Server,
  Shield,
  Siren,
  SquareStack,
  Users,
  Vote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Severity = "critical" | "warning" | "watch";
type AlertState = "active" | "acknowledged" | "resolved";
type AlertModule =
  | "gotv"
  | "field"
  | "finance"
  | "signs"
  | "comms"
  | "volunteers"
  | "system";

interface AlertAction {
  label: string;
  href?: string;
  modal?: "task" | "assign" | "adoni";
  context?: string;
}

interface AlertItem {
  id: string;
  severity: Severity;
  module: AlertModule;
  title: string;
  detail: string;
  createdAt: Date;
  state: AlertState;
  resolvedNote?: string;
  actions: AlertAction[];
}

interface Props {
  campaignId: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; ring: string }
> = {
  critical: {
    label: "Critical",
    color: RED,
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "ring-red-400",
  },
  warning: {
    label: "Warning",
    color: AMBER,
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "ring-amber-400",
  },
  watch: {
    label: "Watch",
    color: GREEN,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "ring-emerald-400",
  },
};

const MODULE_CONFIG: Record<
  AlertModule,
  { label: string; icon: typeof Vote }
> = {
  gotv: { label: "GOTV", icon: Vote },
  field: { label: "Field Ops", icon: Footprints },
  finance: { label: "Finance", icon: DollarSign },
  signs: { label: "Signs", icon: SquareStack },
  comms: { label: "Communications", icon: Megaphone },
  volunteers: { label: "Volunteers", icon: Users },
  system: { label: "System", icon: Server },
};

const REFRESH_INTERVAL = 60_000;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `alert-${idCounter}-${Date.now()}`;
}

/* ─── Alert Detection Engine ─────────────────────────────────────────────── */

interface RawData {
  followUpCount: number;
  gotvRate: number;
  deliveryRate: number;
  pendingSigns: number;
  installedSigns: number;
  p1Uncontacted: number;
  spendingPct: number;
  maxDonation: number;
  maxAnonymous: number;
  shiftsUnfilled: number;
  canvasserInactive: number;
  turfsIncomplete: number;
}

function detectAlerts(d: RawData, campaignId: string): AlertItem[] {
  const now = new Date();
  const alerts: AlertItem[] = [];

  // GOTV alerts
  if (d.gotvRate < 20) {
    alerts.push({
      id: nextId(),
      severity: "critical",
      module: "gotv",
      title: "GOTV pull rate critically low",
      detail: `Pull-through is ${d.gotvRate}% — target is 50%+. Immediate escalation required.`,
      createdAt: now,
      state: "active",
      actions: [
        { label: "Open GOTV Command", href: `/gotv` },
        { label: "Ask Adoni", modal: "adoni", context: `GOTV pull rate is ${d.gotvRate}%` },
      ],
    });
  } else if (d.gotvRate < 35) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "gotv",
      title: "GOTV pull rate below threshold",
      detail: `Current pull-through is ${d.gotvRate}%. Consider deploying more canvassers.`,
      createdAt: now,
      state: "active",
      actions: [
        { label: "Open GOTV Command", href: `/gotv` },
        { label: "Assign Team", modal: "assign" },
      ],
    });
  }

  if (d.p1Uncontacted > 0) {
    alerts.push({
      id: nextId(),
      severity: d.p1Uncontacted > 50 ? "critical" : "warning",
      module: "gotv",
      title: "P1 contacts uncontacted",
      detail: `${d.p1Uncontacted} priority-1 voters have not been reached.`,
      createdAt: new Date(now.getTime() - 45 * 60_000),
      state: "active",
      actions: [
        {
          label: "View Affected Contacts",
          href: `/contacts?campaignId=${campaignId}&supportLevel=1&contacted=false`,
        },
        { label: "Create Follow-up Tasks", modal: "task", context: `P1 uncontacted: ${d.p1Uncontacted}` },
      ],
    });
  }

  // Field Ops alerts
  if (d.followUpCount > 150) {
    alerts.push({
      id: nextId(),
      severity: d.followUpCount > 300 ? "critical" : "warning",
      module: "field",
      title: "Follow-up backlog elevated",
      detail: `${d.followUpCount} contacts require follow-up handling.`,
      createdAt: new Date(now.getTime() - 120 * 60_000),
      state: "active",
      actions: [
        {
          label: "View Affected Contacts",
          href: `/contacts?campaignId=${campaignId}&followUpNeeded=true`,
        },
        { label: "Create Follow-up Tasks", modal: "task", context: `Backlog: ${d.followUpCount} contacts` },
        { label: "Assign Team", modal: "assign" },
      ],
    });
  }

  if (d.turfsIncomplete > 5) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "field",
      title: "Turfs incomplete",
      detail: `${d.turfsIncomplete} turfs still need canvassing. Deadline approaching.`,
      createdAt: new Date(now.getTime() - 90 * 60_000),
      state: "active",
      actions: [
        { label: "Open GOTV Command", href: `/gotv` },
        { label: "Assign Team", modal: "assign" },
      ],
    });
  }

  if (d.canvasserInactive > 3) {
    alerts.push({
      id: nextId(),
      severity: "watch",
      module: "field",
      title: "Canvassers inactive",
      detail: `${d.canvasserInactive} canvassers have not logged activity today.`,
      createdAt: new Date(now.getTime() - 60 * 60_000),
      state: "active",
      actions: [
        { label: "Assign Team", modal: "assign" },
        { label: "Ask Adoni", modal: "adoni", context: `${d.canvasserInactive} canvassers inactive` },
      ],
    });
  }

  // Finance alerts
  if (d.spendingPct >= 90) {
    alerts.push({
      id: nextId(),
      severity: "critical",
      module: "finance",
      title: "Spending approaching limit (90%)",
      detail: `Campaign has spent ${d.spendingPct}% of budget. Immediate review needed.`,
      createdAt: new Date(now.getTime() - 30 * 60_000),
      state: "active",
      actions: [
        { label: "View Donations", href: `/donations?campaignId=${campaignId}` },
        { label: "Ask Adoni", modal: "adoni", context: `Spending at ${d.spendingPct}%` },
      ],
    });
  } else if (d.spendingPct >= 80) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "finance",
      title: "Spending approaching limit (80%)",
      detail: `Campaign has spent ${d.spendingPct}% of budget.`,
      createdAt: new Date(now.getTime() - 60 * 60_000),
      state: "active",
      actions: [{ label: "View Donations", href: `/donations?campaignId=${campaignId}` }],
    });
  }

  if (d.maxDonation > 1200) {
    alerts.push({
      id: nextId(),
      severity: "critical",
      module: "finance",
      title: "Donation exceeds $1,200 limit",
      detail: `A donation of $${d.maxDonation.toLocaleString()} has been recorded. This may violate contribution limits.`,
      createdAt: new Date(now.getTime() - 15 * 60_000),
      state: "active",
      actions: [
        { label: "View Donations", href: `/donations?campaignId=${campaignId}` },
        { label: "Ask Adoni", modal: "adoni", context: `Donation over limit: $${d.maxDonation}` },
      ],
    });
  }

  if (d.maxAnonymous > 25) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "finance",
      title: "Anonymous donation over $25",
      detail: `An anonymous donation of $${d.maxAnonymous} was received. Ontario law requires donor identity for amounts over $25.`,
      createdAt: new Date(now.getTime() - 10 * 60_000),
      state: "active",
      actions: [{ label: "View Donations", href: `/donations?campaignId=${campaignId}` }],
    });
  }

  // Signs alerts
  if (d.pendingSigns > d.installedSigns && d.pendingSigns > 0) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "signs",
      title: "Sign operations behind schedule",
      detail: `${d.pendingSigns} pending vs ${d.installedSigns} installed signs.`,
      createdAt: new Date(now.getTime() - 180 * 60_000),
      state: "active",
      actions: [
        { label: "Open GOTV Command", href: `/gotv` },
        { label: "Assign Team", modal: "assign" },
      ],
    });
  }

  // Communications alerts
  if (d.deliveryRate < 70) {
    alerts.push({
      id: nextId(),
      severity: "critical",
      module: "comms",
      title: "Delivery rate critically low",
      detail: `Only ${d.deliveryRate}% of messages delivered. Check sender reputation.`,
      createdAt: new Date(now.getTime() - 25 * 60_000),
      state: "active",
      actions: [
        { label: "Ask Adoni", modal: "adoni", context: `Delivery rate: ${d.deliveryRate}%` },
      ],
    });
  } else if (d.deliveryRate < 85) {
    alerts.push({
      id: nextId(),
      severity: "warning",
      module: "comms",
      title: "Delivery rate dip detected",
      detail: `Delivery rate is ${d.deliveryRate}%. Investigate failed sends.`,
      createdAt: new Date(now.getTime() - 75 * 60_000),
      state: "active",
      actions: [
        { label: "Ask Adoni", modal: "adoni", context: `Delivery rate: ${d.deliveryRate}%` },
      ],
    });
  }

  // Volunteers alerts
  if (d.shiftsUnfilled > 0) {
    alerts.push({
      id: nextId(),
      severity: d.shiftsUnfilled > 5 ? "critical" : "warning",
      module: "volunteers",
      title: "Shifts unfilled",
      detail: `${d.shiftsUnfilled} volunteer shifts have no one assigned for today.`,
      createdAt: new Date(now.getTime() - 40 * 60_000),
      state: "active",
      actions: [
        { label: "Assign Team", modal: "assign" },
        { label: "Ask Adoni", modal: "adoni", context: `${d.shiftsUnfilled} unfilled shifts` },
      ],
    });
  }

  // If no alerts, add a system watch
  if (alerts.length === 0) {
    alerts.push({
      id: nextId(),
      severity: "watch",
      module: "system",
      title: "All systems nominal",
      detail: "All monitored campaign health thresholds are within range.",
      createdAt: now,
      state: "active",
      actions: [],
    });
  }

  return alerts;
}

/* ─── Animated Counter ───────────────────────────────────────────────────── */

function AnimatedCount({ value, color }: { value: number; color: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="text-2xl font-black tabular-nums"
      style={{ color }}
    >
      {value}
    </motion.span>
  );
}

/* ─── Shimmer Skeleton ───────────────────────────────────────────────────── */

function ShimmerCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-200" />
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-24 rounded-lg bg-slate-200" />
            <div className="h-8 w-20 rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Stub (lightweight inline modals) ─────────────────────────────── */

function ModalOverlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: NAVY }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ─── Resolve Modal ──────────────────────────────────────────────────────── */

function ResolveModal({
  alert,
  onResolve,
  onClose,
}: {
  alert: AlertItem;
  onResolve: (id: string, note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  return (
    <ModalOverlay title="Resolve Alert" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-3">{alert.title}</p>
      <textarea
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={3}
        placeholder="Resolution note (required)..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!note.trim()}
          onClick={() => onResolve(alert.id, note.trim())}
        >
          <Check className="h-3.5 w-3.5" />
          Resolve
        </Button>
      </div>
    </ModalOverlay>
  );
}

/* ─── Task Creation Modal ────────────────────────────────────────────────── */

function TaskModal({
  context,
  campaignId,
  onClose,
}: {
  context: string;
  campaignId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(`Follow up: ${context}`);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          title: title.trim(),
          description: `Alert context: ${context}`,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setDone(true);
      setTimeout(onClose, 900);
    } catch {
      // stay open so user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay title="Create Task" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Task title</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={done}
      />
      <label className="block text-sm font-medium text-slate-700 mb-1">Due date (optional)</label>
      <input
        type="date"
        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={done}
      />
      <p className="mt-2 text-xs text-slate-400">Alert: {context}</p>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        {done ? (
          <Button size="sm" disabled>
            <Check className="h-3.5 w-3.5" /> Task created
          </Button>
        ) : (
          <Button size="sm" onClick={submit} disabled={!title.trim() || submitting}>
            {submitting ? "Creating…" : "Create Task"}
          </Button>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ─── Assign Modal ───────────────────────────────────────────────────────── */

interface TeamMember { userId: string; name: string; email: string | null; role: string }

function AssignModal({
  onClose,
  campaignId,
  alertTitle,
  alertContext,
}: {
  onClose: () => void;
  campaignId: string;
  alertTitle: string;
  alertContext?: string;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState(alertTitle);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`/api/team?campaignId=${campaignId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.members) setMembers(d.members); else setLoadError(true); })
      .catch(() => setLoadError(true));
  }, [campaignId]);

  async function submit() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          title: taskTitle.trim() || alertTitle,
          description: alertContext ? `Alert: ${alertContext}` : undefined,
          assignedToId: selectedId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      setTimeout(onClose, 900);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay title="Assign to Team Member" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Task title</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        disabled={done}
      />
      <label className="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
      {loadError ? (
        <p className="text-sm text-red-500 mb-3">Could not load team members</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">Loading team…</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100">
              <input
                type="radio"
                name="assignee"
                value={m.userId}
                checked={selectedId === m.userId}
                onChange={() => setSelectedId(m.userId)}
                className="text-blue-600"
                disabled={done}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email} · {m.role}</p>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        {done ? (
          <Button size="sm" disabled><Check className="h-3.5 w-3.5" /> Assigned</Button>
        ) : (
          <Button size="sm" onClick={submit} disabled={!selectedId || submitting}>
            <Users className="h-3.5 w-3.5" />{submitting ? "Assigning…" : "Assign + Create Task"}
          </Button>
        )}
      </div>
    </ModalOverlay>
  );
}


/* ─── Single Alert Card ──────────────────────────────────────────────────── */

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onAction,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
  onResolve: (alert: AlertItem) => void;
  onAction: (action: AlertAction, alert: AlertItem) => void;
}) {
  const router = useRouter();
  const sev = SEVERITY_CONFIG[alert.severity];
  const mod = MODULE_CONFIG[alert.module];
  const ModIcon = mod.icon;
  const isAcked = alert.state === "acknowledged";
  const isResolved = alert.state === "resolved";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-xl border overflow-hidden ${
        isAcked
          ? "border-slate-200 bg-slate-50"
          : isResolved
            ? "border-slate-200 bg-white"
            : `${sev.border} ${sev.bg}`
      }`}
    >
      {/* Severity stripe */}
      <div
        className="h-1"
        style={{ backgroundColor: isAcked ? "#94a3b8" : isResolved ? "#cbd5e1" : sev.color }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Module icon */}
          <div
            className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isAcked ? "#e2e8f0" : `${sev.color}18`,
            }}
          >
            <ModIcon
              className="h-4.5 w-4.5"
              style={{ color: isAcked ? "#64748b" : sev.color }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Severity badge */}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: isAcked ? "#e2e8f0" : `${sev.color}20`,
                  color: isAcked ? "#64748b" : sev.color,
                }}
              >
                {alert.severity === "critical" && <Siren className="h-3 w-3" />}
                {alert.severity === "warning" && <AlertTriangle className="h-3 w-3" />}
                {alert.severity === "watch" && <Eye className="h-3 w-3" />}
                {sev.label}
              </span>

              {/* Module tag */}
              <span className="text-xs font-medium text-slate-500">
                {mod.label}
              </span>

              {/* Timestamp */}
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                {relativeTime(alert.createdAt)}
              </span>
            </div>

            {/* Title & detail */}
            <h3
              className={`mt-1.5 text-sm font-bold ${
                isAcked ? "text-slate-500" : "text-slate-900"
              }`}
            >
              {alert.title}
            </h3>
            <p
              className={`mt-0.5 text-sm ${
                isAcked ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {alert.detail}
            </p>

            {/* Resolution note */}
            {isResolved && alert.resolvedNote && (
              <p className="mt-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 inline-block">
                <Check className="h-3 w-3 inline mr-1" />
                {alert.resolvedNote}
              </p>
            )}

            {/* Action buttons */}
            {!isResolved && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {alert.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="h-[44px] min-h-[44px] text-xs"
                    onClick={() => {
                      if (action.href) {
                        router.push(action.href);
                      } else {
                        onAction(action, alert);
                      }
                    }}
                  >
                    {action.modal === "adoni" && <Bot className="h-3.5 w-3.5" />}
                    {action.modal === "task" && <BookOpen className="h-3.5 w-3.5" />}
                    {action.modal === "assign" && <Users className="h-3.5 w-3.5" />}
                    {action.href && !action.modal && <ChevronRight className="h-3.5 w-3.5" />}
                    {action.label}
                  </Button>
                ))}

                <div className="ml-auto flex items-center gap-1.5">
                  {!isAcked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[44px] min-h-[44px] text-xs text-slate-500"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-[44px] min-h-[44px] text-xs text-emerald-600 hover:text-emerald-700"
                    onClick={() => onResolve(alert)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function AlertsClient({ campaignId }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<AlertModule | "all">("all");
  const [stateFilter, setStateFilter] = useState<AlertState | "all">("all");
  const [resolvedExpanded, setResolvedExpanded] = useState(false);

  // Modal state
  const [resolveTarget, setResolveTarget] = useState<AlertItem | null>(null);
  const [taskContext, setTaskContext] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<AlertItem | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Data fetch ───────────────────────────────────────── */

  const fetchAlerts = useCallback(async () => {
    setRefreshing(true);
    const [summary, gotv, notifications] = await Promise.all([
      getJson(`/api/alerts/summary?campaignId=${campaignId}`),
      getJson(`/api/gotv?campaignId=${campaignId}`),
      getJson(`/api/notifications/stats?campaignId=${campaignId}`),
    ]);

    const rawData: RawData = {
      followUpCount: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "fu")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "fu")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      gotvRate: Number(gotv?.data?.percentagePulled ?? 0),
      deliveryRate: Number(notifications?.data?.deliveryRate ?? 100),
      pendingSigns: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "signs")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "signs")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      installedSigns: 0,
      p1Uncontacted: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "p1")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "p1")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      spendingPct: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "spend")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "spend")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      maxDonation: 0,
      maxAnonymous: 0,
      shiftsUnfilled: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "shifts")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "shifts")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      canvasserInactive: summary?.top
        ? (summary.top as Array<{ id: string; title: string }>).find(t => t.id === "canvas")
          ? parseInt(((summary.top as Array<{ id: string; title: string }>).find(t => t.id === "canvas")?.title ?? "0").match(/\d+/)?.[0] ?? "0")
          : 0
        : 0,
      turfsIncomplete: 0,
    };

    const detected = detectAlerts(rawData, campaignId);

    // Preserve state of existing alerts
    setAlerts((prev) => {
      const stateMap = new Map<string, { state: AlertState; resolvedNote?: string }>();
      for (const a of prev) {
        stateMap.set(a.title, { state: a.state, resolvedNote: a.resolvedNote });
      }
      return detected.map((d) => {
        const existing = stateMap.get(d.title);
        if (existing) {
          return { ...d, state: existing.state, resolvedNote: existing.resolvedNote };
        }
        return d;
      });
    });

    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [campaignId]);

  useEffect(() => {
    fetchAlerts();
    timerRef.current = setInterval(fetchAlerts, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchAlerts]);

  /* ── Actions ──────────────────────────────────────────── */

  const handleAcknowledge = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, state: "acknowledged" as AlertState } : a))
    );
  }, []);

  const handleResolve = useCallback((id: string, note: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, state: "resolved" as AlertState, resolvedNote: note }
          : a
      )
    );
    setResolveTarget(null);
  }, []);

  const handleAction = useCallback((action: AlertAction, alert?: AlertItem) => {
    if (action.modal === "task") {
      setTaskContext(action.context ?? alert?.title ?? "");
    } else if (action.modal === "assign") {
      setAssignTarget(alert ?? null);
    } else if (action.modal === "adoni") {
      const prefill = action.context
        ? `Alert: ${action.context}. What should we do about this?`
        : "What are the most urgent alerts I should act on right now?";
      window.dispatchEvent(
        new CustomEvent("pollcity:open-adoni", { detail: { prefill } })
      );
    }
  }, []);

  /* ── Filtering ────────────────────────────────────────── */

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (moduleFilter !== "all" && a.module !== moduleFilter) return false;
      if (stateFilter !== "all" && a.state !== stateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.detail.toLowerCase().includes(q) ||
          a.module.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, severityFilter, moduleFilter, stateFilter, searchQuery]);

  const activeAlerts = useMemo(
    () => filtered.filter((a) => a.state === "active"),
    [filtered]
  );
  const ackedAlerts = useMemo(
    () => filtered.filter((a) => a.state === "acknowledged"),
    [filtered]
  );
  const resolvedAlerts = useMemo(
    () => filtered.filter((a) => a.state === "resolved"),
    [filtered]
  );

  /* ── Summary counts ───────────────────────────────────── */

  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && a.state === "active"
  ).length;
  const warningCount = alerts.filter(
    (a) => a.severity === "warning" && a.state === "active"
  ).length;
  const watchCount = alerts.filter(
    (a) => a.severity === "watch" && a.state === "active"
  ).length;

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Siren className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Campaign Alerts</h1>
            <p className="text-sm text-white/60">
              Live risk detections with actionable responses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-2 w-2 rounded-full bg-emerald-400"
              />
            )}
            <span className="text-xs text-white/40">
              Updated {relativeTime(lastRefresh)}
            </span>
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4" style={{ color: RED }} />
            <AnimatedCount value={criticalCount} color={RED} />
            <span className="text-xs text-white/50 uppercase tracking-wide">critical</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: AMBER }} />
            <AnimatedCount value={warningCount} color={AMBER} />
            <span className="text-xs text-white/50 uppercase tracking-wide">warnings</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" style={{ color: GREEN }} />
            <AnimatedCount value={watchCount} color={GREEN} />
            <span className="text-xs text-white/50 uppercase tracking-wide">watching</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[44px]"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}
            className="rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[44px]"
          >
            <option value="all">All severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="watch">Watch</option>
          </select>

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as AlertModule | "all")}
            className="rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[44px]"
          >
            <option value="all">All modules</option>
            {(Object.keys(MODULE_CONFIG) as AlertModule[]).map((m) => (
              <option key={m} value={m}>
                {MODULE_CONFIG[m].label}
              </option>
            ))}
          </select>

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as AlertState | "all")}
            className="rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[44px]"
          >
            <option value="all">All states</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </div>
      )}

      {/* Active alerts */}
      {!loading && activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
            Active ({activeAlerts.length})
          </h2>
          <AnimatePresence mode="popLayout">
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={(a) => setResolveTarget(a)}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Acknowledged alerts */}
      {!loading && ackedAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
            Acknowledged ({ackedAlerts.length})
          </h2>
          <AnimatePresence mode="popLayout">
            {ackedAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={(a) => setResolveTarget(a)}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Resolved alerts (collapsed) */}
      {!loading && resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setResolvedExpanded(!resolvedExpanded)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 px-1 hover:text-slate-600 transition-colors h-[44px]"
          >
            <motion.div
              animate={{ rotate: resolvedExpanded ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.div>
            Resolved ({resolvedAlerts.length})
          </button>
          <AnimatePresence>
            {resolvedExpanded &&
              resolvedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={(a) => setResolveTarget(a)}
                  onAction={handleAction}
                />
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">
            {searchQuery || severityFilter !== "all" || moduleFilter !== "all"
              ? "No alerts match your filters."
              : "No active alerts. All systems nominal."}
          </p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {resolveTarget && (
          <ResolveModal
            key="resolve"
            alert={resolveTarget}
            onResolve={handleResolve}
            onClose={() => setResolveTarget(null)}
          />
        )}
        {taskContext !== null && (
          <TaskModal
            key="task"
            context={taskContext}
            campaignId={campaignId}
            onClose={() => setTaskContext(null)}
          />
        )}
        {assignTarget !== null && (
          <AssignModal
            key="assign"
            campaignId={campaignId}
            alertTitle={assignTarget.title}
            alertContext={assignTarget.detail}
            onClose={() => setAssignTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
