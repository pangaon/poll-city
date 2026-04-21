"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bell, CheckCircle2, ChevronDown, Clock,
  ExternalLink, Filter, Globe, Newspaper, MessageSquare,
  Plus, RefreshCw, Search, Shield, Siren, TrendingUp, X, Zap,
} from "lucide-react";
import { Button, FeatureGuide } from "@/components/ui";
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

/* ── Constants ──────────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const SEV: Record<RepAlertSeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "Critical", color: RED,   bg: "bg-red-50",    border: "border-red-200" },
  high:     { label: "High",     color: AMBER,  bg: "bg-amber-50",  border: "border-amber-200" },
  medium:   { label: "Medium",   color: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-200" },
  low:      { label: "Low",      color: GREEN,  bg: "bg-emerald-50", border: "border-emerald-200" },
};

const SENT_ICON: Record<RepAlertSentiment, string> = {
  negative: "😠", neutral: "😐", positive: "😊", mixed: "🔀", unknown: "❓",
};

const SOURCE_ICON: Record<RepAlertSourceType, typeof Newspaper> = {
  social_media: MessageSquare, news: Newspaper, blog: Globe,
  forum: MessageSquare, manual: Plus, internal_monitoring: Shield,
};

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function AlertsDashboardClient({ campaignId }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [sevFilter, setSevFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [sentFilter, setSentFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ created: number; skipped: number; total: number; query: string } | null>(null);

  // New alert form
  const [form, setForm] = useState({
    title: "", description: "", severity: "medium" as RepAlertSeverity,
    sentiment: "unknown" as RepAlertSentiment, sourceType: "manual" as RepAlertSourceType,
    sourceName: "", sourceUrl: "", geography: "", velocityScore: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ campaignId });
    if (sevFilter) qs.set("severity", sevFilter);
    if (statusFilter) qs.set("status", statusFilter);
    if (sentFilter) qs.set("sentiment", sentFilter);
    if (search) qs.set("search", search);

    const [alertsRes, sumRes] = await Promise.all([
      fetch(`/api/reputation/alerts?${qs}`),
      fetch(`/api/reputation/summary?campaignId=${campaignId}`),
    ]);
    if (alertsRes.ok) {
      const data = await alertsRes.json();
      setAlerts(data.alerts);
      setTotal(data.total);
    }
    if (sumRes.ok) setSummary(await sumRes.json());
    setLoading(false);
  }, [campaignId, sevFilter, statusFilter, sentFilter, search]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id: string) => {
    await fetch(`/api/reputation/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: "acknowledged" }),
    });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" } : a));
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/reputation/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: "dismissed" }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const createIssueFromAlert = async (alertId: string, alertTitle: string) => {
    const res = await fetch("/api/reputation/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        title: alertTitle,
        category: "general",
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setShowCreate(false);
    setForm({ title: "", description: "", severity: "medium", sentiment: "unknown", sourceType: "manual", sourceName: "", sourceUrl: "", geography: "", velocityScore: 0 });
    setSubmitting(false);
    await load();
  };

  const runLiveScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/reputation/scan-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, query: scanQuery.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        await load();
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FeatureGuide
        featureKey="reputation-alerts"
        title="Reputation Monitoring"
        description="This dashboard watches the internet for mentions of your name, your opponents, and key campaign issues. You'll be alerted when something needs attention — before it becomes a story."
        bullets={[
          "Alerts surface social media, news articles, and online comments about your campaign",
          "Set up keywords for your name, your opponents, and local issues you're campaigning on",
          "High-priority alerts are flagged for immediate response",
        ]}
      />
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Siren className="w-5 h-5 text-red-500" />
              Reputation Alerts
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Real-time signal detection and triage</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowScan(true); setScanResult(null); }} className="gap-1">
              <Zap className="w-3.5 h-3.5" /> Scan Live News
            </Button>
            <Button variant="outline" size="sm" onClick={load} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1"
              style={{ background: NAVY }}>
              <Plus className="w-3.5 h-3.5" /> New Alert
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/reputation/command?campaignId=${campaignId}`)}
              className="gap-1">
              <Shield className="w-3.5 h-3.5" /> Command Center
            </Button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex gap-6 text-sm">
            {[
              { label: "New Alerts", value: summary.newAlerts, color: AMBER, icon: Bell },
              { label: "Critical", value: summary.criticalAlerts, color: RED, icon: AlertTriangle },
              { label: "Open Issues", value: summary.openIssues, color: NAVY, icon: Shield },
              { label: "Overdue", value: summary.overdueIssues, color: RED, icon: Clock },
              { label: "Escalated", value: summary.escalatedIssues, color: AMBER, icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="font-semibold" style={{ color }}>{value}</span>
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Search alerts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {[
            { label: "Severity", value: sevFilter, setter: setSevFilter, options: [["", "All"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]] },
            { label: "Status", value: statusFilter, setter: setStatusFilter, options: [["", "All"], ["new", "New"], ["acknowledged", "Acknowledged"], ["linked", "Linked"], ["dismissed", "Dismissed"]] },
            { label: "Sentiment", value: sentFilter, setter: setSentFilter, options: [["", "All"], ["negative", "Negative"], ["neutral", "Neutral"], ["positive", "Positive"], ["mixed", "Mixed"]] },
          ].map(({ label, value, setter, options }) => (
            <select key={label} value={value} onChange={(e) => setter(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
              {options.map(([v, l]) => <option key={v} value={v}>{l === "All" ? `${label}: All` : l}</option>)}
            </select>
          ))}
          <span className="text-sm text-gray-400 ml-auto">{total} alert{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Alert list */}
      <div className="px-6 py-4 space-y-2 max-w-5xl mx-auto">
        <AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading alerts…
            </div>
          ) : alerts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No alerts match your filters</p>
              <p className="text-sm mt-1">Try adjusting filters or create a manual alert</p>
            </motion.div>
          ) : (
            alerts.map((alert) => {
              const sev = SEV[alert.severity];
              const SrcIcon = SOURCE_ICON[alert.sourceType];
              const isLinked = alert.issueLinks.length > 0;
              return (
                <motion.div key={alert.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`bg-white rounded-lg border ${sev.border} p-4 flex gap-4`}>
                  {/* Severity dot */}
                  <div className={`w-1.5 rounded-full self-stretch ${alert.severity === "critical" ? "bg-red-500" : alert.severity === "high" ? "bg-amber-500" : alert.severity === "medium" ? "bg-indigo-500" : "bg-emerald-500"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.bg}`}
                            style={{ color: sev.color }}>{sev.label}</span>
                          <span className="text-xs text-gray-400">{SENT_ICON[alert.sentiment]} {alert.sentiment}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <SrcIcon className="w-3 h-3" />
                            {alert.sourceName ?? alert.sourceType.replace("_", " ")}
                          </span>
                          {alert.geography && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Globe className="w-3 h-3" /> {alert.geography}
                            </span>
                          )}
                          {alert.velocityScore > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <TrendingUp className="w-3 h-3" /> {alert.velocityScore.toFixed(1)}
                            </span>
                          )}
                          {isLinked && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              Linked to issue
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mt-1">{alert.title}</h3>
                        {alert.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.detectedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 shrink-0">
                        {alert.status === "new" && (
                          <button onClick={() => acknowledge(alert.id)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
                            Acknowledge
                          </button>
                        )}
                        {!isLinked && (
                          <button onClick={() => createIssueFromAlert(alert.id, alert.title)}
                            className="text-xs px-2.5 py-1 rounded border border-indigo-200 hover:bg-indigo-50 text-indigo-700 transition">
                            Create Issue
                          </button>
                        )}
                        {alert.sourceUrl && (
                          <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-500 transition flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button onClick={() => dismiss(alert.id)}
                          className="text-xs p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
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

      {/* Scan Live News Modal */}
      <AnimatePresence>
        {showScan && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Scan Live News
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Fetches real Canadian news. Leave blank to use the campaign's candidate name.</p>
                </div>
                <button onClick={() => setShowScan(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {scanResult ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      {scanResult.created > 0
                        ? `${scanResult.created} new alert${scanResult.created !== 1 ? "s" : ""} imported`
                        : "No new alerts — already up to date"}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {scanResult.total} articles found · {scanResult.skipped} already in system · scanning for &ldquo;{scanResult.query}&rdquo;
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setScanResult(null)}>Scan Again</Button>
                    <Button size="sm" onClick={() => setShowScan(false)} style={{ background: NAVY }}>Done</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search Term</label>
                    <input
                      value={scanQuery}
                      onChange={(e) => setScanQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") runLiveScan(); }}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      placeholder="e.g. Mayor of Whitby, Maleeha Khan"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowScan(false)}>Cancel</Button>
                    <Button size="sm" disabled={scanning} onClick={runLiveScan}
                      className="gap-1.5" style={{ background: NAVY }}>
                      {scanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning…</> : <><Zap className="w-3.5 h-3.5" /> Scan Now</>}
                    </Button>
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
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Create Manual Alert</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder="e.g. Negative media mention in local paper" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                    placeholder="What happened?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                    <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as RepAlertSeverity }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                      {(["critical","high","medium","low"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sentiment</label>
                    <select value={form.sentiment} onChange={(e) => setForm((f) => ({ ...f, sentiment: e.target.value as RepAlertSentiment }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                      {(["negative","neutral","positive","mixed","unknown"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                    <select value={form.sourceType} onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value as RepAlertSourceType }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                      {(["manual","social_media","news","blog","forum","internal_monitoring"] as const).map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Geography</label>
                    <input value={form.geography} onChange={(e) => setForm((f) => ({ ...f, geography: e.target.value }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none"
                      placeholder="e.g. Ward 3" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={submitting} style={{ background: NAVY }}>
                    {submitting ? "Creating…" : "Create Alert"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
