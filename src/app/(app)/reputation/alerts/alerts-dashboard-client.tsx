"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bell, ExternalLink, Filter, Globe, Newspaper,
  MessageSquare, Plus, RefreshCw, Search, Shield, Siren,
  TrendingUp, X, Zap, ChevronDown,
} from "lucide-react";
import type {
  RepAlertSeverity, RepAlertStatus, RepAlertSentiment, RepAlertSourceType,
} from "@prisma/client";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: RepAlertSeverity;
  status: RepAlertStatus;
  sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType;
  sourceName: string | null;
  sourceUrl: string | null;
  velocityScore: number;
  geography: string | null;
  detectedAt: string;
  createdAt: string;
  issueLinks: { issueId: string }[];
}

interface Summary {
  newAlerts: number;
  criticalAlerts: number;
  openIssues: number;
  overdueIssues: number;
  escalatedIssues: number;
}

interface Props { campaignId: string; }

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const CARD = "bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl";

const SEV: Record<RepAlertSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#FF3B30", bg: "rgba(255,59,48,0.15)"   },
  high:     { label: "High",     color: "#EF9F27", bg: "rgba(239,159,39,0.15)"  },
  medium:   { label: "Medium",   color: "#AAB2FF", bg: "rgba(170,178,255,0.15)" },
  low:      { label: "Low",      color: "#00C853", bg: "rgba(0,200,83,0.15)"    },
};

const SENT_BADGE: Record<RepAlertSentiment, { label: string; color: string }> = {
  negative: { label: "Negative", color: "#FF3B30" },
  neutral:  { label: "Neutral",  color: "#6B72A0" },
  positive: { label: "Positive", color: "#00C853" },
  mixed:    { label: "Mixed",    color: "#EF9F27" },
  unknown:  { label: "Unknown",  color: "#6B72A0" },
};

const SOURCE_ICON: Record<RepAlertSourceType, typeof Newspaper> = {
  social_media: MessageSquare, news: Newspaper, blog: Globe,
  forum: MessageSquare, manual: Plus, internal_monitoring: Shield,
};

const LEFT_BAR: Record<RepAlertSeverity, string> = {
  critical: "#FF3B30", high: "#EF9F27", medium: "#2979FF", low: "#00C853",
};

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function AlertsDashboardClient({ campaignId }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [sevFilter, setSevFilter]       = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [sentFilter, setSentFilter]     = useState<string>("");
  const [search, setSearch]             = useState("");
  const [showCreate, setShowCreate]     = useState(false);
  const [showScan, setShowScan]         = useState(false);
  const [scanQuery, setScanQuery]       = useState("");
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState<{ created: number; skipped: number; total: number; query: string } | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", severity: "medium" as RepAlertSeverity,
    sentiment: "unknown" as RepAlertSentiment, sourceType: "manual" as RepAlertSourceType,
    sourceName: "", sourceUrl: "", geography: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ campaignId });
    if (sevFilter)    qs.set("severity",  sevFilter);
    if (statusFilter) qs.set("status",    statusFilter);
    if (sentFilter)   qs.set("sentiment", sentFilter);
    if (search)       qs.set("search",    search);

    const [alertsRes, sumRes] = await Promise.all([
      fetch(`/api/reputation/alerts?${qs}`),
      fetch(`/api/reputation/summary?campaignId=${campaignId}`),
    ]);
    if (alertsRes.ok) { const d = await alertsRes.json(); setAlerts(d.alerts); setTotal(d.total); }
    if (sumRes.ok) setSummary(await sumRes.json());
    setLoading(false);
  }, [campaignId, sevFilter, statusFilter, sentFilter, search]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id: string) => {
    await fetch(`/api/reputation/alerts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: "acknowledged" }),
    });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" } : a));
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/reputation/alerts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: "dismissed" }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const createIssueFromAlert = async (alertId: string, alertTitle: string) => {
    const res = await fetch("/api/reputation/issues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId, title: alertTitle, category: "general",
        severity: alerts.find((a) => a.id === alertId)?.severity ?? "medium",
        alertIds: [alertId],
      }),
    });
    if (res.ok) {
      const { issue } = await res.json();
      router.push(`/reputation/issues/${issue.id}?campaignId=${campaignId}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/reputation/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setShowCreate(false);
    setForm({ title: "", description: "", severity: "medium", sentiment: "unknown", sourceType: "manual", sourceName: "", sourceUrl: "", geography: "" });
    setSubmitting(false);
    await load();
  };

  const runLiveScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/reputation/scan-news", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, query: scanQuery.trim() || undefined }),
      });
      if (res.ok) { setScanResult(await res.json()); await load(); }
    } finally { setScanning(false); }
  };

  const kpis = summary ? [
    { label: "New Alerts",     value: summary.newAlerts,      color: "#EF9F27" },
    { label: "Critical",       value: summary.criticalAlerts,  color: "#FF3B30" },
    { label: "Open Issues",    value: summary.openIssues,      color: "#2979FF" },
    { label: "Overdue",        value: summary.overdueIssues,   color: "#FF3B30" },
    { label: "Escalated",      value: summary.escalatedIssues, color: "#EF9F27" },
  ] : [];

  return (
    <div className="min-h-full bg-[#050A1F] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]">
            Reputation Alerts
          </h1>
          <p className="text-[#AAB2FF] text-sm mt-1 flex items-center gap-2">
            <Siren size={14} className="text-[#FF3B30]" />
            Real-time signal detection &amp; triage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowScan(true); setScanResult(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EF9F27]/40 text-[#EF9F27] text-xs font-bold uppercase tracking-wider hover:bg-[#EF9F27]/10 transition-all">
            <Zap size={14} /> Scan Live News
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00E5FF] transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2979FF] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2979FF]/80 transition-all">
            <Plus size={14} /> New Alert
          </button>
          <button onClick={() => router.push(`/reputation/command?campaignId=${campaignId}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00E5FF] transition-all">
            <Shield size={14} /> Command
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {kpis.map(({ label, value, color }) => (
            <div key={label} className={`${CARD} p-4 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[40px] opacity-20" style={{ backgroundColor: color }} />
              <div className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-1">{label}</div>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B72A0]" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
              placeholder="Search alerts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {[
            { label: "Severity", value: sevFilter, set: setSevFilter, opts: [["","All Severity"],["critical","Critical"],["high","High"],["medium","Medium"],["low","Low"]] },
            { label: "Status",   value: statusFilter, set: setStatusFilter, opts: [["","All Status"],["new","New"],["acknowledged","Acknowledged"],["linked","Linked"],["dismissed","Dismissed"]] },
            { label: "Sentiment",value: sentFilter, set: setSentFilter, opts: [["","All Sentiment"],["negative","Negative"],["neutral","Neutral"],["positive","Positive"],["mixed","Mixed"]] },
          ].map(({ label, value, set, opts }) => (
            <div key={label} className="relative">
              <select value={value} onChange={(e) => set(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-xs font-bold text-[#AAB2FF] uppercase tracking-wider focus:outline-none focus:border-[#2979FF]/60">
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B72A0] pointer-events-none" />
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2 text-[#6B72A0] text-xs">
            <Filter size={12} />
            <span>{total} alert{total !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        <AnimatePresence>
          {loading ? (
            <div className={`${CARD} p-16 text-center`}>
              <RefreshCw className="w-6 h-6 animate-spin text-[#2979FF] mx-auto mb-2" />
              <p className="text-[#6B72A0] text-sm">Loading alerts…</p>
            </div>
          ) : alerts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`${CARD} p-16 text-center`}>
              <Bell className="w-10 h-10 text-[#2979FF]/30 mx-auto mb-3" />
              <p className="text-[#AAB2FF] font-medium text-sm">No alerts match your filters</p>
              <p className="text-[#6B72A0] text-xs mt-1">Try adjusting filters or run a live news scan</p>
            </motion.div>
          ) : (
            alerts.map((alert) => {
              const sev    = SEV[alert.severity];
              const sent   = SENT_BADGE[alert.sentiment];
              const SrcIcon = SOURCE_ICON[alert.sourceType];
              const isLinked = alert.issueLinks.length > 0;
              return (
                <motion.div key={alert.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl overflow-hidden flex"
                  style={{ borderLeft: `3px solid ${LEFT_BAR[alert.severity]}` }}>

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ color: sev.color, backgroundColor: sev.bg }}>
                            {sev.label}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ color: sent.color, backgroundColor: `${sent.color}22` }}>
                            {sent.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[#6B72A0]">
                            <SrcIcon className="w-3 h-3" />
                            {alert.sourceName ?? alert.sourceType.replace(/_/g, " ")}
                          </span>
                          {alert.geography && (
                            <span className="flex items-center gap-1 text-[10px] text-[#6B72A0]">
                              <Globe className="w-3 h-3" /> {alert.geography}
                            </span>
                          )}
                          {alert.velocityScore > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-[#EF9F27] font-bold">
                              <TrendingUp className="w-3 h-3" /> {alert.velocityScore.toFixed(1)}
                            </span>
                          )}
                          {isLinked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ color: "#2979FF", backgroundColor: "rgba(41,121,255,0.15)" }}>
                              Linked to Issue
                            </span>
                          )}
                          {alert.status === "acknowledged" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ color: "#00C853", backgroundColor: "rgba(0,200,83,0.15)" }}>
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-[#F5F7FF]">{alert.title}</h3>
                        {alert.description && (
                          <p className="text-xs text-[#AAB2FF] mt-0.5 line-clamp-2">{alert.description}</p>
                        )}
                        <p className="text-[10px] text-[#6B72A0] mt-1.5">
                          {new Date(alert.detectedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {alert.status === "new" && (
                          <button onClick={() => acknowledge(alert.id)}
                            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-[#00C853]/40 text-[#00C853] hover:bg-[#00C853]/10 transition-all">
                            Acknowledge
                          </button>
                        )}
                        {!isLinked && (
                          <button onClick={() => createIssueFromAlert(alert.id, alert.title)}
                            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-[#2979FF]/40 text-[#2979FF] hover:bg-[#2979FF]/10 transition-all">
                            Create Issue
                          </button>
                        )}
                        {alert.sourceUrl && (
                          <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded border border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => dismiss(alert.id)}
                          className="p-1.5 rounded hover:bg-[#FF3B30]/10 text-[#6B72A0] hover:text-[#FF3B30] transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Scan Modal */}
      <AnimatePresence>
        {showScan && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`${CARD} w-full max-w-md p-6`}
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[#F5F7FF] uppercase tracking-wider flex items-center gap-2">
                    <Zap size={14} className="text-[#EF9F27]" /> Scan Live News
                  </h2>
                  <p className="text-xs text-[#6B72A0] mt-1">Leave blank to use campaign candidate name</p>
                </div>
                <button onClick={() => setShowScan(false)} className="text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {scanResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#00C853]/30 bg-[#00C853]/5 p-4">
                    <p className="text-sm font-bold text-[#00C853]">
                      {scanResult.created > 0
                        ? `${scanResult.created} new alert${scanResult.created !== 1 ? "s" : ""} imported`
                        : "No new alerts — already up to date"}
                    </p>
                    <p className="text-xs text-[#6B72A0] mt-1">
                      {scanResult.total} articles · {scanResult.skipped} skipped · &ldquo;{scanResult.query}&rdquo;
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setScanResult(null)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#2979FF]/30 text-[#AAB2FF] rounded-lg hover:text-[#00E5FF] transition-all">
                      Scan Again
                    </button>
                    <button onClick={() => setShowScan(false)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2979FF] text-white rounded-lg hover:bg-[#2979FF]/80 transition-all">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    value={scanQuery} onChange={(e) => setScanQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runLiveScan(); }}
                    className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                    placeholder="e.g. Mayor of Whitby, Maleeha Shahid"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowScan(false)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#2979FF]/30 text-[#AAB2FF] rounded-lg hover:text-[#00E5FF] transition-all">
                      Cancel
                    </button>
                    <button disabled={scanning} onClick={runLiveScan}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#EF9F27] text-[#050A1F] rounded-lg hover:bg-[#EF9F27]/80 disabled:opacity-50 transition-all flex items-center gap-2">
                      {scanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning…</> : <><Zap className="w-3.5 h-3.5" /> Scan Now</>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Alert Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`${CARD} w-full max-w-lg p-6`}
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-[#F5F7FF] uppercase tracking-wider">Create Manual Alert</h2>
                <button onClick={() => setShowCreate(false)} className="text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                    placeholder="e.g. Negative mention in local paper" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60 resize-none"
                    placeholder="What happened?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Severity", key: "severity" as const, opts: ["critical","high","medium","low"] },
                    { label: "Sentiment", key: "sentiment" as const, opts: ["negative","neutral","positive","mixed","unknown"] },
                    { label: "Source", key: "sourceType" as const, opts: ["manual","social_media","news","blog","forum","internal_monitoring"] },
                    { label: "Geography", key: "geography" as const, isText: true },
                  ].map(({ label, key, opts, isText }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">{label}</label>
                      {isText ? (
                        <input value={(form as Record<string, string>)[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                          placeholder="e.g. Ward 3" />
                      ) : (
                        <select value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] focus:outline-none focus:border-[#2979FF]/60">
                          {opts!.map((o) => <option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#2979FF]/30 text-[#AAB2FF] rounded-lg hover:text-[#00E5FF] transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2979FF] text-white rounded-lg hover:bg-[#2979FF]/80 disabled:opacity-50 transition-all">
                    {submitting ? "Creating…" : "Create Alert"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
