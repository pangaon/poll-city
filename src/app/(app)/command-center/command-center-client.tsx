"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  ShieldCheck,
  Siren,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  buildPrecinctSnapshots,
  formatAddress,
  MOCK_PRIORITY,
  MOCK_SUMMARY,
  PriorityContact,
  SummaryResponse,
  supportLabel,
} from "@/components/gotv/war-room-types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type BriefingResponse = {
  campaign?: {
    name?: string;
    candidateName?: string | null;
    daysToElection?: number | null;
    electionDate?: string | null;
    phase?: string;
  };
  priorities?: Array<{ priority: number; action: string; why: string; link: string }>;
  redFlags?: string[];
};

type HealthResponse = {
  healthScore: number;
  grade: string;
};

type ActivityItem = {
  id: string;
  type: "voted" | "called" | "knocked" | "dispatched";
  name: string;
  detail: string;
  time: string;
};

type Volunteer = {
  id: string;
  name: string;
  location: string;
  status: "active" | "idle" | "en-route";
  contactsMade: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getCampaignIdFromCookie() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/activeCampaignId=([^;]+)/)?.[1] ?? "";
}

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Live-feed helpers                                                  */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function categoryToActivityType(category: string): ActivityItem["type"] {
  switch (category) {
    case "gotv": return "voted";
    case "canvass": return "knocked";
    case "donation": return "called";
    default: return "dispatched";
  }
}

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                  */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    if (start === end) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / 1200, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    prev.current = end;
  }, [value]);

  return <span className={className}>{displayed.toLocaleString()}</span>;
}

// Need useRef
import { useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Countdown Clock                                                   */
/* ------------------------------------------------------------------ */

function CountdownClock({ electionDate }: { electionDate?: string | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!electionDate) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-semibold">Election date not set</span>
      </div>
    );
  }

  const target = new Date(electionDate);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (diff === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <span className="text-sm font-black uppercase tracking-wider text-red-400">ELECTION DAY — POLLS OPEN</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Clock className="h-4 w-4 text-cyan-400" />
      <div className="flex gap-1">
        {[
          { label: "H", val: hours },
          { label: "M", val: minutes },
          { label: "S", val: seconds },
        ].map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="rounded-lg bg-slate-800 px-2 py-1 font-mono text-2xl font-black text-white md:text-3xl">
              {String(unit.val).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase text-slate-500">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Type Icon                                                */
/* ------------------------------------------------------------------ */

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "voted":
      return <UserCheck className="h-3.5 w-3.5 text-[#1D9E75]" />;
    case "called":
      return <Phone className="h-3.5 w-3.5 text-cyan-400" />;
    case "knocked":
      return <MapPin className="h-3.5 w-3.5 text-[#EF9F27]" />;
    case "dispatched":
      return <Zap className="h-3.5 w-3.5 text-violet-400" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function CommandCenterClient() {
  const [campaignId, setCampaignId] = useState("");
  const [summary, setSummary] = useState<SummaryResponse>(MOCK_SUMMARY);
  const [priority, setPriority] = useState<PriorityContact[]>(MOCK_PRIORITY);
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fallback, setFallback] = useState<string[]>([]);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  const load = useCallback(async (id: string) => {
    const fallbackReasons: string[] = [];

    const [summaryRes, priorityRes, briefingRes, healthRes, volunteerRes, activityRes] = await Promise.all([
      safeJson<SummaryResponse>(`/api/gotv/summary?campaignId=${id}`),
      safeJson<{ data: PriorityContact[] }>(`/api/gotv/priority-list?campaignId=${id}`),
      safeJson<BriefingResponse>(`/api/briefing?campaignId=${id}`),
      safeJson<HealthResponse>(`/api/briefing/health-score?campaignId=${id}`),
      safeJson<{ leaderboard: Array<{ userId: string; name: string; doorsToday: number; status: string }> }>(`/api/volunteers/performance?campaignId=${id}`),
      safeJson<{ feed: Array<{ id: string; message: string; category: string; who: string; time: string }> }>(`/api/activity/live-feed?campaignId=${id}`),
    ]);

    if (summaryRes) setSummary(summaryRes);
    else fallbackReasons.push("GOTV summary fallback");

    if (priorityRes?.data) setPriority(priorityRes.data);
    else fallbackReasons.push("Priority list fallback");

    if (briefingRes) setBriefing(briefingRes);
    else fallbackReasons.push("Briefing unavailable");

    if (healthRes) setHealth(healthRes);
    else fallbackReasons.push("Health score unavailable");

    if (volunteerRes?.leaderboard) {
      setVolunteers(volunteerRes.leaderboard.map((v) => ({
        id: v.userId,
        name: v.name,
        location: "—",
        status: (v.status === "star" || v.status === "active" ? "active" : "idle") as Volunteer["status"],
        contactsMade: v.doorsToday,
      })));
    }

    if (activityRes?.feed) {
      setActivityFeed(activityRes.feed.map((a) => ({
        id: a.id,
        type: categoryToActivityType(a.category),
        name: a.who,
        detail: a.message,
        time: relativeTime(a.time),
      })));
    }

    setFallback(fallbackReasons);
  }, []);

  useEffect(() => {
    const id = getCampaignIdFromCookie();
    setCampaignId(id);
    load(id).finally(() => setLoading(false));
  }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      load(campaignId).catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [campaignId, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(campaignId);
    setRefreshing(false);
  };

  const precincts = useMemo(() => buildPrecinctSnapshots(summary, priority), [summary, priority]);

  const markVoted = async (contactId: string) => {
    setBusyContactId(contactId);
    try {
      const response = await fetch("/api/gotv/mark-voted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactId }),
      });
      if (response.ok) {
        setPriority((current) => current.filter((c) => c.id !== contactId));
      }
    } finally {
      setBusyContactId(null);
    }
  };

  const strikeOff = async (contactId: string) => {
    setBusyContactId(contactId);
    try {
      const response = await fetch("/api/gotv/strike-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactId }),
      });
      if (response.ok) {
        setPriority((current) => current.filter((c) => c.id !== contactId));
      }
    } finally {
      setBusyContactId(null);
    }
  };

  const percent = summary.confirmedSupporters > 0
    ? Math.round((summary.supportersVoted / summary.confirmedSupporters) * 100)
    : 0;

  const projectedPace = summary.votedToday > 0 ? Math.round(summary.votedToday * 1.4) : 0;
  const actualPace = summary.votedToday;
  const paceStatus = actualPace >= projectedPace * 0.9 ? "on-track" : actualPace >= projectedPace * 0.7 ? "warning" : "behind";

  const outstandingP1 = priority.filter((c) => c.supportLevel === "strong_support").length;

  /* -- Shimmer skeleton -- */
  if (loading) {
    return (
      <div className="min-h-screen space-y-4 p-4" style={{ background: "#0A1628" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-800/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ background: "#0A1628" }}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* ---- Header ---- */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          className="rounded-2xl border border-slate-700/50 p-5 md:p-8"
          style={{ background: "linear-gradient(135deg, #0A1628 0%, #122040 40%, #0f2847 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">COMMAND CENTER</h1>
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                  <span className="absolute -left-0.5 -top-0.5 h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  LIVE OPS
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {briefing?.campaign?.name ?? "Campaign"} — {briefing?.campaign?.phase ?? "Election Day Operations"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CountdownClock electionDate={briefing?.campaign?.electionDate} />
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Outstanding P1 Alert */}
          {outstandingP1 > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center gap-3 rounded-xl border border-[#E24B4A]/50 bg-[#E24B4A]/10 px-4 py-3"
            >
              <Siren className="h-5 w-5 text-[#E24B4A]" />
              <div>
                <p className="text-sm font-black text-[#E24B4A]">{outstandingP1} P1 SUPPORTERS HAVE NOT VOTED</p>
                <p className="text-xs text-slate-300">These are strong supporters who need immediate contact.</p>
              </div>
            </motion.div>
          )}

          {/* Vote Pace Indicator */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vote Pace</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Actual</p>
                <p className="text-lg font-black text-white">{actualPace.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Projected</p>
                <p className="text-lg font-black text-slate-400">{projectedPace.toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${paceStatus === "on-track" ? "bg-[#1D9E75]/20 text-[#1D9E75]" : paceStatus === "warning" ? "bg-[#EF9F27]/20 text-[#EF9F27]" : "bg-[#E24B4A]/20 text-[#E24B4A]"}`}>
                {paceStatus === "on-track" ? "ON TRACK" : paceStatus === "warning" ? "WATCH" : "BEHIND PACE"}
              </span>
            </div>
          </div>
        </motion.section>

        {fallback.length > 0 && (
          <div className="rounded-xl border border-[#EF9F27]/60 bg-[#EF9F27]/10 px-4 py-2 text-xs font-semibold text-[#EF9F27]">
            DEMO MODE: {fallback.join(" | ")}
          </div>
        )}

        {/* ---- 4-Quadrant Layout ---- */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top-Left: GOTV Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">GOTV Operations</p>
            </div>

            {/* P1-P4 Breakdown */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "P1", count: summary.p1Count, color: "#E24B4A" },
                { label: "P2", count: summary.p2Count, color: "#EF9F27" },
                { label: "P3", count: summary.p3Count, color: "#38bdf8" },
                { label: "P4", count: summary.p4Count, color: "#64748b" },
              ].map((p) => (
                <div key={p.label} className="rounded-lg bg-slate-800/60 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase" style={{ color: p.color }}>{p.label}</p>
                  <AnimatedCounter value={p.count} className="text-2xl font-black text-white md:text-3xl" />
                </div>
              ))}
            </div>

            {/* Voted counter + progress */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-slate-400">Supporters Voted</p>
                  <AnimatedCounter value={summary.supportersVoted} className="text-4xl font-black text-white md:text-5xl" />
                  <span className="ml-2 text-lg text-slate-500">/ {summary.confirmedSupporters.toLocaleString()}</span>
                </div>
                <span className="text-3xl font-black text-cyan-400">{percent}%</span>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-[#1D9E75]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percent, 100)}%` }}
                  transition={{ type: "spring", stiffness: 40, damping: 12 }}
                />
              </div>
            </div>

            {/* KPI tiles */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniKpi label="Gap" value={summary.gap.toLocaleString()} icon={<Siren className="h-3.5 w-3.5" />} color="#E24B4A" />
              <MiniKpi label="Win Threshold" value={summary.winThreshold.toLocaleString()} icon={<AlertTriangle className="h-3.5 w-3.5" />} color="#EF9F27" />
              <MiniKpi label="Health" value={health ? `${health.healthScore}` : "N/A"} icon={<ShieldCheck className="h-3.5 w-3.5" />} color="#1D9E75" />
            </div>
          </motion.div>

          {/* Top-Right: Active Volunteers */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Volunteers</p>
              </div>
              <span className="rounded-full bg-[#1D9E75]/20 px-2.5 py-0.5 text-xs font-bold text-[#1D9E75]">
                {volunteers.filter((v) => v.status === "active").length} Active
              </span>
            </div>

            <div className="space-y-2">
              {volunteers.map((vol) => (
                <motion.div
                  key={vol.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{vol.name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {vol.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-300">{vol.contactsMade} contacts</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${vol.status === "active" ? "bg-[#1D9E75]/20 text-[#1D9E75]" : vol.status === "en-route" ? "bg-[#EF9F27]/20 text-[#EF9F27]" : "bg-slate-600/40 text-slate-400"}`}>
                      {vol.status.toUpperCase()}
                    </span>
                  </div>
                </motion.div>
              ))}
              {volunteers.length === 0 && (
                <div className="py-8 text-center">
                  <Users className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                  <p className="text-sm font-medium text-slate-400">No live volunteer tracking</p>
                  <p className="mt-1 text-xs text-slate-500">Volunteer activity will appear here during operations</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Bottom-Left: Priority Call List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#EF9F27]" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Priority Call List</p>
              </div>
              <span className="text-xs text-slate-500">{priority.length} remaining</span>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              <AnimatePresence>
                {priority.map((contact) => (
                  <motion.div
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-slate-400">{formatAddress(contact)}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${contact.supportLevel === "strong_support" ? "bg-[#E24B4A]/20 text-[#E24B4A]" : "bg-[#EF9F27]/20 text-[#EF9F27]"}`}>
                        {supportLabel(contact.supportLevel)}
                      </span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/30"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={busyContactId === contact.id}
                        onClick={() => markVoted(contact.id)}
                        className="rounded-lg bg-[#1D9E75]/20 px-3 py-1.5 text-xs font-bold text-[#1D9E75] transition hover:bg-[#1D9E75]/30 disabled:opacity-50"
                      >
                        Voted
                      </button>
                      <button
                        type="button"
                        disabled={busyContactId === contact.id}
                        onClick={() => strikeOff(contact.id)}
                        className="rounded-lg bg-slate-600/30 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-600/50 disabled:opacity-50"
                      >
                        Strike
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {priority.length === 0 && (
                <div className="py-8 text-center">
                  <UserCheck className="mx-auto mb-2 h-6 w-6 text-[#1D9E75]" />
                  <p className="text-sm font-bold text-[#1D9E75]">All priority contacts reached!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Bottom-Right: Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity Feed</p>
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {activityFeed.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/30 bg-slate-800/30 p-3"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-semibold text-slate-500">{item.time}</span>
                </motion.div>
              ))}
              {activityFeed.length === 0 && (
                <div className="py-8 text-center">
                  <Activity className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                  <p className="text-sm font-medium text-slate-400">Activity feed populates during live operations</p>
                  <p className="mt-1 text-xs text-slate-500">Door knocks, calls, and votes will appear here in real time</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ---- Red Flags ---- */}
        {(briefing?.redFlags?.length ?? 0) > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-[#E24B4A]/40 bg-[#E24B4A]/5 p-4"
          >
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#E24B4A]">Red Flags</p>
            <div className="space-y-1">
              {briefing?.redFlags?.map((flag, i) => (
                <p key={i} className="text-xs text-slate-300">• {flag}</p>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini KPI                                                          */
/* ------------------------------------------------------------------ */

function MiniKpi({ label, value, icon, color }: { label: string; value: string; icon: ReactNode; color?: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 p-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{icon}{label}</p>
      <p className="mt-0.5 text-lg font-black" style={{ color: color ?? "#ffffff" }}>{value}</p>
    </div>
  );
}
