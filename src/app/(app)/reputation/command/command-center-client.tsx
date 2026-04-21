"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bell, Eye, Hash, Plus, RefreshCw,
  Send, TrendingUp, X, Check,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RepAlertSeverity, RepAlertSentiment, RepAlertSourceType } from "@prisma/client";
import { useRouter } from "next/navigation";

/* ── Types ── */
interface Alert {
  id: string; title: string; description: string | null;
  severity: RepAlertSeverity; sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType; sourceName: string | null;
  sourceUrl: string | null; velocityScore: number;
  geography: string | null; detectedAt: string; status: string;
}
interface Keyword { id: string; text: string; createdAt: string; }
interface Props { campaignId: string; }

/* ── Design tokens ── */
const CARD_C = "bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20";
const GREEN  = "#00C853";
const AMBER  = "#EF9F27";
const RED    = "#FF3B30";
const BLUE   = "#2979FF";

/* ── Helpers ── */
function sourceLabel(a: Alert): string {
  if (a.sourceName) return a.sourceName.replace("/X","").trim();
  return a.sourceType === "social_media" ? "Social" :
         a.sourceType === "news"          ? "News"   :
         a.sourceType === "forum"         ? "Reddit" : "Monitor";
}

function signalTab(a: Alert): "critical" | "warning" | "positive" | "info" {
  if (a.severity === "critical") return "critical";
  if (a.sentiment === "positive") return "positive";
  if (a.severity === "high" || (a.severity === "medium" && a.sentiment === "negative")) return "warning";
  return "info";
}

function sentimentScore(a: Alert): number {
  const v = a.velocityScore;
  if (a.sentiment === "negative") return -Math.round(30 + v * 8);
  if (a.sentiment === "positive") return  Math.round(50 + v * 6);
  if (a.sentiment === "mixed")    return -Math.round(v * 5);
  return Math.round(v * 2);
}

function reach(a: Alert): number { return Math.round(a.velocityScore * 180 + 40); }

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 120)   return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function atlasScore(alerts: Alert[]): number {
  const crit = alerts.filter((a) => a.severity === "critical" && a.status !== "dismissed").length;
  const neg  = alerts.filter((a) => a.sentiment === "negative" && a.status !== "dismissed").length;
  const pos  = alerts.filter((a) => a.sentiment === "positive").length;
  return Math.max(0, Math.min(100, Math.round(72 - crit * 15 - neg * 3 + pos * 4)));
}

function buildChartData(alerts: Alert[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
  return days.map((day) => {
    const label = day.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    const da = alerts.filter((a) => {
      const ad = new Date(a.detectedAt);
      return ad.getDate() === day.getDate() && ad.getMonth() === day.getMonth();
    });
    const pos = da.filter((a) => a.sentiment === "positive").length;
    const neg = da.filter((a) => a.sentiment === "negative").length;
    const score = Math.max(40, Math.min(100, 60 + (pos - neg) * 7));
    return { date: label, score };
  });
}

/* ── Tab config ── */
const TABS = [
  { id: "all", label: "ALL" },
  { id: "critical", label: "CRITICAL" },
  { id: "warning", label: "WARNING" },
  { id: "positive", label: "POSITIVE" },
  { id: "info", label: "INFO" },
] as const;

const BADGE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(255,59,48,0.15)",   text: RED,   border: "rgba(255,59,48,0.4)"   },
  warning:  { bg: "rgba(239,159,39,0.15)",  text: AMBER, border: "rgba(239,159,39,0.4)"  },
  positive: { bg: "rgba(0,200,83,0.15)",    text: GREEN, border: "rgba(0,200,83,0.4)"    },
  info:     { bg: "rgba(41,121,255,0.15)",  text: BLUE,  border: "rgba(41,121,255,0.4)"  },
};

const LEFT_BAR: Record<string, string> = {
  critical: RED, warning: AMBER, positive: GREEN, info: BLUE,
};

export default function CommandCenterClient({ campaignId }: Props) {
  const router = useRouter();
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [keywords, setKeywords]   = useState<Keyword[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Keyword add/delete state
  const [addKwText, setAddKwText]   = useState("");
  const [addKwOpen, setAddKwOpen]   = useState(false);
  const [addKwSaving, setAddKwSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reputation/alerts?campaignId=${campaignId}&limit=100`);
    if (res.ok) setAlerts((await res.json()).alerts ?? []);
    setLastRefresh(new Date());
    setLoading(false);
  }, [campaignId]);

  const loadKeywords = useCallback(async () => {
    const res = await fetch(`/api/reputation/keywords?campaignId=${campaignId}`);
    if (res.ok) setKeywords((await res.json()).keywords ?? []);
  }, [campaignId]);

  useEffect(() => {
    loadAlerts();
    loadKeywords();
  }, [loadAlerts, loadKeywords]);

  const addKeyword = async () => {
    const text = addKwText.trim();
    if (!text) return;
    setAddKwSaving(true);
    const res = await fetch("/api/reputation/keywords", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, text }),
    });
    if (res.ok) {
      setAddKwText(""); setAddKwOpen(false);
      await loadKeywords();
    }
    setAddKwSaving(false);
  };

  const deleteKeyword = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/reputation/keywords/${id}?campaignId=${campaignId}`, { method: "DELETE" });
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    setDeletingId(null);
  };

  const score      = atlasScore(alerts);
  const critCount  = alerts.filter((a) => a.severity === "critical" && a.status !== "dismissed").length;
  const warnCount  = alerts.filter((a) => (a.severity === "high" || a.severity === "medium") && a.sentiment === "negative").length;
  const posCount   = alerts.filter((a) => a.sentiment === "positive").length;
  const totalReach = alerts.reduce((s, a) => s + reach(a), 0);
  const chartData  = buildChartData(alerts);
  const filtered   = activeTab === "all" ? alerts : alerts.filter((a) => signalTab(a) === activeTab);
  const minsAgo    = Math.round((Date.now() - lastRefresh.getTime()) / 60000);
  const refreshLabel = minsAgo === 0 ? "just now" : `${minsAgo} min ago`;

  const kpis = [
    { label: "ATLAS SCORE",      value: score,                           color: GREEN },
    { label: "CRITICAL ALERTS",  value: critCount,                       color: RED   },
    { label: "WARNINGS",         value: warnCount,                       color: AMBER },
    { label: "POSITIVE SIGNALS", value: posCount,                        color: GREEN },
    { label: "TOTAL REACH",      value: totalReach.toLocaleString(),     color: "#F5F7FF" },
  ];

  return (
    <div className="min-h-full bg-[#050A1F] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]">
            Reputation Command
          </h1>
          <p className="mt-1 text-sm text-[#AAB2FF] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: GREEN }} />
            Live monitoring · {new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/reputation/alerts?campaignId=${campaignId}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00E5FF] transition-all">
            <AlertTriangle size={14} /> Alerts
          </button>
          <button onClick={loadAlerts}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00E5FF] transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((c) => (
          <div key={c.label} className={`${CARD_C} p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-15" style={{ backgroundColor: c.color }} />
            <p className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-3">{c.label}</p>
            <p className="text-3xl font-black" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Keywords */}
      <div className="grid grid-cols-3 gap-4">
        {/* Sentiment Chart */}
        <div className={`${CARD_C} col-span-2 p-6`}>
          <p className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-5">
            Atlas Sentiment — Last 7 Days
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#6B72A0", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fill: "#6B72A0", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0F1440", border: `1px solid rgba(41,121,255,0.3)`, borderRadius: 8, color: "#F5F7FF", fontSize: 12 }}
                formatter={(v: unknown) => [v as number, "Atlas Score"]}
              />
              <Area type="monotone" dataKey="score" stroke={GREEN} strokeWidth={2.5} fill="url(#sentGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tracked Keywords */}
        <div className={`${CARD_C} p-5 flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest">Tracked Keywords</p>
            <button onClick={() => setAddKwOpen(true)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#2979FF] hover:text-[#00E5FF] transition-all">
              <Plus size={12} /> Add
            </button>
          </div>

          <AnimatePresence>
            {addKwOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden">
                <div className="flex gap-2">
                  <input
                    value={addKwText} onChange={(e) => setAddKwText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); if (e.key === "Escape") setAddKwOpen(false); }}
                    placeholder="e.g. housing costs"
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-[#050A1F] border border-[#2979FF]/30 rounded-lg text-xs text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/70"
                  />
                  <button onClick={addKeyword} disabled={addKwSaving || !addKwText.trim()}
                    className="p-1.5 rounded-lg bg-[#2979FF] text-white disabled:opacity-40 hover:bg-[#2979FF]/80 transition-all">
                    <Check size={12} />
                  </button>
                  <button onClick={() => { setAddKwOpen(false); setAddKwText(""); }}
                    className="p-1.5 rounded-lg border border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {keywords.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <Hash className="w-8 h-8 text-[#2979FF]/30 mx-auto mb-2" />
              <p className="text-xs text-[#6B72A0]">No keywords tracked yet</p>
              <p className="text-[10px] text-[#6B72A0] mt-1">Add keywords to monitor</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto">
              {keywords.map((kw) => (
                <motion.div key={kw.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center justify-between group">
                  <span className="text-xs text-[#AAB2FF]">
                    #{kw.text}
                  </span>
                  <button onClick={() => deleteKeyword(kw.id)} disabled={deletingId === kw.id}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#FF3B30]/10 text-[#6B72A0] hover:text-[#FF3B30] transition-all disabled:opacity-50">
                    <X size={10} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signal Feed */}
      <div className={CARD_C}>
        {/* Tabs */}
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="px-4 py-2 text-[10px] font-black rounded-t tracking-widest transition-all"
                style={{
                  color: activeTab === t.id ? "#F5F7FF" : "#6B72A0",
                  borderBottom: activeTab === t.id ? `2px solid ${GREEN}` : "2px solid transparent",
                  background: activeTab === t.id ? "rgba(0,200,83,0.08)" : "transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[#6B72A0]">Live · {refreshLabel}</span>
        </div>

        <div className="border-t border-[#2979FF]/10 mt-0" />

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#6B72A0] gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading signals…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-10 h-10 text-[#2979FF]/20 mx-auto mb-3" />
              <p className="text-sm text-[#AAB2FF]">No {activeTab === "all" ? "" : activeTab} signals</p>
              <p className="text-xs text-[#6B72A0] mt-1">Run a news scan to pull live data</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2979FF]/10">
              {filtered.map((a) => {
                const tab   = signalTab(a);
                const badge = BADGE[tab];
                const sc    = sentimentScore(a);
                const r     = reach(a);
                const src   = sourceLabel(a);
                const isCritOrWarn = tab === "critical" || tab === "warning";
                return (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex group"
                    style={{ borderLeft: `3px solid ${LEFT_BAR[tab]}` }}>
                    <div className="flex-1 px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider"
                              style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                              {tab}
                            </span>
                            <span className="text-[10px] font-medium text-[#6B72A0]">{src}</span>
                            <span className="text-[10px] text-[#6B72A0]">{timeAgo(a.detectedAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#AAB2FF]">
                            &ldquo;{a.description || a.title}&rdquo;
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6B72A0]">
                            {a.sourceName && <span>{a.sourceName}</span>}
                            <span>·</span>
                            <span>Reach: {r.toLocaleString()}</span>
                            <span>·</span>
                            <span style={{ color: sc < 0 ? RED : GREEN, fontWeight: 700 }}>
                              Sentiment: {sc > 0 ? "+" : ""}{sc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded border border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] transition-all"
                            onClick={() => a.sourceUrl && window.open(a.sourceUrl, "_blank")}>
                            <Eye className="w-3 h-3" /> View
                          </button>
                          {isCritOrWarn && (
                            <button className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded border transition-all"
                              style={{ borderColor: "rgba(239,159,39,0.4)", color: AMBER, background: "rgba(239,159,39,0.08)" }}
                              onClick={() => router.push(`/reputation/issues?campaignId=${campaignId}`)}>
                              <Send className="w-3 h-3" /> Respond
                            </button>
                          )}
                          <button className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded border transition-all"
                            style={{ borderColor: "rgba(41,121,255,0.3)", color: BLUE, background: "rgba(41,121,255,0.08)" }}
                            onClick={() => {
                              const issue_res = fetch("/api/reputation/issues", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ campaignId, title: a.title, category: "general", severity: a.severity, alertIds: [a.id] }),
                              });
                              issue_res.then((r) => { if (r.ok) r.json().then((d) => router.push(`/reputation/issues/${d.issue.id}?campaignId=${campaignId}`)); });
                            }}>
                            <TrendingUp className="w-3 h-3" /> Issue
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
