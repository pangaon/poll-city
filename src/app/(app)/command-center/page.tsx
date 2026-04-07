"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MonitorUp, Radio, RefreshCw, ShieldCheck, Siren, TrendingUp } from "lucide-react";
import { WarRoomMapPanel } from "@/components/gotv/war-room-map";
import { PriorityStrikeList } from "@/components/gotv/war-room-sections";
import {
  buildPrecinctSnapshots,
  MOCK_PRIORITY,
  MOCK_SUMMARY,
  PriorityContact,
  SummaryResponse,
} from "@/components/gotv/war-room-types";

type BriefingResponse = {
  campaign?: {
    name?: string;
    candidateName?: string | null;
    daysToElection?: number | null;
    phase?: string;
  };
  priorities?: Array<{ priority: number; action: string; why: string; link: string }>;
  redFlags?: string[];
};

type HealthResponse = {
  healthScore: number;
  grade: string;
};

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

export default function CommandCenterPage() {
  const [campaignId, setCampaignId] = useState("");
  const [summary, setSummary] = useState<SummaryResponse>(MOCK_SUMMARY);
  const [priority, setPriority] = useState<PriorityContact[]>(MOCK_PRIORITY);
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fallback, setFallback] = useState<string[]>([]);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [wallboardMode, setWallboardMode] = useState(false);
  const [autoScene, setAutoScene] = useState(true);
  const [sceneIndex, setSceneIndex] = useState(0);

  const scenes = ["overview", "map", "actions"] as const;

  const load = async (id: string) => {
    const fallbackReasons: string[] = [];

    const [summaryRes, priorityRes, briefingRes, healthRes] = await Promise.all([
      safeJson<SummaryResponse>(`/api/gotv/summary?campaignId=${id}`),
      safeJson<{ data: PriorityContact[] }>(`/api/gotv/priority-list?campaignId=${id}`),
      safeJson<BriefingResponse>(`/api/briefing/morning?campaignId=${id}`),
      safeJson<HealthResponse>(`/api/briefing/health-score?campaignId=${id}`),
    ]);

    if (summaryRes) setSummary(summaryRes);
    else fallbackReasons.push("GOTV summary fallback");

    if (priorityRes?.data) setPriority(priorityRes.data);
    else fallbackReasons.push("Priority list fallback");

    if (briefingRes) setBriefing(briefingRes);
    else fallbackReasons.push("Morning briefing unavailable");

    if (healthRes) setHealth(healthRes);
    else fallbackReasons.push("Health score unavailable");

    setFallback(fallbackReasons);
  };

  useEffect(() => {
    const id = getCampaignIdFromCookie();
    setCampaignId(id);
    load(id).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!wallboardMode || !autoScene) return;
    const timer = setInterval(() => {
      setSceneIndex((current) => (current + 1) % scenes.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [wallboardMode, autoScene, scenes.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(campaignId);
    setRefreshing(false);
  };

  const precincts = useMemo(() => buildPrecinctSnapshots(summary, priority), [summary, priority]);

  const strike = async (contactId: string) => {
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

  const percent = summary.confirmedSupporters > 0
    ? Math.round((summary.supportersVoted / summary.confirmedSupporters) * 100)
    : 0;

  const activeScene = scenes[sceneIndex] ?? "overview";

  if (loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />;
  }

  return (
    <div className={wallboardMode ? "space-y-3" : "space-y-4"}>
      <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-900 to-cyan-900 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Unified Election Command</p>
            <h1 className={wallboardMode ? "text-3xl font-black md:text-4xl" : "text-2xl font-black md:text-3xl"}>Campaign Command Center</h1>
            <p className="mt-1 text-sm text-slate-200">
              {briefing?.campaign?.name ?? "Campaign"} · {briefing?.campaign?.daysToElection ?? "--"} days to election
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWallboardMode((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${wallboardMode ? "border-cyan-200/80 bg-cyan-300/20 text-cyan-50" : "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"}`}
            >
              <MonitorUp className="h-3.5 w-3.5" />
              {wallboardMode ? "Wallboard On" : "Wallboard Off"}
            </button>
            <button
              type="button"
              onClick={() => setAutoScene((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${autoScene ? "border-violet-200/80 bg-violet-300/20 text-violet-50" : "border-violet-300/40 bg-violet-400/10 text-violet-100"}`}
            >
              <Radio className={`h-3.5 w-3.5 ${autoScene ? "animate-pulse" : ""}`} />
              {autoScene ? "Scene Auto" : "Scene Manual"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Board
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Health" value={health ? `${health.healthScore} (${health.grade})` : "N/A"} icon={<ShieldCheck className="h-4 w-4" />} />
          <Kpi label="Progress" value={`${percent}%`} icon={<TrendingUp className="h-4 w-4" />} />
          <Kpi label="Gap" value={summary.gap.toLocaleString()} icon={<Siren className="h-4 w-4" />} />
          <Kpi label="Voted Today" value={summary.votedToday.toLocaleString()} icon={<Radio className="h-4 w-4" />} />
          <Kpi label="Win Threshold" value={summary.winThreshold.toLocaleString()} icon={<AlertTriangle className="h-4 w-4" />} />
        </div>

        {wallboardMode && (
          <div className="mt-3 rounded-lg border border-cyan-300/30 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
            Active Scene: {activeScene}
          </div>
        )}
      </section>

      {fallback.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          FALLBACK MODE: {fallback.join(" | ")}
        </section>
      )}

      {(activeScene === "overview" || !wallboardMode) && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WarRoomMapPanel precincts={precincts} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Top Priorities</p>
            <div className="space-y-2">
              {(briefing?.priorities ?? []).slice(0, wallboardMode ? 6 : 4).map((priorityItem) => (
                <div key={priorityItem.priority} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-sm font-bold text-slate-900">{priorityItem.priority}. {priorityItem.action}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{priorityItem.why}</p>
                </div>
              ))}
            </div>

            {(briefing?.redFlags?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5">
                <p className="text-xs font-bold uppercase text-red-700">Red Flags</p>
                {briefing?.redFlags?.slice(0, 5).map((flag, i) => (
                  <p key={i} className="mt-1 text-xs text-red-700">• {flag}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {(activeScene === "map" || !wallboardMode) && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <WarRoomMapPanel precincts={precincts} />
        </section>
      )}

      {(activeScene === "actions" || !wallboardMode) && (
        <PriorityStrikeList
          contacts={priority}
          busyContactId={busyContactId}
          onMarkVoted={markVoted}
          onStrikeOff={strike}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/20 bg-black/15 p-3">
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-cyan-100">{icon}{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
