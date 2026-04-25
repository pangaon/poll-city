"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useActiveCampaignId } from "@/lib/hooks/useActiveCampaignId";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Gauge,
  PlusCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type LiveData = {
  campaign?: { name?: string; candidateName?: string | null };
  gap: number;
  winThreshold: number;
  supportersVoted: number;
  confirmedSupporters: number;
  supporterTurnout: number;
  totalVoted: number;
  overallTurnout: number;
  votedToday: number;
  morale: "winning" | "close" | "behind" | "critical";
  winProbability: number;
  pacing: { hoursRemaining: number; votesNeededPerHour: number; pollsOpen: boolean; pollsClosed: boolean };
  hourlyFlow: Array<{ hour: string; votes: number }>;
  recentStrikeOffs: Array<{ name: string; address: string | null; votedAt: string | null; isSupporter: boolean }>;
  lastUpload: { minutesAgo: number; stale: boolean } | null;
  timestamp: string;
};

type PollData = {
  polls: Array<{
    poll: string | null;
    total: number;
    voted: number;
    turnout: number;
    supporters: number;
    supportersVoted: number;
    supporterTurnout: number;
    outstanding: number;
    status: "reporting" | "pending";
  }>;
  summary: { totalPolls: number; reporting: number; pending: number };
};

type CallRaceResponse = {
  ok: boolean;
  result: "won" | "lost";
  message: string;
  nextSteps: string[];
};

type PollResult = {
  pollNumber: string;
  candidateVotes: number;
  opponentVotes: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

const MOCK_LIVE: LiveData = {
  campaign: { name: "Ward 12 Council Race", candidateName: "Sarah Chen" },
  gap: 124,
  winThreshold: 2800,
  supportersVoted: 2676,
  confirmedSupporters: 4600,
  supporterTurnout: 58,
  totalVoted: 4980,
  overallTurnout: 41,
  votedToday: 1320,
  morale: "close",
  winProbability: 64,
  pacing: { hoursRemaining: 2, votesNeededPerHour: 62, pollsOpen: true, pollsClosed: false },
  hourlyFlow: [
    { hour: "14:00", votes: 82 },
    { hour: "15:00", votes: 97 },
    { hour: "16:00", votes: 128 },
    { hour: "17:00", votes: 165 },
    { hour: "18:00", votes: 192 },
    { hour: "19:00", votes: 201 },
    { hour: "20:00", votes: 0 },
  ],
  recentStrikeOffs: [
    { name: "Jordan Lee", address: "114 Queen St", votedAt: new Date().toISOString(), isSupporter: true },
    { name: "Rina Patel", address: "22 Bay Ave", votedAt: new Date().toISOString(), isSupporter: true },
    { name: "Carlos Nguyen", address: "19 Cedar Cres", votedAt: new Date().toISOString(), isSupporter: false },
  ],
  lastUpload: { minutesAgo: 18, stale: false },
  timestamp: new Date().toISOString(),
};

const MOCK_POLLS: PollData = {
  polls: [
    { poll: "001", total: 820, voted: 352, turnout: 43, supporters: 314, supportersVoted: 186, supporterTurnout: 59, outstanding: 128, status: "reporting" },
    { poll: "004", total: 760, voted: 300, turnout: 39, supporters: 286, supportersVoted: 148, supporterTurnout: 52, outstanding: 138, status: "reporting" },
    { poll: "007", total: 900, voted: 321, turnout: 36, supporters: 342, supportersVoted: 140, supporterTurnout: 41, outstanding: 202, status: "pending" },
    { poll: "010", total: 680, voted: 280, turnout: 41, supporters: 260, supportersVoted: 155, supporterTurnout: 60, outstanding: 105, status: "reporting" },
    { poll: "012", total: 550, voted: 198, turnout: 36, supporters: 210, supportersVoted: 90, supporterTurnout: 43, outstanding: 120, status: "pending" },
  ],
  summary: { totalPolls: 5, reporting: 3, pending: 2 },
};

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                  */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ value, duration = 1.2, className }: { value: number; duration?: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    if (start === end) return;
    const startTime = performance.now();
    const ms = duration * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / ms, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    prev.current = end;
  }, [value, duration]);

  return <span className={className}>{displayed.toLocaleString()}</span>;
}

/* ------------------------------------------------------------------ */
/*  Pulsing LIVE Badge                                                */
/* ------------------------------------------------------------------ */

function LiveBadge() {
  return (
    <span className="relative ml-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
      <span className="absolute -left-0.5 -top-0.5 h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
      <Radio className="h-3.5 w-3.5 animate-pulse" />
      LIVE
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Bar                                                    */
/* ------------------------------------------------------------------ */

function ComparisonBar({
  candidateVotes,
  opponentVotes,
  candidateName,
  opponentName,
}: {
  candidateVotes: number;
  opponentVotes: number;
  candidateName: string;
  opponentName: string;
}) {
  const total = candidateVotes + opponentVotes;
  const candidatePct = total > 0 ? (candidateVotes / total) * 100 : 50;
  const leading = candidateVotes >= opponentVotes;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{candidateName}</p>
          <AnimatedCounter value={candidateVotes} className="text-5xl font-black text-white md:text-6xl" />
        </div>
        <p className="text-lg font-bold text-slate-500">vs</p>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{opponentName}</p>
          <AnimatedCounter value={opponentVotes} className="text-5xl font-black text-slate-400 md:text-6xl" />
        </div>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-l-full ${leading ? "bg-[#1D9E75]" : "bg-[#E24B4A]"}`}
          initial={{ width: "50%" }}
          animate={{ width: `${candidatePct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
        <motion.div
          className={`absolute inset-y-0 right-0 rounded-r-full ${leading ? "bg-slate-600" : "bg-[#E24B4A]/60"}`}
          initial={{ width: "50%" }}
          animate={{ width: `${100 - candidatePct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-white drop-shadow">
            {candidatePct.toFixed(1)}% — {(100 - candidatePct).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function ElectionNightClient() {
  const { campaignId, status: sessionStatus } = useActiveCampaignId();
  const [live, setLive] = useState<LiveData>(MOCK_LIVE);
  const [polls, setPolls] = useState<PollData>(MOCK_POLLS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fallback, setFallback] = useState<string[]>([]);
  const [callRaceState, setCallRaceState] = useState<CallRaceResponse | null>(null);
  const [localResults, setLocalResults] = useState<PollResult[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [prevLeading, setPrevLeading] = useState(false);
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);

  // Form state
  const [formPoll, setFormPoll] = useState("");
  const [formCandidate, setFormCandidate] = useState("");
  const [formOpponent, setFormOpponent] = useState("");

  const candidateName = live.campaign?.candidateName ?? "Candidate";
  const opponentName = "Opponent";

  // Derive candidate / opponent vote totals from localResults
  const candidateTotal = useMemo(
    () => localResults.reduce((s, r) => s + r.candidateVotes, 0) || live.supportersVoted,
    [localResults, live.supportersVoted],
  );
  const opponentTotal = useMemo(
    () => localResults.reduce((s, r) => s + r.opponentVotes, 0) || Math.max(0, live.supportersVoted - live.gap),
    [localResults, live.supportersVoted, live.gap],
  );

  const isLeading = candidateTotal > opponentTotal;

  // Confetti when candidate takes the lead
  useEffect(() => {
    if (isLeading && !prevLeading) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.4 },
        colors: ["#1D9E75", "#38bdf8", "#facc15", "#ffffff"],
      });
    }
    setPrevLeading(isLeading);
  }, [isLeading, prevLeading]);

  const load = useCallback(async (id: string) => {
    const fallbackReasons: string[] = [];
    const [liveData, pollData] = await Promise.all([
      safeFetch<LiveData>(`/api/election-night/live?campaignId=${id}`),
      safeFetch<PollData>(`/api/election-night/poll-results?campaignId=${id}`),
    ]);

    if (liveData) setLive(liveData);
    else fallbackReasons.push("live feed fallback");

    if (pollData) setPolls(pollData);
    else fallbackReasons.push("poll results fallback");

    setFallback(fallbackReasons);
  }, []);

  useEffect(() => {
    if (sessionStatus !== "ready") return;
    load(campaignId).finally(() => setLoading(false));
  }, [campaignId, sessionStatus, load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      load(campaignId).catch(() => {});
      setSecondsToRefresh(30);
    }, 30_000);
    const countdown = setInterval(() => {
      setSecondsToRefresh((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [campaignId, load]);

  async function refreshNow() {
    setRefreshing(true);
    await load(campaignId);
    setSecondsToRefresh(30);
    setRefreshing(false);
  }

  async function callRace(result: "won" | "lost") {
    const response = await fetch("/api/election-night/call-race", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, result }),
    });
    if (response.ok) {
      const payload = (await response.json()) as CallRaceResponse;
      setCallRaceState(payload);
      if (result === "won") {
        confetti({ particleCount: 500, spread: 160, origin: { y: 0.3 }, colors: ["#1D9E75", "#38bdf8", "#facc15"] });
      }
    }
  }

  function handleSubmitResult(e: FormEvent) {
    e.preventDefault();
    if (!formPoll || !formCandidate || !formOpponent) return;
    setLocalResults((prev) => [
      ...prev,
      { pollNumber: formPoll, candidateVotes: Number(formCandidate), opponentVotes: Number(formOpponent) },
    ]);
    setFormPoll("");
    setFormCandidate("");
    setFormOpponent("");
  }

  const hourlyMax = useMemo(() => {
    const values = live.hourlyFlow.map((h) => h.votes);
    return Math.max(...values, 1);
  }, [live.hourlyFlow]);

  const pollsReportingPct = polls.summary.totalPolls > 0
    ? Math.round((polls.summary.reporting / polls.summary.totalPolls) * 100)
    : 0;

  /* -- Shimmer skeleton -- */
  if (loading) {
    return (
      <div className="min-h-screen space-y-4 p-4" style={{ background: "#0D1117" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ background: "#0D1117" }}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* ---- Header ---- */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          className="rounded-2xl border border-slate-700/60 p-5 md:p-8"
          style={{ background: "linear-gradient(135deg, #0D1117 0%, #1a1f35 40%, #162038 100%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center">
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                  ELECTION NIGHT
                </h1>
                <LiveBadge />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {live.campaign?.name ?? "Campaign"} — {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                Next refresh: {secondsToRefresh}s
              </span>
              <button
                type="button"
                onClick={refreshNow}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh Now
              </button>
            </div>
          </div>

          {/* Candidate vs Opponent comparison */}
          <div className="mt-6">
            <ComparisonBar
              candidateVotes={candidateTotal}
              opponentVotes={opponentTotal}
              candidateName={candidateName}
              opponentName={opponentName}
            />
          </div>

          {/* KPI Row */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
            <Kpi label="Win Probability" value={`${live.winProbability}%`} icon={<Gauge className="h-4 w-4" />} color={live.winProbability > 60 ? "#1D9E75" : live.winProbability > 40 ? "#EF9F27" : "#E24B4A"} />
            <Kpi label="Supporter Turnout" value={`${live.supporterTurnout}%`} icon={<ShieldCheck className="h-4 w-4" />} />
            <Kpi label="Overall Turnout" value={`${live.overallTurnout}%`} icon={<TrendingUp className="h-4 w-4" />} />
            <Kpi label="Voted Today" value={live.votedToday.toLocaleString()} icon={<Trophy className="h-4 w-4" />} />
            <Kpi label="Votes/Hr Needed" value={live.pacing.votesNeededPerHour.toLocaleString()} icon={<AlertTriangle className="h-4 w-4" />} color="#EF9F27" />
            <Kpi label="The Gap" value={live.gap.toLocaleString()} icon={<Zap className="h-4 w-4" />} color={live.gap > 200 ? "#E24B4A" : "#1D9E75"} />
          </div>
        </motion.section>

        {fallback.length > 0 && (
          <div className="rounded-xl border border-[#EF9F27]/60 bg-[#EF9F27]/10 px-4 py-2 text-xs font-semibold text-[#EF9F27]">
            DEMO MODE: {fallback.join(" | ")}
          </div>
        )}

        {/* ---- Polls Reporting + Hourly Flow ---- */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Hourly Flow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/60 bg-[#161B22] p-4 lg:col-span-2"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <BarChart3 className="mr-1 inline h-3.5 w-3.5" />
              Hourly Vote Flow
            </p>
            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {live.hourlyFlow.map((point) => (
                <div key={point.hour} className="flex flex-col items-center gap-1">
                  <div className="relative flex h-40 w-full items-end rounded-lg bg-slate-800/60 p-1">
                    <motion.div
                      className="w-full rounded-md bg-gradient-to-t from-cyan-500 to-cyan-300"
                      initial={{ height: "4%" }}
                      animate={{ height: `${Math.max(4, Math.round((point.votes / hourlyMax) * 100))}%` }}
                      transition={{ type: "spring", stiffness: 40, damping: 10 }}
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400">{point.hour}</p>
                  <p className="text-sm font-black text-white">{point.votes}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Polls Reporting */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 80 }}
            className="rounded-2xl border border-slate-700/60 bg-[#161B22] p-4"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Polls Reporting</p>
            <div className="flex items-baseline gap-1">
              <AnimatedCounter value={polls.summary.reporting} className="text-5xl font-black text-white" />
              <span className="text-2xl font-bold text-slate-500">/ {polls.summary.totalPolls}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-[#1D9E75]"
                initial={{ width: 0 }}
                animate={{ width: `${pollsReportingPct}%` }}
                transition={{ type: "spring", stiffness: 40, damping: 12 }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">{pollsReportingPct}% of polls reporting — {polls.summary.pending} pending</p>

            <div className="mt-4 space-y-2">
              {polls.polls.slice(0, 6).map((poll) => {
                const winning = poll.supporterTurnout >= 50;
                return (
                  <div
                    key={poll.poll ?? "unknown"}
                    className={`rounded-lg border p-2 text-xs ${winning ? "border-[#1D9E75]/40 bg-[#1D9E75]/10" : "border-[#E24B4A]/40 bg-[#E24B4A]/10"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Poll {poll.poll ?? "N/A"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${poll.status === "reporting" ? "bg-[#1D9E75]/20 text-[#1D9E75]" : "bg-[#EF9F27]/20 text-[#EF9F27]"}`}>
                        {poll.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300">
                      Outstanding: <span className={`font-bold ${winning ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>{poll.outstanding}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ---- Poll-by-Poll Results Table ---- */}
        {localResults.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-700/60 bg-[#161B22] p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Scrutineer Results — Poll-by-Poll
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Poll #</th>
                    <th className="px-3 py-2">{candidateName}</th>
                    <th className="px-3 py-2">{opponentName}</th>
                    <th className="px-3 py-2">Margin</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {localResults.map((r) => {
                    const margin = r.candidateVotes - r.opponentVotes;
                    const winning = margin > 0;
                    return (
                      <tr key={r.pollNumber} className="border-b border-slate-800">
                        <td className="px-3 py-2 font-bold text-white">{r.pollNumber}</td>
                        <td className="px-3 py-2 font-bold text-white">{r.candidateVotes.toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-300">{r.opponentVotes.toLocaleString()}</td>
                        <td className={`px-3 py-2 font-bold ${winning ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
                          {winning ? "+" : ""}{margin}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${winning ? "bg-[#1D9E75]/20 text-[#1D9E75]" : "bg-[#E24B4A]/20 text-[#E24B4A]"}`}>
                            {winning ? "WINNING" : "LOSING"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* ---- Results Entry Form ---- */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-700/60 bg-[#161B22] p-4"
        >
          <button
            type="button"
            onClick={() => setShowEntryForm(!showEntryForm)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-cyan-400" />
              <p className="text-sm font-bold uppercase tracking-wider text-white">Scrutineer Results Entry</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showEntryForm ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showEntryForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 16 }}
                onSubmit={handleSubmitResult}
                className="mt-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">Poll Number</label>
                    <input
                      type="text"
                      value={formPoll}
                      onChange={(e) => setFormPoll(e.target.value)}
                      placeholder="e.g. 001"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">{candidateName} Votes</label>
                    <input
                      type="number"
                      min={0}
                      value={formCandidate}
                      onChange={(e) => setFormCandidate(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-400">Opponent Votes</label>
                    <input
                      type="number"
                      min={0}
                      value={formOpponent}
                      onChange={(e) => setFormOpponent(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-400"
                    >
                      Add Result
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ---- Live Ticker ---- */}
        <section className="rounded-2xl border border-slate-700/60 bg-[#161B22] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Live Strike-Off Ticker</p>
          <div className="overflow-hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs">
            <span className="inline-block animate-[electionTicker_28s_linear_infinite] text-slate-100">
              {live.recentStrikeOffs.length === 0
                ? "No recent strike-offs yet"
                : live.recentStrikeOffs.map((entry) => `${entry.name}${entry.isSupporter ? " (supporter)" : ""} — ${entry.address ?? "n/a"}`).join("   |   ")}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Last voted-list upload: {live.lastUpload ? `${live.lastUpload.minutesAgo}m ago${live.lastUpload.stale ? " (STALE)" : ""}` : "none"}
          </p>
        </section>

        {/* ---- Call Race Buttons ---- */}
        <div className="grid gap-3 md:grid-cols-2">
          <motion.button
            type="button"
            onClick={() => callRace("won")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl border border-[#1D9E75]/40 bg-[#1D9E75]/15 px-5 py-4 text-left transition"
          >
            <p className="text-lg font-black uppercase tracking-wider text-[#1D9E75]">Call Race: WON</p>
            <p className="mt-1 text-xs text-slate-300">Trigger win-mode messaging and post-election checklist.</p>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => callRace("lost")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl border border-[#EF9F27]/40 bg-[#EF9F27]/15 px-5 py-4 text-left transition"
          >
            <p className="text-lg font-black uppercase tracking-wider text-[#EF9F27]">Call Race: LOST</p>
            <p className="mt-1 text-xs text-slate-300">Trigger graceful concession flow and follow-up checklist.</p>
          </motion.button>
        </div>

        {/* ---- Call Race Result ---- */}
        <AnimatePresence>
          {callRaceState && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-2xl border p-5 ${callRaceState.result === "won" ? "border-[#1D9E75]/60 bg-[#1D9E75]/10" : "border-[#EF9F27]/60 bg-[#EF9F27]/10"}`}
            >
              <p className={`text-xl font-black uppercase tracking-wider ${callRaceState.result === "won" ? "text-[#1D9E75]" : "text-[#EF9F27]"}`}>
                Race Called: {callRaceState.result.toUpperCase()}
              </p>
              <p className="mt-2 text-sm text-slate-200">{callRaceState.message}</p>
              <div className="mt-3 space-y-1">
                {callRaceState.nextSteps.map((step) => (
                  <p key={step} className="text-xs text-slate-300">• {step}</p>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes electionTicker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                          */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, icon, color }: { label: string; value: string; icon: ReactNode; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="rounded-xl border border-slate-700/60 bg-[#161B22] p-3"
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{icon}{label}</p>
      <p className="mt-1 text-xl font-black" style={{ color: color ?? "#ffffff" }}>{value}</p>
    </motion.div>
  );
}
