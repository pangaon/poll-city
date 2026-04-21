"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Pause, Play, Trash2, X, Check, ChevronDown,
  Twitter, Radio, Rss, Newspaper, Facebook,
} from "lucide-react";

interface Source {
  id: string;
  name: string;
  url: string | null;
  handle: string | null;
  sourceType: string;
  alertThreshold: string;
  active: boolean;
  alertCount: number;
  lastCheckedAt: string | null;
  createdAt: string;
}

interface Props { campaignId: string; }

const CARD = "bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl";

const SOURCE_TYPE_CONFIG: Record<string, { label: string; Icon: typeof Globe; color: string }> = {
  twitter_handle:  { label: "X / Twitter",    Icon: Twitter,   color: "#1DA1F2" },
  reddit_search:   { label: "Reddit Search",  Icon: Radio,     color: "#FF4500" },
  rss:             { label: "RSS Feed",        Icon: Rss,       color: "#EF9F27" },
  news_keyword:    { label: "News Keyword",    Icon: Newspaper, color: "#2979FF" },
  facebook_group:  { label: "Facebook Group", Icon: Facebook,  color: "#1877F2" },
};

const THRESHOLD_LABELS: Record<string, string> = {
  all:           "All Alerts",
  high_only:     "High Only",
  critical_only: "Critical Only",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export default function ResponsePagesClient({ campaignId }: Props) {
  const [sources, setSources]   = useState<Source[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", url: "", handle: "",
    sourceType: "news_keyword",
    alertThreshold: "all",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reputation/monitored-sources?campaignId=${campaignId}`);
    if (res.ok) setSources((await res.json()).sources ?? []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/reputation/monitored-sources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ name: "", url: "", handle: "", sourceType: "news_keyword", alertThreshold: "all" });
      await load();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/reputation/monitored-sources/${id}?campaignId=${campaignId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSource = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/reputation/monitored-sources/${id}?campaignId=${campaignId}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  const active = sources.filter((s) => s.active).length;
  const total  = sources.length;
  const totalAlerts = sources.reduce((n, s) => n + s.alertCount, 0);

  return (
    <div className="min-h-full bg-[#050A1F] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]">
            Monitored Sources
          </h1>
          <p className="text-[#AAB2FF] text-sm mt-1 flex items-center gap-2">
            <Globe size={14} className="text-[#2979FF]" />
            External channels tracked for mentions &amp; sentiment
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2979FF] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2979FF]/80 transition-all">
          <Plus size={14} /> Add Source
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Monitored Sources", value: total,       color: "#2979FF" },
          { label: "Active",            value: active,      color: "#00C853" },
          { label: "Total Alerts",      value: totalAlerts, color: "#EF9F27" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${CARD} p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-15" style={{ backgroundColor: color }} />
            <p className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-2">{label}</p>
            <p className="text-3xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Source List */}
      <div className={CARD}>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#6B72A0]">
            <span className="text-sm">Loading…</span>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-[#2979FF]/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#AAB2FF]">No monitored sources yet</p>
            <p className="text-xs text-[#6B72A0] mt-1">Add a news source, Reddit search, or social channel to track</p>
            <button onClick={() => setShowAdd(true)}
              className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] hover:text-[#00E5FF] mx-auto transition-all">
              <Plus size={12} /> Add first source
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2979FF]/10">
            {sources.map((s) => {
              const cfg = SOURCE_TYPE_CONFIG[s.sourceType] ?? { label: s.sourceType, Icon: Globe, color: "#AAB2FF" };
              return (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-5 px-6 py-5 hover:bg-[#2979FF]/5 transition-colors group">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-[#2979FF]/20"
                    style={{ background: `${cfg.color}15` }}>
                    <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-[#F5F7FF]">{s.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={s.active
                          ? { background: "rgba(0,200,83,0.15)", color: "#00C853", border: "1px solid rgba(0,200,83,0.3)" }
                          : { background: "rgba(107,114,160,0.15)", color: "#6B72A0", border: "1px solid rgba(107,114,160,0.3)" }}>
                        {s.active ? "Live" : "Paused"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#6B72A0]">
                      {cfg.label}
                      {s.handle && ` · @${s.handle}`}
                      {s.url && ` · ${s.url}`}
                      {" · "}{THRESHOLD_LABELS[s.alertThreshold] ?? s.alertThreshold}
                      {" · Since "}{new Date(s.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </p>
                  </div>

                  {/* Alerts count */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black" style={{ color: s.alertCount > 0 ? "#EF9F27" : "#6B72A0" }}>
                      {s.alertCount}
                    </p>
                    <p className="text-[10px] text-[#6B72A0] uppercase tracking-widest">Alerts</p>
                  </div>

                  {/* Last checked */}
                  {s.lastCheckedAt && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#6B72A0]">{timeAgo(s.lastCheckedAt)}</p>
                      <p className="text-[10px] text-[#6B72A0]">Last checked</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleActive(s.id, s.active)}
                      title={s.active ? "Pause" : "Resume"}
                      className="p-1.5 rounded border border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                      {s.active ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button onClick={() => deleteSource(s.id)} disabled={deletingId === s.id}
                      className="p-1.5 rounded border border-[#FF3B30]/20 text-[#6B72A0] hover:text-[#FF3B30] transition-all disabled:opacity-40">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`${CARD} w-full max-w-lg p-6`}
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-[#F5F7FF] uppercase tracking-wider">Add Monitored Source</h2>
                <button onClick={() => setShowAdd(false)} className="text-[#6B72A0] hover:text-[#AAB2FF] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={addSource} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">Source Type *</label>
                  <div className="relative">
                    <select value={form.sourceType} onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] focus:outline-none focus:border-[#2979FF]/60">
                      {Object.entries(SOURCE_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B72A0] pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">Name / Label *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                    placeholder={form.sourceType === "twitter_handle" ? "e.g. Local Mayor" : form.sourceType === "reddit_search" ? "e.g. Whitby council" : "e.g. Whitby Tribune"} />
                </div>

                {(form.sourceType === "twitter_handle" || form.sourceType === "facebook_group") && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">
                      {form.sourceType === "twitter_handle" ? "X/Twitter Handle" : "Group Username"}
                    </label>
                    <input value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                      placeholder={form.sourceType === "twitter_handle" ? "@handle (without @)" : "group-username"} />
                  </div>
                )}

                {(form.sourceType === "rss" || form.sourceType === "news_keyword") && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">
                      {form.sourceType === "rss" ? "RSS Feed URL" : "Search Keyword / Phrase"}
                    </label>
                    <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] placeholder-[#6B72A0] focus:outline-none focus:border-[#2979FF]/60"
                      placeholder={form.sourceType === "rss" ? "https://example.com/feed.xml" : "e.g. Whitby ward 2 election"} />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[#AAB2FF] uppercase tracking-wider mb-1.5">Alert Threshold</label>
                  <div className="relative">
                    <select value={form.alertThreshold} onChange={(e) => setForm((f) => ({ ...f, alertThreshold: e.target.value }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 bg-[#050A1F] border border-[#2979FF]/20 rounded-lg text-sm text-[#F5F7FF] focus:outline-none focus:border-[#2979FF]/60">
                      <option value="all">All Alerts</option>
                      <option value="high_only">High &amp; Critical Only</option>
                      <option value="critical_only">Critical Only</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B72A0] pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#2979FF]/30 text-[#AAB2FF] rounded-lg hover:text-[#00E5FF] transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2979FF] text-white rounded-lg hover:bg-[#2979FF]/80 disabled:opacity-50 transition-all flex items-center gap-2">
                    {saving ? "Saving…" : <><Check size={12} /> Add Source</>}
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
