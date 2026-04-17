"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  MapPin,
  User,
  ClipboardList,
  Radio,
  Users,
  BarChart3,
  Car,
  Phone,
  CheckCheck,
  RefreshCw,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ScrutineerAssignment {
  id: string;
  pollingStation: string;
  pollingAddress: string | null;
  municipality: string;
  ward: string | null;
  province: string;
  electionDate: string;
  candidateSigned: boolean;
}

interface OcrCandidate {
  name: string;
  party: string | null;
  votes: number;
}

interface OcrResult {
  pollingStation: string | null;
  municipality: string | null;
  ward: string | null;
  province: string | null;
  office: string | null;
  percentReporting: number;
  candidates: OcrCandidate[];
  totalVotes: number | null;
  rejectedBallots: number | null;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

type OcrStep = "ready" | "capturing" | "reviewing" | "submitting" | "done" | "error";

interface PriorityContact {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  lastContactedAt: string | null;
}

interface RideContact {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  accessibilityNeeds: boolean;
  notes: string | null;
}

interface ScrutineerRow {
  id: string;
  pollingStation: string;
  pollingAddress: string | null;
  municipality: string;
  ward: string | null;
  user: { id: string; name: string | null; email: string; phone?: string | null };
  candidateSigned: boolean;
  hasSubmitted: boolean;
}

interface OpsData {
  gotv: {
    gap: number;
    supportersVoted: number;
    confirmedSupporters: number;
    winThreshold: number;
    percentComplete: number;
    p1Count: number;
    p2Count: number;
    votedToday: number;
    totalVoted: number;
    hourlyVotes: Array<{ hour: string; voted: number }>;
    projectedAdditional: number;
    hoursToClose: number;
  };
  scrutineers: ScrutineerRow[];
  results: {
    totalEntries: number;
    verifiedEntries: number;
    pendingEntries: number;
    topCandidates: Array<{ name: string; votes: number }>;
    recentEntries: Array<{
      id: string;
      candidateName: string;
      party: string | null;
      votes: number;
      pollingStation: string | null;
      isVerified: boolean;
      ocrAssisted: boolean;
      createdAt: string;
    }>;
  };
  priority: PriorityContact[];
  rides: RideContact[];
}

type ManagerTab = "command" | "strikeoff" | "rides" | "polls";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

function BigStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col items-center p-4">
      <p className="text-3xl font-bold" style={{ color: accent ?? NAVY }}>{value}</p>
      <p className="text-xs text-slate-500 mt-1 text-center">{label}</p>
    </div>
  );
}

/* ─── Hourly bars ────────────────────────────────────────────────────────── */

function HourlyChart({ hours }: { hours: Array<{ hour: string; voted: number }> }) {
  const max = Math.max(...hours.map((h) => h.voted), 1);
  const recent = hours.slice(-6);
  return (
    <div className="flex items-end gap-1 h-16">
      {recent.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max(4, Math.round((h.voted / max) * 52))}px`,
              backgroundColor: h.voted > 0 ? GREEN : "#e2e8f0",
            }}
          />
          <p className="text-[9px] text-slate-400 leading-none">{h.hour}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── GOTV Command tab ───────────────────────────────────────────────────── */

function CommandTab({ data, lastRefresh }: { data: OpsData; lastRefresh: Date }) {
  const { gotv, results, scrutineers } = data;
  const scrutineersTotal = scrutineers.length;
  const scrutineersSubmitted = scrutineers.filter((s) => s.hasSubmitted).length;
  const scrutineersSigned = scrutineers.filter((s) => s.candidateSigned).length;

  return (
    <div className="space-y-4">
      {/* Gap hero card */}
      <div className="rounded-2xl text-white p-5 flex items-center gap-4" style={{ backgroundColor: NAVY }}>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-1">The Gap</p>
          <p className="text-5xl font-black">{gotv.gap.toLocaleString()}</p>
          <p className="text-sm text-blue-200 mt-1">supporters who haven't voted yet</p>
        </div>
        <div className="text-right space-y-2">
          <div>
            <p className="text-2xl font-bold">{gotv.percentComplete.toFixed(0)}%</p>
            <p className="text-xs text-blue-200">complete</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: GREEN }}>{gotv.supportersVoted.toLocaleString()}</p>
            <p className="text-xs text-blue-200">voted</p>
          </div>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold" style={{ color: GREEN }}>{gotv.votedToday.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">voted today</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold" style={{ color: AMBER }}>{gotv.p1Count.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">P1 outstanding</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold text-slate-800">{gotv.hoursToClose.toFixed(1)}h</p>
          <p className="text-xs text-slate-500 mt-0.5">to close</p>
        </div>
      </div>

      {/* Hourly rate */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Votes/Hour — Last 6h</p>
          {gotv.projectedAdditional > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${GREEN}18`, color: GREEN }}>
              +{gotv.projectedAdditional} projected
            </span>
          )}
        </div>
        <HourlyChart hours={gotv.hourlyVotes} />
      </div>

      {/* Win threshold progress */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4" style={{ color: AMBER }} />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Win Threshold</p>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <p className="text-2xl font-bold" style={{ color: NAVY }}>{gotv.supportersVoted.toLocaleString()}</p>
          <p className="text-sm text-slate-400">/ {gotv.winThreshold.toLocaleString()} target</p>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: gotv.supportersVoted >= gotv.winThreshold ? GREEN : NAVY }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, gotv.winThreshold > 0 ? (gotv.supportersVoted / gotv.winThreshold) * 100 : 0)}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
        {gotv.supportersVoted >= gotv.winThreshold && (
          <p className="text-xs font-semibold mt-2" style={{ color: GREEN }}>Win threshold reached — keep pushing!</p>
        )}
      </div>

      {/* Scrutineer quick status */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Scrutineers</p>
          </div>
          <span className="text-sm font-semibold text-slate-700">{scrutineersTotal} deployed</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: scrutineersSigned === scrutineersTotal && scrutineersTotal > 0 ? GREEN : AMBER }} />
            <span className="text-slate-600">{scrutineersSigned}/{scrutineersTotal} credentialled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: scrutineersSubmitted > 0 ? GREEN : "#e2e8f0" }} />
            <span className="text-slate-600">{scrutineersSubmitted}/{scrutineersTotal} submitted</span>
          </div>
        </div>
      </div>

      {/* Results pulse */}
      {results.totalEntries > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Results Pulse</p>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="font-semibold" style={{ color: GREEN }}>{results.verifiedEntries} verified</span>
            <span className="text-slate-500">{results.pendingEntries} pending</span>
          </div>
          {results.topCandidates.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
              <span className="text-slate-700 truncate max-w-[70%]">{c.name}</span>
              <span className="font-semibold text-slate-900">{c.votes.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Last refresh */}
      <p className="text-center text-xs text-slate-400">
        Last updated {formatTime(lastRefresh.toISOString())} · refreshes every 30s
      </p>
    </div>
  );
}

/* ─── Strike-Off tab ─────────────────────────────────────────────────────── */

function StrikeOffTab({ contacts, campaignId, onVotedChange }: {
  contacts: PriorityContact[];
  campaignId: string;
  onVotedChange: (id: string) => void;
}) {
  const [marking, setMarking] = useState<Set<string>>(new Set());
  const [markedVoted, setMarkedVoted] = useState<Set<string>>(new Set());

  const markVoted = async (contactId: string) => {
    if (marking.has(contactId) || markedVoted.has(contactId)) return;
    setMarking((prev) => new Set(prev).add(contactId));
    try {
      const res = await fetch("/api/gotv/mark-voted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        setMarkedVoted((prev) => new Set(prev).add(contactId));
        onVotedChange(contactId);
      }
    } finally {
      setMarking((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
    }
  };

  const visible = contacts.filter((c) => !markedVoted.has(c.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: GREEN }} />
        <h3 className="text-lg font-semibold text-slate-900">All P1 contacts accounted for</h3>
        <p className="text-sm text-slate-500 mt-1">Every confirmed supporter has been marked as voted. Outstanding work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: `${AMBER}18` }}>
        <Target className="h-4 w-4" style={{ color: AMBER }} />
        <p className="text-sm font-medium" style={{ color: AMBER }}>{visible.length} strong supporters still outstanding</p>
      </div>

      {visible.map((c) => (
        <motion.div
          key={c.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="rounded-2xl bg-white border border-slate-200 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">{c.name}</p>
              {c.address && <p className="text-xs text-slate-500 mt-0.5">{c.address}</p>}
              {c.lastContactedAt && (
                <p className="text-xs text-slate-400 mt-0.5">Last contact {formatTime(c.lastContactedAt)}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label={`Call ${c.name}`}
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => markVoted(c.id)}
                disabled={marking.has(c.id)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: GREEN, minHeight: 36, opacity: marking.has(c.id) ? 0.7 : 1 }}
              >
                {marking.has(c.id) ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Voted
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      <p className="text-center text-xs text-slate-400 pt-1">Showing top 25 P1 (strong support). Refresh to reload list.</p>
    </div>
  );
}

/* ─── Rides tab ──────────────────────────────────────────────────────────── */

function RidesTab({ rides, campaignId, onVotedChange }: {
  rides: RideContact[];
  campaignId: string;
  onVotedChange: (id: string) => void;
}) {
  const [arranged, setArranged] = useState<Set<string>>(new Set());
  const [arranging, setArranging] = useState<Set<string>>(new Set());
  const [markingVoted, setMarkingVoted] = useState<Set<string>>(new Set());
  const [markedVoted, setMarkedVoted] = useState<Set<string>>(new Set());

  const arrangeRide = async (contactId: string) => {
    if (arranging.has(contactId) || arranged.has(contactId)) return;
    setArranging((prev) => new Set(prev).add(contactId));
    try {
      await fetch(`/api/gotv/rides/${contactId}/arranged`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverName: "Campaign team", pickupTime: "TBD" }),
      });
      setArranged((prev) => new Set(prev).add(contactId));
    } finally {
      setArranging((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
    }
  };

  const markVoted = async (contactId: string) => {
    if (markingVoted.has(contactId) || markedVoted.has(contactId)) return;
    setMarkingVoted((prev) => new Set(prev).add(contactId));
    try {
      const res = await fetch("/api/gotv/mark-voted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        setMarkedVoted((prev) => new Set(prev).add(contactId));
        onVotedChange(contactId);
      }
    } finally {
      setMarkingVoted((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
    }
  };

  const visible = rides.filter((r) => !markedVoted.has(r.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <Car className="h-12 w-12 mx-auto mb-3 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900">No outstanding ride requests</h3>
        <p className="text-sm text-slate-500 mt-1">All contacts needing rides have been accounted for.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: `${NAVY}0f` }}>
        <Car className="h-4 w-4" style={{ color: NAVY }} />
        <p className="text-sm font-medium text-slate-700">{visible.length} supporters need a ride to the polls</p>
      </div>

      {visible.map((c) => (
        <motion.div
          key={c.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl p-2 shrink-0" style={{ backgroundColor: c.accessibilityNeeds ? `${AMBER}18` : `${NAVY}0f` }}>
              <Car className="h-4 w-4" style={{ color: c.accessibilityNeeds ? AMBER : NAVY }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{c.name}</p>
                {c.accessibilityNeeds && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${AMBER}18`, color: AMBER }}>
                    Accessibility
                  </span>
                )}
              </div>
              {c.address && <p className="text-xs text-slate-500 mt-0.5">{c.address}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="flex items-center gap-1.5 flex-1 justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                style={{ minHeight: 40 }}
              >
                <Phone className="h-3.5 w-3.5" />
                {c.phone}
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => arrangeRide(c.id)}
              disabled={arranging.has(c.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border"
              style={{
                borderColor: arranged.has(c.id) ? GREEN : "#cbd5e1",
                color: arranged.has(c.id) ? GREEN : "#64748b",
                backgroundColor: arranged.has(c.id) ? `${GREEN}10` : "white",
                minHeight: 40,
              }}
            >
              {arranging.has(c.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Car className="h-3.5 w-3.5" />}
              {arranged.has(c.id) ? "Ride Arranged" : "Arrange Ride"}
            </button>
            <button
              type="button"
              onClick={() => markVoted(c.id)}
              disabled={markingVoted.has(c.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: GREEN, minHeight: 40, opacity: markingVoted.has(c.id) ? 0.7 : 1 }}
            >
              {markingVoted.has(c.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark Voted
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Polls tab ──────────────────────────────────────────────────────────── */

function PollsTab({ data }: { data: OpsData }) {
  const { scrutineers, results } = data;
  return (
    <div className="space-y-4">
      {/* Scrutineer grid */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Scrutineer Deployment</p>
          <span className="text-xs text-slate-400">{scrutineers.length} total</span>
        </div>
        {scrutineers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No scrutineers assigned. Go to Settings → Scrutineers to assign team members.
          </div>
        ) : (
          scrutineers.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{s.user.name ?? s.user.email}</p>
                <p className="text-xs text-slate-500">{s.pollingStation} · {s.municipality}{s.ward ? ` Ward ${s.ward}` : ""}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {/* Credential status */}
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={s.candidateSigned
                    ? { backgroundColor: `${GREEN}18`, color: GREEN }
                    : { backgroundColor: `${AMBER}18`, color: AMBER }
                  }
                >
                  {s.candidateSigned ? "Signed" : "Unsigned"}
                </span>
                {/* Submission status */}
                {s.hasSubmitted ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${GREEN}18`, color: GREEN }}>
                    Submitted
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live results */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live Results Feed</p>
        </div>
        <div className="px-4 py-3 flex gap-4 border-b border-slate-100 bg-slate-50">
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: GREEN }}>{results.verifiedEntries}</p>
            <p className="text-xs text-slate-500">verified</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: AMBER }}>{results.pendingEntries}</p>
            <p className="text-xs text-slate-500">pending</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-700">{results.totalEntries}</p>
            <p className="text-xs text-slate-500">total entries</p>
          </div>
        </div>

        {results.totalEntries === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No results entered yet. Scrutineers scan their printouts after polls close.
          </div>
        ) : (
          <>
            {/* Top candidates */}
            {results.topCandidates.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Running totals (verified entries only)</p>
                {results.topCandidates.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-700">{c.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{c.votes.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent entries */}
            <div className="divide-y divide-slate-50">
              {results.recentEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{e.candidateName}</p>
                    <p className="text-xs text-slate-400">{e.pollingStation ?? "—"} · {formatTime(e.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-slate-900">{e.votes.toLocaleString()}</span>
                    {e.isVerified ? (
                      <CheckCircle className="h-4 w-4" style={{ color: GREEN }} />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    {e.ocrAssisted && (
                      <Camera className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Manager view ───────────────────────────────────────────────────────── */

function ManagerView({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<ManagerTab>("command");
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  // Track voted contacts across tabs so gap updates optimistically
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`/api/eday/ops?campaignId=${campaignId}`);
      if (res.ok) {
        const json = await res.json() as OpsData;
        setData(json);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleVoted = useCallback((id: string) => {
    setVotedIds((prev) => new Set(prev).add(id));
    // Optimistically decrement gap
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gotv: {
          ...prev.gotv,
          gap: Math.max(0, prev.gotv.gap - 1),
          supportersVoted: prev.gotv.supportersVoted + 1,
          votedToday: prev.gotv.votedToday + 1,
          percentComplete: prev.gotv.confirmedSupporters > 0
            ? ((prev.gotv.supportersVoted + 1) / prev.gotv.confirmedSupporters) * 100
            : prev.gotv.percentComplete,
        },
      };
    });
  }, []);

  const TABS: Array<{ id: ManagerTab; label: string; icon: React.ReactNode }> = [
    { id: "command", label: "Command", icon: <Radio className="h-4 w-4" /> },
    { id: "strikeoff", label: "Strike-Off", icon: <Target className="h-4 w-4" /> },
    { id: "rides", label: "Rides", icon: <Car className="h-4 w-4" /> },
    { id: "polls", label: "Polls", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 text-white" style={{ backgroundColor: NAVY }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: RED }}>
              E
            </div>
            <div>
              <p className="text-sm font-semibold">Election Day Command</p>
              <p className="text-xs text-blue-200">Campaign Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-[52px] z-10 bg-white border-b border-slate-200 px-4">
        <div className="max-w-lg mx-auto flex gap-1 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                tab === t.id
                  ? { backgroundColor: `${NAVY}0f`, color: NAVY }
                  : { color: "#94a3b8" }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: NAVY }} />
            <p className="text-sm text-slate-500">Loading election day data...</p>
          </div>
        ) : !data ? (
          <div className="rounded-2xl bg-white border border-red-200 p-6 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
            <p className="font-semibold text-slate-900">Could not load election data</p>
            <button
              type="button"
              onClick={() => void fetchData(true)}
              className="mt-4 rounded-xl px-5 py-3 text-sm font-medium text-white"
              style={{ backgroundColor: NAVY }}
            >
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {tab === "command" && (
                <CommandTab data={data} lastRefresh={lastRefresh} />
              )}
              {tab === "strikeoff" && (
                <StrikeOffTab
                  contacts={data.priority}
                  campaignId={campaignId}
                  onVotedChange={handleVoted}
                />
              )}
              {tab === "rides" && (
                <RidesTab
                  rides={data.rides}
                  campaignId={campaignId}
                  onVotedChange={handleVoted}
                />
              )}
              {tab === "polls" && <PollsTab data={data} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

/* ─── Scrutineer / Volunteer view (original OCR tool) ───────────────────── */

function ScrutineerView({ campaignId }: { campaignId: string }) {
  const [assignment, setAssignment] = useState<ScrutineerAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [step, setStep] = useState<OcrStep>("ready");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [editableResult, setEditableResult] = useState<OcrResult | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "mismatch" | "error">("idle");
  const [submittedCount, setSubmittedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/eday/my-assignment?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then(({ data }) => setAssignment(data ?? null))
      .catch(() => {})
      .finally(() => setLoadingAssignment(false));
  }, [campaignId]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageCapture = useCallback(
    async (file: File) => {
      setStep("capturing");
      try {
        const imageBase64 = await fileToBase64(file);
        const mimeType = (file.type as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg";

        const body = {
          campaignId,
          imageBase64,
          mimeType,
          ...(assignment
            ? {
                hint: {
                  pollingStation: assignment.pollingStation,
                  municipality: assignment.municipality,
                  ward: assignment.ward ?? undefined,
                  province: assignment.province,
                },
              }
            : {}),
        };

        const res = await fetch("/api/results/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("OCR failed");
        const { data } = await res.json() as { data: OcrResult };
        setOcrResult(data);
        setEditableResult(data);
        setStep("reviewing");
      } catch {
        setStep("error");
      }
    },
    [campaignId, assignment],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageCapture(file);
      e.target.value = "";
    },
    [handleImageCapture],
  );

  const updateCandidate = (idx: number, field: "name" | "votes", value: string) => {
    if (!editableResult) return;
    const updated = { ...editableResult };
    updated.candidates = [...updated.candidates];
    updated.candidates[idx] = {
      ...updated.candidates[idx],
      [field]: field === "votes" ? (value === "" ? NaN : parseInt(value, 10)) : value,
    };
    setEditableResult(updated);
  };

  const submitResults = async () => {
    if (!editableResult) return;
    const invalidIdx = editableResult.candidates.findIndex(
      (c) => c.votes === null || c.votes === undefined || isNaN(c.votes),
    );
    if (invalidIdx !== -1) {
      alert(`Please enter a vote count for ${editableResult.candidates[invalidIdx].name || `candidate ${invalidIdx + 1}`}.`);
      return;
    }
    setStep("submitting");

    const entries = editableResult.candidates.map((c) => ({
      province: editableResult.province ?? assignment?.province ?? "ON",
      municipality: editableResult.municipality ?? assignment?.municipality ?? "",
      ward: editableResult.ward ?? assignment?.ward,
      office: editableResult.office ?? "Unknown Office",
      candidateName: c.name,
      party: c.party,
      votes: c.votes,
      percentReporting: editableResult.percentReporting ?? 100,
      ocrAssisted: true,
    }));

    let ok = 0;
    let mismatch = false;
    for (const entry of entries) {
      try {
        const res = await fetch("/api/results/entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (res.status === 409) mismatch = true;
        else if (res.ok) ok++;
      } catch {
        // non-fatal per candidate
      }
    }
    setSubmittedCount(ok);
    setSubmitStatus(mismatch ? "mismatch" : ok > 0 ? "ok" : "error");
    setStep("done");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <header className="sticky top-0 z-10 px-4 py-3 text-white" style={{ backgroundColor: NAVY }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: GREEN }}>
            E
          </div>
          <div>
            <p className="text-sm font-semibold">Election Day</p>
            <p className="text-xs text-blue-200">Results Entry</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loadingAssignment ? (
          <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ) : assignment ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl p-2" style={{ backgroundColor: `${GREEN}18` }}>
                <MapPin className="h-5 w-5" style={{ color: GREEN }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Assignment</p>
                <p className="font-semibold text-slate-900 mt-0.5">{assignment.pollingStation}</p>
                {assignment.pollingAddress && (
                  <p className="text-sm text-slate-500">{assignment.pollingAddress}</p>
                )}
                <p className="text-sm text-slate-500">
                  {assignment.municipality}{assignment.ward ? ` · Ward ${assignment.ward}` : ""}
                </p>
                {!assignment.candidateSigned && (
                  <p className="mt-1 text-xs font-medium text-amber-600">Candidate signature pending</p>
                )}
              </div>
              {assignment.candidateSigned && (
                <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: GREEN }} />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-4 text-center">
            <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No scrutineer assignment found for today.</p>
            <p className="text-xs text-slate-400 mt-1">Contact your campaign manager to be assigned a polling station.</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-slate-200 p-5 text-center"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ backgroundColor: `${NAVY}12` }}>
                <Camera className="h-8 w-8" style={{ color: NAVY }} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Scan Results Printout</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Take a photo of the official results printout from your polling station. The numbers will be extracted automatically.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                <Camera className="h-4 w-4" />
                Take Photo / Upload
              </button>
              <p className="mt-3 text-xs text-slate-400">Or upload an existing photo from your device</p>
            </motion.div>
          )}

          {step === "capturing" && (
            <motion.div
              key="capturing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white border border-slate-200 p-8 text-center"
            >
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3" style={{ color: GREEN }} />
              <p className="text-sm font-medium text-slate-700">Reading the printout...</p>
              <p className="text-xs text-slate-400 mt-1">This usually takes 5–10 seconds</p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-red-200 p-6 text-center"
            >
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900">Scan failed</h3>
              <p className="mt-1 text-sm text-slate-500">
                The image could not be processed. Make sure the printout is well-lit and all numbers are clearly visible, then try again.
              </p>
              <button
                type="button"
                onClick={() => setStep("ready")}
                className="mt-5 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                Try Again
              </button>
            </motion.div>
          )}

          {step === "reviewing" && editableResult && (
            <motion.div
              key="reviewing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-3"
            >
              <div className={`rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium ${
                editableResult.confidence === "high"
                  ? "bg-emerald-50 text-emerald-700"
                  : editableResult.confidence === "medium"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {editableResult.confidence === "high" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {editableResult.confidence === "high"
                  ? "All numbers clearly read — please review before submitting"
                  : `${editableResult.confidence.toUpperCase()} confidence — review carefully`}
              </div>

              {editableResult.warnings.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  {editableResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700">{w}</p>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">POLLING STATION INFO</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Station</p>
                    <p className="font-medium text-slate-800">{editableResult.pollingStation ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Office</p>
                    <p className="font-medium text-slate-800">{editableResult.office ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Municipality</p>
                    <p className="font-medium text-slate-800">{editableResult.municipality ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Ward</p>
                    <p className="font-medium text-slate-800">{editableResult.ward ?? "—"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">RESULTS — TAP TO CORRECT</p>
                </div>
                {editableResult.candidates.length === 0 && (
                  <div className="px-4 py-4 text-sm text-amber-700 bg-amber-50">
                    <p className="font-medium">No candidates extracted.</p>
                    <p className="text-xs mt-1">The image may be unclear. Retake a clearer photo.</p>
                  </div>
                )}
                {editableResult.candidates.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={c.name}
                        aria-label={`Candidate ${idx + 1} name`}
                        onChange={(e) => updateCandidate(idx, "name", e.target.value)}
                        className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none py-0.5"
                      />
                      {c.party && <p className="text-xs text-slate-400">{c.party}</p>}
                    </div>
                    <input
                      type="number"
                      value={isNaN(c.votes) ? "" : c.votes}
                      aria-label={`Votes for ${c.name || `candidate ${idx + 1}`}`}
                      onChange={(e) => updateCandidate(idx, "votes", e.target.value)}
                      className={`w-28 text-right text-lg font-semibold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${isNaN(c.votes) ? "ring-2 ring-red-400" : ""}`}
                      style={{ "--tw-ring-color": GREEN } as React.CSSProperties}
                      min={0}
                    />
                  </div>
                ))}
                {editableResult.totalVotes != null && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                    <p className="text-xs text-slate-500">Total ballots cast</p>
                    <p className="text-sm font-semibold text-slate-700">{editableResult.totalVotes.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("ready"); setOcrResult(null); setEditableResult(null); }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
                  style={{ minHeight: 48 }}
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={submitResults}
                  className="flex-1 rounded-xl text-white px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: NAVY, minHeight: 48 }}
                >
                  Submit Results
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white border border-slate-200 p-8 text-center"
            >
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3" style={{ color: GREEN }} />
              <p className="text-sm font-medium text-slate-700">Submitting results...</p>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-slate-200 p-6 text-center"
            >
              {submitStatus === "ok" && (
                <>
                  <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: GREEN }} />
                  <h3 className="text-lg font-semibold text-slate-900">Results submitted</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {submittedCount} candidate result{submittedCount !== 1 ? "s" : ""} entered. Your entry is not final until confirmed by a second team member.
                  </p>
                </>
              )}
              {submitStatus === "mismatch" && (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3" style={{ color: AMBER }} />
                  <h3 className="text-lg font-semibold text-slate-900">Vote count mismatch</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    One or more counts don't match a previous entry. Your campaign manager has been flagged to review.
                  </p>
                </>
              )}
              {submitStatus === "error" && (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Submission failed</h3>
                  <p className="mt-1 text-sm text-slate-500">Please try again or enter results manually.</p>
                </>
              )}
              <button
                type="button"
                onClick={() => { setStep("ready"); setOcrResult(null); setEditableResult(null); setSubmitStatus("idle"); }}
                className="mt-5 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                Scan Another Printout
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {(step === "ready" || step === "error") && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 mt-0.5 shrink-0 text-slate-400" />
              <div className="text-sm text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">How it works</p>
                <p>1. Get the official results printout from the DRO at the close of polls.</p>
                <p>2. Photograph it clearly — numbers must be legible.</p>
                <p>3. Review the extracted numbers. Tap any number to correct it.</p>
                <p>4. Submit. A second team member confirms to finalize.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Root export ────────────────────────────────────────────────────────── */

export default function EdayClient({
  campaignId,
  isManager,
}: {
  campaignId: string;
  isManager: boolean;
}) {
  if (isManager) return <ManagerView campaignId={campaignId} />;
  return <ScrutineerView campaignId={campaignId} />;
}
