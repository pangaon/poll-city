"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Gauge, RefreshCw, ShieldCheck, Trophy } from "lucide-react";

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

function getCampaignIdFromCookie() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/activeCampaignId=([^;]+)/)?.[1] ?? "";
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const MOCK_LIVE: LiveData = {
  campaign: { name: "Election Night", candidateName: "Candidate" },
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
  ],
  summary: { totalPolls: 3, reporting: 2, pending: 1 },
};

export default function ElectionNightPage() {
  const [campaignId, setCampaignId] = useState("");
  const [live, setLive] = useState<LiveData>(MOCK_LIVE);
  const [polls, setPolls] = useState<PollData>(MOCK_POLLS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fallback, setFallback] = useState<string[]>([]);
  const [callRaceState, setCallRaceState] = useState<CallRaceResponse | null>(null);

  async function load(id: string) {
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
  }

  useEffect(() => {
    const id = getCampaignIdFromCookie();
    setCampaignId(id);
    load(id).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      load(campaignId).catch(() => {
        // Keep the existing state visible when a refresh fails.
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [campaignId]);

  async function refreshNow() {
    setRefreshing(true);
    await load(campaignId);
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
    }
  }

  const hourlyMax = useMemo(() => {
    const values = live.hourlyFlow.map((h) => h.votes);
    return Math.max(...values, 1);
  }, [live.hourlyFlow]);

  const moodClass = live.morale === "winning"
    ? "text-emerald-300"
    : live.morale === "close"
      ? "text-cyan-300"
      : live.morale === "behind"
        ? "text-amber-300"
        : "text-red-300";

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-800" />;
  }

  return (
    <div className="min-h-[80vh] space-y-4 rounded-2xl bg-slate-950 p-4 text-white md:p-6">
      <section className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Election Night Live</p>
            <h1 className="text-3xl font-black md:text-5xl">THE GAP: {live.gap.toLocaleString()}</h1>
            <p className="mt-1 text-sm text-slate-200">{live.campaign?.name ?? "Campaign"} · Win threshold {live.winThreshold.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={refreshNow}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh 10s
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Kpi label="Win Probability" value={`${live.winProbability}%`} icon={<Gauge className="h-4 w-4" />} />
          <Kpi label="Supporter Turnout" value={`${live.supporterTurnout}%`} icon={<ShieldCheck className="h-4 w-4" />} />
          <Kpi label="Overall Turnout" value={`${live.overallTurnout}%`} icon={<TrendingIcon />} />
          <Kpi label="Voted Today" value={live.votedToday.toLocaleString()} icon={<Trophy className="h-4 w-4" />} />
          <Kpi label="Votes / Hour Needed" value={live.pacing.votesNeededPerHour.toLocaleString()} icon={<AlertTriangle className="h-4 w-4" />} />
          <Kpi label="Morale" value={live.morale.toUpperCase()} className={moodClass} icon={<Gauge className="h-4 w-4" />} />
        </div>
      </section>

      {fallback.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          FALLBACK MODE: {fallback.join(" | ")}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Hourly Vote Flow</p>
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {live.hourlyFlow.map((point) => (
              <div key={point.hour} className="flex flex-col items-center gap-1">
                <div className="relative flex h-36 w-full items-end rounded-md bg-slate-800 p-1">
                  <div
                    className="w-full rounded-sm bg-cyan-400 transition-all"
                    style={{ height: `${Math.max(4, Math.round((point.votes / hourlyMax) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] font-semibold text-slate-300">{point.hour}</p>
                <p className="text-xs font-bold text-white">{point.votes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Polls Reporting</p>
          <p className="text-3xl font-black text-white">{polls.summary.reporting}<span className="text-lg text-slate-300">/{polls.summary.totalPolls}</span></p>
          <p className="mt-1 text-xs text-slate-400">Pending: {polls.summary.pending}</p>

          <div className="mt-4 space-y-1.5">
            {polls.polls.slice(0, 8).map((poll) => (
              <div key={poll.poll ?? "unknown"} className="rounded-md bg-slate-800 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Poll {poll.poll ?? "N/A"}</span>
                  <span className={poll.status === "reporting" ? "text-cyan-300" : "text-amber-300"}>{poll.status}</span>
                </div>
                <p className="mt-1 text-slate-300">Supporters outstanding: <span className="font-bold text-white">{poll.outstanding}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Live Strike-Off Ticker</p>
        <div className="overflow-hidden whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs">
          <span className="inline-block animate-[ticker_28s_linear_infinite] text-slate-100">
            {live.recentStrikeOffs.length === 0
              ? "No recent strike-offs yet"
              : live.recentStrikeOffs.map((entry) => `${entry.name}${entry.isSupporter ? " (supporter)" : ""} • ${entry.address ?? "address n/a"}`).join("   |   ")}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Last voted-list upload: {live.lastUpload ? `${live.lastUpload.minutesAgo} minutes ago${live.lastUpload.stale ? " (STALE)" : ""}` : "none"}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => callRace("won")}
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-left text-emerald-100 transition hover:bg-emerald-500/30"
        >
          <p className="text-sm font-black uppercase tracking-wide">Call Race: Won</p>
          <p className="text-xs">Trigger win-mode messaging and post-election checklist.</p>
        </button>
        <button
          type="button"
          onClick={() => callRace("lost")}
          className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-3 text-left text-amber-100 transition hover:bg-amber-500/30"
        >
          <p className="text-sm font-black uppercase tracking-wide">Call Race: Lost</p>
          <p className="text-xs">Trigger graceful concession flow and follow-up checklist.</p>
        </button>
      </section>

      {callRaceState && (
        <section className="rounded-xl border border-cyan-300/40 bg-cyan-500/10 p-4">
          <p className="text-sm font-black uppercase tracking-wide text-cyan-200">Race Called: {callRaceState.result.toUpperCase()}</p>
          <p className="mt-1 text-sm text-cyan-50">{callRaceState.message}</p>
          <div className="mt-2 space-y-1">
            {callRaceState.nextSteps.map((step) => (
              <p key={step} className="text-xs text-cyan-100">• {step}</p>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, icon, className }: { label: string; value: string; icon: ReactNode; className?: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-black/20 p-3">
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-cyan-100">{icon}{label}</p>
      <p className={`mt-1 text-lg font-black text-white ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function TrendingIcon() {
  return <Gauge className="h-4 w-4" />;
}
