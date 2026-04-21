"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Bell, Globe, Hash, MessageSquare,
  Newspaper, Plus, RefreshCw, TrendingUp, Eye, Send,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RepAlertSeverity, RepAlertSentiment, RepAlertSourceType } from "@prisma/client";

/* ── Types ── */
interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: RepAlertSeverity;
  sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType;
  sourceName: string | null;
  sourceUrl: string | null;
  velocityScore: number;
  geography: string | null;
  detectedAt: string;
  status: string;
  metadata: Record<string, unknown> | null;
}

interface Props { campaignId: string; }

/* ── Colour tokens ── */
const BG     = "#06111f";
const CARD   = "#0d1e30";
const BORDER = "rgba(255,255,255,0.08)";
const GREEN  = "#1D9E75";
const AMBER  = "#EF9F27";
const RED    = "#E24B4A";
const INFO   = "#6366f1";

/* ── Derived helpers ── */
function sourceLabel(a: Alert): string {
  if (a.sourceName) return a.sourceName.replace("/X", "").replace(" ", "");
  return a.sourceType === "social_media" ? "Social" :
         a.sourceType === "news"          ? "News"   :
         a.sourceType === "forum"         ? "Reddit" :
         a.sourceType === "blog"          ? "Blog"   : "Monitor";
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

function reach(a: Alert): number {
  return Math.round(a.velocityScore * 180 + 40);
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 120)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)   return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function atlasScore(alerts: Alert[]): number {
  const crit  = alerts.filter((a) => a.severity === "critical" && a.status !== "dismissed").length;
  const neg   = alerts.filter((a) => a.sentiment === "negative" && a.status !== "dismissed").length;
  const pos   = alerts.filter((a) => a.sentiment === "positive").length;
  return Math.max(0, Math.min(100, Math.round(72 - crit * 15 - neg * 3 + pos * 4)));
}

function buildChartData(alerts: Alert[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
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

function buildKeywords(alerts: Alert[]) {
  const counts: Record<string, number> = {};
  alerts.forEach((a) => {
    const q = (a.metadata as Record<string, unknown> | null)?.query as string | undefined;
    const key = q || a.sourceName || a.sourceType;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([kw, count]) => ({
      kw: kw.startsWith("#") ? kw : `#${kw}`,
      count,
      color: count > 15 ? RED : count > 8 ? AMBER : GREEN,
    }));
}

/* ── Tab config ── */
const TABS = [
  { id: "all",      label: "ALL" },
  { id: "critical", label: "CRITICAL" },
  { id: "warning",  label: "WARNING" },
  { id: "positive", label: "POSITIVE" },
  { id: "info",     label: "INFO" },
] as const;

const BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(226,75,74,0.2)",  text: RED,   border: "rgba(226,75,74,0.4)" },
  warning:  { bg: "rgba(239,159,39,0.2)", text: AMBER, border: "rgba(239,159,39,0.4)" },
  positive: { bg: "rgba(29,158,117,0.2)", text: GREEN, border: "rgba(29,158,117,0.4)" },
  info:     { bg: "rgba(99,102,241,0.2)", text: INFO,  border: "rgba(99,102,241,0.4)" },
};

const LEFT_BORDER: Record<string, string> = {
  critical: RED, warning: AMBER, positive: GREEN, info: INFO,
};

export default function CommandCenterClient({ campaignId }: Props) {
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reputation/alerts?campaignId=${campaignId}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const score      = atlasScore(alerts);
  const critCount  = alerts.filter((a) => a.severity === "critical" && a.status !== "dismissed").length;
  const warnCount  = alerts.filter((a) => (a.severity === "high" || a.severity === "medium") && a.sentiment === "negative").length;
  const posCount   = alerts.filter((a) => a.sentiment === "positive").length;
  const totalReach = alerts.reduce((s, a) => s + reach(a), 0);
  const chartData  = buildChartData(alerts);
  const keywords   = buildKeywords(alerts);

  const filtered = activeTab === "all"
    ? alerts
    : alerts.filter((a) => signalTab(a) === activeTab);

  const minsAgo = Math.round((Date.now() - lastRefresh.getTime()) / 60000);
  const refreshLabel = minsAgo === 0 ? "just now" : `${minsAgo} min ago`;

  const kpiCards = [
    { label: "ATLAS SCORE",     value: score,        sub: `↑ +3 pts this week`,          color: GREEN },
    { label: "CRITICAL ALERTS", value: critCount,    sub: null,                           color: RED   },
    { label: "WARNINGS",        value: warnCount,    sub: null,                           color: AMBER },
    { label: "POSITIVE SIGNALS",value: posCount,     sub: null,                           color: GREEN },
    { label: "TOTAL REACH",     value: totalReach.toLocaleString(), sub: "Impressions monitored", color: "white" },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white", fontFamily: "inter, sans-serif" }}>

      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight uppercase">Reputation Command</h1>
          <p className="mt-1 text-sm flex items-center gap-2" style={{ color: "#64748b" }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: GREEN }} />
            Live monitoring · {new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded border"
            style={{ borderColor: BORDER, color: "white", background: "rgba(255,255,255,0.05)" }}>
            <Hash className="w-3.5 h-3.5" /> ADD KEYWORD
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded border"
            style={{ borderColor: BORDER, color: "white", background: "rgba(255,255,255,0.05)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> REFRESH NOW
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="px-8 pb-6 grid grid-cols-5 gap-4">
        {kpiCards.map((c) => (
          <div key={c.label} className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: "#64748b" }}>{c.label}</p>
            <p className="text-4xl font-extrabold" style={{ color: c.color }}>{c.value}</p>
            {c.sub && <p className="text-xs mt-1.5" style={{ color: "#475569" }}>{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Chart + Keywords ── */}
      <div className="px-8 pb-6 grid grid-cols-3 gap-4">

        {/* Sentiment chart */}
        <div className="col-span-2 rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: "#64748b" }}>
            ATLAS SENTIMENT — LAST 7 DAYS
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} ticks={[40, 55, 70, 85, 100]} />
              <Tooltip
                contentStyle={{ background: "#0d1e30", border: `1px solid ${BORDER}`, borderRadius: 8, color: "white", fontSize: 12 }}
                formatter={(v: unknown) => [v as number, "Atlas Score"]}
              />
              <Area type="monotone" dataKey="score" stroke={GREEN} strokeWidth={2.5}
                fill="url(#sentGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tracked Keywords */}
        <div className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: "#64748b" }}>
            TRACKED KEYWORDS
          </p>
          {keywords.length === 0 ? (
            <div className="text-center py-8" style={{ color: "#475569" }}>
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No signals yet</p>
              <p className="text-xs">Run a news scan to populate</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keywords.map((k) => (
                <div key={k.kw} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#cbd5e1" }}>{k.kw}</span>
                  <span className="text-xs font-bold" style={{ color: k.color }}>{k.count} mentions</span>
                </div>
              ))}
            </div>
          )}
          <button className="mt-5 w-full text-xs font-semibold py-2 rounded border"
            style={{ borderColor: BORDER, color: "#64748b", background: "rgba(255,255,255,0.03)" }}>
            + ADD KEYWORD
          </button>
        </div>
      </div>

      {/* ── Signal Feed ── */}
      <div className="px-8 pb-8">
        <div className="rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>

          {/* Feed header / tabs */}
          <div className="px-6 pt-5 pb-0 flex items-center justify-between">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="px-4 py-2 text-xs font-bold rounded-t transition-all"
                  style={{
                    background: activeTab === t.id ? "rgba(255,255,255,0.1)" : "transparent",
                    color: activeTab === t.id ? "white" : "#475569",
                    borderBottom: activeTab === t.id ? `2px solid ${GREEN}` : "2px solid transparent",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs" style={{ color: "#475569" }}>Live · refreshed {refreshLabel}</span>
          </div>

          <div style={{ borderTop: `1px solid ${BORDER}` }} />

          {/* Signals */}
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ color: "#475569" }}>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading signals…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16" style={{ color: "#475569" }}>
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No {activeTab === "all" ? "" : activeTab} signals</p>
                <p className="text-xs mt-1">Run a news scan to pull live data</p>
              </div>
            ) : (
              filtered.map((a) => {
                const tab   = signalTab(a);
                const badge = BADGE_STYLE[tab];
                const score = sentimentScore(a);
                const r     = reach(a);
                const src   = sourceLabel(a);
                const isCritOrWarn = tab === "critical" || tab === "warning";
                return (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex gap-0 group" style={{ borderLeft: `3px solid ${LEFT_BORDER[tab]}` }}>

                    <div className="flex-1 px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Badge row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded uppercase"
                              style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                              {tab}
                            </span>
                            <span className="text-xs font-medium" style={{ color: "#64748b" }}>
                              {src}
                            </span>
                            <span className="text-xs" style={{ color: "#334155" }}>
                              {timeAgo(a.detectedAt)}
                            </span>
                          </div>

                          {/* Quote / title */}
                          <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>
                            &ldquo;{a.description || a.title}&rdquo;
                          </p>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#475569" }}>
                            {a.sourceName && (
                              <span style={{ color: "#64748b" }}>
                                {a.sourceType === "social_media" ? `@${a.sourceName.toLowerCase().replace(/[^a-z]/g,"")}` : a.sourceName}
                              </span>
                            )}
                            <span>·</span>
                            <span>Reach: {r.toLocaleString()}</span>
                            <span>·</span>
                            <span style={{ color: score < 0 ? RED : GREEN, fontWeight: 600 }}>
                              Sentiment: {score > 0 ? "+" : ""}{score}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded"
                            style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}
                            onClick={() => a.sourceUrl && window.open(a.sourceUrl, "_blank")}>
                            <Eye className="w-3 h-3" /> View
                          </button>
                          {isCritOrWarn && (
                            <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded"
                              style={{ background: "rgba(239,159,39,0.15)", color: AMBER, border: `1px solid rgba(239,159,39,0.3)` }}>
                              <Send className="w-3 h-3" /> Respond
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
