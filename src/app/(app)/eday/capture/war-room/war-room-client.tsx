"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, AlertTriangle, Clock, RefreshCw, Download, Filter,
  AlertOctagon, ChevronDown, ChevronUp, X, Check, Flag, Edit3,
  Loader2, Radio, Map, List, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface CandidateTotal {
  id: string;
  name: string;
  party: string | null;
  votes: number;
}

interface LocationStatus {
  id: string;
  name: string;
  ward: string | null;
  district: string | null;
  pollNumber: string | null;
  status: string;
  expectedTurnout: number | null;
  hasApproved: boolean;
  hasPending: boolean;
  hasFlagged: boolean;
}

interface ActivityItem {
  id: string;
  locationId: string;
  status: string;
  submittedBy: { id: string; name: string | null } | null;
  submittedAt: string | null;
  createdAt: string;
  totalVotes: number | null;
  issueFlag: boolean;
}

interface PendingSubmission {
  id: string;
  locationId: string;
  status: string;
  submittedById: string;
  submittedBy: { id: string; name: string | null };
  submittedAt: string | null;
  createdAt: string;
  totalVotes: number | null;
  issueFlag: boolean;
  notes: string | null;
  results: Array<{
    candidate: { id: string; name: string; party: string | null };
    votes: number;
  }>;
}

interface Issue {
  id: string;
  issueType: string;
  severity: string;
  description: string;
  createdAt: string;
  location: { id: string; name: string } | null;
  reportedBy: { id: string; name: string | null };
}

interface WarRoomData {
  event: {
    id: string;
    name: string;
    eventType: string;
    status: string;
    office: string;
    requireDoubleEntry: boolean;
  };
  candidateTotals: CandidateTotal[];
  locationStatus: LocationStatus[];
  completionRate: number;
  totalLocations: number;
  approvedCount: number;
  pendingCount: number;
  flaggedCount: number;
  unreportedCount: number;
  activeIssues: Issue[];
  recentActivity: ActivityItem[];
  pendingSubmissions?: PendingSubmission[];
  generatedAt: string;
}

interface EventSummary {
  id: string;
  name: string;
  eventType: string;
  status: string;
  office: string;
}

interface Props {
  campaignId: string;
  events: EventSummary[];
  activeEventId: string | null;
  initialData: WarRoomData | null;
  isManager: boolean;
}

type ViewMode = "overview" | "locations" | "review" | "issues";

/* ─── Live status badge ──────────────────────────────────────────────────── */

function LiveBadge({ status }: { status: "live" | "delayed" | "reconnecting" | "error" }) {
  const cfg = {
    live: { label: "Live", color: "bg-emerald-500", pulse: true },
    delayed: { label: "Delayed", color: "bg-amber-400", pulse: false },
    reconnecting: { label: "Reconnecting…", color: "bg-amber-400", pulse: true },
    error: { label: "Error", color: "bg-red-400", pulse: false },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
      <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: accent ?? NAVY }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Candidate results bar ──────────────────────────────────────────────── */

function CandidateBar({ candidates }: { candidates: CandidateTotal[] }) {
  const total = candidates.reduce((s, c) => s + c.votes, 0);
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

  if (sorted.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">No results yet</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Results — Approved Votes</p>
      <div className="space-y-3">
        {sorted.map((c, idx) => {
          const pct = total > 0 ? (c.votes / total) * 100 : 0;
          return (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className={`font-semibold text-sm ${idx === 0 ? "text-slate-900" : "text-slate-700"}`}>
                    {idx === 0 && <span className="mr-1">🥇</span>}
                    {c.name}
                  </span>
                  {c.party && <span className="text-xs text-slate-400 ml-1.5">{c.party}</span>}
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{c.votes.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: idx === 0 ? GREEN : idx === 1 ? NAVY : "#94a3b8" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-400 text-right pt-1">Total approved: {total.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* ─── Review modal ───────────────────────────────────────────────────────── */

function ReviewModal({
  submission,
  onClose,
  onApprove,
  onFlag,
  onRevise,
  locationName,
}: {
  submission: PendingSubmission;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onFlag: (id: string, reason: string) => Promise<void>;
  onRevise: (id: string, results: Record<string, number>, reason: string) => Promise<void>;
  locationName: string;
}) {
  const [mode, setMode] = useState<"view" | "flag" | "revise">("view");
  const [flagReason, setFlagReason] = useState("");
  const [reviseReason, setReviseReason] = useState("");
  const [revisedVotes, setRevisedVotes] = useState<Record<string, number>>(
    Object.fromEntries(submission.results.map((r) => [r.candidate.id, r.votes]))
  );
  const [working, setWorking] = useState(false);

  const approve = async () => {
    setWorking(true);
    try {
      await onApprove(submission.id);
      onClose();
    } finally {
      setWorking(false);
    }
  };

  const flag = async () => {
    if (!flagReason.trim()) { toast.error("Reason required"); return; }
    setWorking(true);
    try {
      await onFlag(submission.id, flagReason);
      onClose();
    } finally {
      setWorking(false);
    }
  };

  const revise = async () => {
    if (!reviseReason.trim()) { toast.error("Revision reason required"); return; }
    setWorking(true);
    try {
      await onRevise(submission.id, revisedVotes, reviseReason);
      onClose();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={SPRING}
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Review Submission</h3>
              <p className="text-sm text-slate-500">{locationName}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Candidate results */}
          {mode === "view" && (
            <div className="space-y-2">
              {submission.results.map((r) => (
                <div key={r.candidate.id} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.candidate.name}</p>
                    {r.candidate.party && <p className="text-xs text-slate-400">{r.candidate.party}</p>}
                  </div>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">{r.votes.toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-sm text-slate-500">Total</span>
                <span className="font-bold">{(submission.totalVotes ?? 0).toLocaleString()}</span>
              </div>
              {submission.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5">{submission.notes}</p>
              )}
              {submission.issueFlag && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Anomaly detected — review carefully
                </div>
              )}
            </div>
          )}

          {mode === "flag" && (
            <div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Reason for flagging</span>
                <textarea
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Describe the issue…"
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </label>
            </div>
          )}

          {mode === "revise" && (
            <div className="space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 font-medium">
                Revising creates a full audit trail. The original values will be preserved.
              </p>
              {submission.results.map((r) => (
                <div key={r.candidate.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.candidate.name}</p>
                    <p className="text-xs text-slate-400">Was: {r.votes}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    className="w-24 border rounded-lg px-2 py-1 text-center font-bold text-sm"
                    value={revisedVotes[r.candidate.id] ?? r.votes}
                    onChange={(e) => setRevisedVotes((prev) => ({ ...prev, [r.candidate.id]: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              ))}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Reason for revision <span className="text-red-500">*</span></span>
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Confirmed with Deputy Returning Officer"
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {mode === "view" && (
              <>
                <button
                  onClick={approve}
                  disabled={working}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: GREEN }}
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("flag")}
                    className="py-2.5 rounded-xl border text-sm font-medium text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 flex items-center justify-center gap-1"
                  >
                    <Flag className="w-3.5 h-3.5" /> Flag
                  </button>
                  <button
                    onClick={() => setMode("revise")}
                    className="py-2.5 rounded-xl border text-sm font-medium text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Revise
                  </button>
                </div>
              </>
            )}

            {mode === "flag" && (
              <>
                <button onClick={flag} disabled={working || !flagReason.trim()} className="w-full py-3 rounded-xl font-bold text-sm text-white" style={{ background: AMBER }}>
                  {working ? "Flagging…" : "Send Flag"}
                </button>
                <button onClick={() => setMode("view")} className="w-full py-2 text-sm text-slate-500">Cancel</button>
              </>
            )}

            {mode === "revise" && (
              <>
                <button onClick={revise} disabled={working || !reviseReason.trim()} className="w-full py-3 rounded-xl font-bold text-sm text-white" style={{ background: NAVY }}>
                  {working ? "Saving…" : "Save Revision"}
                </button>
                <button onClick={() => setMode("view")} className="w-full py-2 text-sm text-slate-500">Cancel</button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main war room ──────────────────────────────────────────────────────── */

export default function WarRoomClient({
  campaignId,
  events,
  activeEventId,
  initialData,
  isManager,
}: Props) {
  const [eventId, setEventId] = useState(activeEventId);
  const [data, setData] = useState<WarRoomData | null>(initialData);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>(
    (initialData as unknown as { pendingSubmissions?: PendingSubmission[] })?.pendingSubmissions ?? []
  );
  const [liveStatus, setLiveStatus] = useState<"live" | "delayed" | "reconnecting" | "error">("live");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>("overview");
  const [wardFilter, setWardFilter] = useState<string>("all");
  const [reviewSubmission, setReviewSubmission] = useState<PendingSubmission | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setRefreshing(true);
    try {
      const [dataRes, pendingRes] = await Promise.all([
        fetch(`/api/capture/events/${eventId}/war-room`),
        isManager ? fetch(`/api/capture/submissions?eventId=${eventId}&status=pending_review,flagged`) : Promise.resolve(null),
      ]);
      if (dataRes.ok) {
        const json = await dataRes.json();
        setData(json.data);
        setLastUpdate(new Date());
      }
      if (pendingRes?.ok) {
        const json = await pendingRes.json();
        setPendingSubmissions(json.data ?? []);
      }
    } catch {
      // network error — degrade gracefully
    } finally {
      setRefreshing(false);
    }
  }, [eventId, isManager]);

  // SSE connection
  useEffect(() => {
    if (!eventId) return;

    const connect = () => {
      if (sseRef.current) sseRef.current.close();
      const es = new EventSource(`/api/capture/events/${eventId}/stream`);
      sseRef.current = es;

      es.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data);
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              approvedCount: update.approvedCount,
              pendingCount: update.pendingCount,
              flaggedCount: update.flaggedCount,
              completionRate: update.completionRate,
              totalLocations: update.totalLocations,
              unreportedCount: update.totalLocations - update.approvedCount,
            };
          });
          setLiveStatus("live");
          setLastUpdate(new Date());
          retryCount.current = 0;
          // If something changed, do a full refresh
          if (update.recentSubmission) {
            refresh();
          }
        } catch {
          // ignore parse error
        }
      };

      es.onerror = () => {
        setLiveStatus("reconnecting");
        es.close();
        retryCount.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        setTimeout(connect, delay);
      };

      es.onopen = () => {
        setLiveStatus("live");
        retryCount.current = 0;
      };
    };

    connect();
    return () => sseRef.current?.close();
  }, [eventId, refresh]);

  // Stale detection — flag delayed if no update for >15s
  useEffect(() => {
    const interval = setInterval(() => {
      if (liveStatus === "live") {
        const age = Date.now() - lastUpdate.getTime();
        if (age > 15000) setLiveStatus("delayed");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [liveStatus, lastUpdate]);

  const approveSubmission = async (id: string) => {
    const res = await fetch(`/api/capture/submissions/${id}/approve`, { method: "POST" });
    if (!res.ok) throw new Error("Approve failed");
    setPendingSubmissions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Submission approved");
    refresh();
  };

  const flagSubmission = async (id: string, reason: string) => {
    const res = await fetch(`/api/capture/submissions/${id}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error("Flag failed");
    setPendingSubmissions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Submission flagged");
    refresh();
  };

  const reviseSubmission = async (id: string, results: Record<string, number>, reason: string) => {
    const res = await fetch(`/api/capture/submissions/${id}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        results: Object.entries(results).map(([candidateId, votes]) => ({ candidateId, votes })),
      }),
    });
    if (!res.ok) throw new Error("Revision failed");
    setPendingSubmissions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Submission revised");
    refresh();
  };

  const exportResults = () => {
    if (!eventId) return;
    window.open(`/api/capture/events/${eventId}/export?mode=approved`, "_blank");
  };

  if (!eventId || events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No active events</h2>
          <p className="text-slate-500">Activate a capture event before opening the war room.</p>
          {isManager && (
            <a href="/eday/capture/setup" className="mt-4 inline-block px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: NAVY }}>
              Go to Setup
            </a>
          )}
        </div>
      </div>
    );
  }

  const wards = data ? Array.from(new Set(data.locationStatus.map((l) => l.ward).filter((w): w is string => !!w))) : [];
  const filteredLocations = data?.locationStatus.filter(
    (l) => wardFilter === "all" || l.ward === wardFilter
  ) ?? [];

  const viewTabs: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "locations", label: "Locations", icon: <Map className="w-4 h-4" /> },
    ...(isManager ? [{ id: "review" as ViewMode, label: "Review Queue", icon: <List className="w-4 h-4" />, badge: data?.pendingCount ?? 0 }] : []),
    { id: "issues", label: "Issues", icon: <AlertOctagon className="w-4 h-4" />, badge: data?.activeIssues.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 sm:px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                {events.length > 1 ? (
                  <select
                    className="font-bold text-slate-900 text-base bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer"
                    value={eventId ?? ""}
                    onChange={(e) => { setEventId(e.target.value); refresh(); }}
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                ) : (
                  <h1 className="font-bold text-slate-900 text-base truncate">{data?.event.name ?? "War Room"}</h1>
                )}
                <p className="text-xs text-slate-500">{data?.event.office}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LiveBadge status={liveStatus} />
              <button
                onClick={refresh}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              {isManager && (
                <button
                  onClick={exportResults}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
                  style={{ background: NAVY }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* View tabs */}
          <div className="flex gap-0.5 mt-2 -mb-3 overflow-x-auto pb-0">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  view === tab.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.icon}
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">

        {/* ── Overview tab ─────────────────────────────────────────────────── */}
        {view === "overview" && (
          <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Completed" value={data?.approvedCount ?? 0} sub={`of ${data?.totalLocations ?? 0} locations`} accent={GREEN} />
              <Stat
                label="Completion"
                value={`${data?.completionRate ?? 0}%`}
                sub={`${data?.unreportedCount ?? 0} unreported`}
                accent={NAVY}
              />
              <Stat label="Pending Review" value={data?.pendingCount ?? 0} accent={AMBER} />
              <Stat label="Flagged" value={data?.flaggedCount ?? 0} accent={RED} />
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Overall Completion</p>
                <p className="text-sm font-bold text-slate-900">{data?.completionRate ?? 0}%</p>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: GREEN }}
                  initial={{ width: 0 }}
                  animate={{ width: `${data?.completionRate ?? 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {data?.approvedCount ?? 0} approved · {data?.pendingCount ?? 0} pending · {data?.unreportedCount ?? 0} not yet reported
              </p>
            </div>

            {/* Candidate totals */}
            <CandidateBar candidates={data?.candidateTotals ?? []} />

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Recent Activity</p>
              {data?.recentActivity.length === 0 && (
                <p className="text-sm text-slate-400">No submissions yet</p>
              )}
              <div className="space-y-2">
                {data?.recentActivity.slice(0, 8).map((item) => {
                  const loc = data.locationStatus.find((l) => l.id === item.locationId);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {item.status === "approved" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : item.status === "flagged" ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-800">{loc?.name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400">
                            {item.submittedBy?.name ?? "Unknown"} · {item.totalVotes?.toLocaleString() ?? "—"} votes
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Draft"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Locations tab ─────────────────────────────────────────────── */}
        {view === "locations" && (
          <div className="space-y-3">
            {wards.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <button
                  onClick={() => setWardFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${wardFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  All Wards
                </button>
                {wards.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWardFilter(w)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${wardFilter === w ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`bg-white rounded-xl border p-3 transition-colors ${
                    loc.hasApproved ? "border-emerald-200" : loc.hasFlagged ? "border-red-200" : loc.hasPending ? "border-amber-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{loc.name}</p>
                      <p className="text-xs text-slate-400">
                        {[loc.ward, loc.pollNumber && `Poll ${loc.pollNumber}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {loc.hasApproved && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {loc.hasFlagged && !loc.hasApproved && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {loc.hasPending && !loc.hasApproved && !loc.hasFlagged && <Clock className="w-5 h-5 text-blue-400" />}
                      {!loc.hasApproved && !loc.hasFlagged && !loc.hasPending && (
                        <span className="w-5 h-5 rounded-full border-2 border-slate-200 block" />
                      )}
                    </div>
                  </div>
                  {loc.status === "problem" && (
                    <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> Problem reported
                    </p>
                  )}
                </div>
              ))}
            </div>

            {filteredLocations.length === 0 && (
              <p className="text-center text-slate-400 py-8">No locations in this ward</p>
            )}
          </div>
        )}

        {/* ── Review Queue tab ─────────────────────────────────────────── */}
        {view === "review" && isManager && (
          <div className="space-y-3">
            {pendingSubmissions.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Review queue is clear</p>
                <p className="text-sm text-slate-400 mt-1">All submissions have been reviewed</p>
              </div>
            )}

            {pendingSubmissions.map((sub) => {
              const loc = data?.locationStatus.find((l) => l.id === sub.locationId);
              return (
                <div
                  key={sub.id}
                  className={`bg-white rounded-2xl border p-4 ${sub.issueFlag ? "border-amber-200" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">{loc?.name ?? "Unknown Location"}</p>
                        {sub.issueFlag && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Flagged</span>
                        )}
                        {sub.status === "flagged" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Review needed</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        By {sub.submittedBy?.name ?? "Unknown"} · {sub.totalVotes?.toLocaleString() ?? "—"} votes total
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {sub.results.slice(0, 3).map((r) => (
                          <span key={r.candidate.id}>{r.candidate.name}: <strong>{r.votes}</strong></span>
                        ))}
                        {sub.results.length > 3 && <span>+{sub.results.length - 3} more</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setReviewSubmission(sub)}
                      className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: NAVY }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Issues tab ──────────────────────────────────────────────── */}
        {view === "issues" && (
          <div className="space-y-3">
            {data?.activeIssues.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No active issues</p>
              </div>
            )}

            {data?.activeIssues.map((issue) => (
              <div
                key={issue.id}
                className={`bg-white rounded-2xl border p-4 ${
                  issue.severity === "critical" ? "border-red-300" : issue.severity === "high" ? "border-red-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${
                        issue.severity === "critical" ? "bg-red-100 text-red-700" :
                        issue.severity === "high" ? "bg-red-50 text-red-600" :
                        issue.severity === "medium" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">{issue.issueType.replace("_", " ")}</span>
                    </div>
                    {issue.location && (
                      <p className="text-sm font-semibold text-slate-800">{issue.location.name}</p>
                    )}
                    <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Reported by {issue.reportedBy.name ?? "Unknown"} · {new Date(issue.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <AlertOctagon
                    className={`w-5 h-5 shrink-0 ${issue.severity === "critical" ? "text-red-500" : "text-amber-400"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewSubmission && (
          <ReviewModal
            submission={reviewSubmission}
            locationName={data?.locationStatus.find((l) => l.id === reviewSubmission.locationId)?.name ?? "Unknown"}
            onClose={() => setReviewSubmission(null)}
            onApprove={approveSubmission}
            onFlag={flagSubmission}
            onRevise={reviseSubmission}
          />
        )}
      </AnimatePresence>

      {/* Last updated footer */}
      <div className="fixed bottom-4 right-4 bg-white rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm text-xs text-slate-400">
        Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}
