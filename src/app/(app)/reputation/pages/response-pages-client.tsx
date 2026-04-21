"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, ChevronRight } from "lucide-react";

interface Page {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  publishStatus: string;
  publishedAt: string | null;
  createdAt: string;
  issue: { id: string; title: string } | null;
}

interface Props { campaignId: string; }

const BG     = "#06111f";
const CARD   = "#0d1e30";
const BORDER = "rgba(255,255,255,0.08)";
const GREEN  = "#1D9E75";
const AMBER  = "#EF9F27";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function sourceType(p: Page): string {
  if (p.title.toLowerCase().includes("reddit")) return "Reddit Thread";
  if (p.title.toLowerCase().includes("facebook") || p.title.toLowerCase().includes("fb")) return "Facebook Group";
  if (p.title.toLowerCase().includes("star") || p.title.toLowerCase().includes("cbc") ||
      p.title.toLowerCase().includes("globe") || p.title.toLowerCase().includes("tribune")) return "News Source";
  return "Monitored Source";
}

export default function ResponsePagesClient({ campaignId }: Props) {
  const [pages, setPages]   = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reputation/pages?campaignId=${campaignId}`);
    if (res.ok) setPages(await res.json().then((d: { pages: Page[] }) => d.pages));
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const active  = pages.filter((p) => p.publishStatus === "published").length;
  const total   = pages.length;
  const alerts  = pages.reduce((s, p) => s + (p.issue ? 1 : 0), 0);

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white" }}>
      <div className="px-8 pt-8 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight uppercase">Monitored Pages</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>Sources being tracked for mentions and sentiment</p>
        </div>
        <button className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded border mt-1"
          style={{ borderColor: "rgba(255,255,255,0.3)", color: "white", background: "rgba(255,255,255,0.05)" }}>
          <Plus className="w-3.5 h-3.5" /> ADD PAGE
        </button>
      </div>

      {/* KPI Cards */}
      <div className="px-8 pb-6 grid grid-cols-3 gap-4">
        {[
          { label: "MONITORED PAGES", value: total || 0 },
          { label: "ACTIVE",          value: active || 0 },
          { label: "TOTAL ALERTS",    value: alerts || 0, color: AMBER },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: "#64748b" }}>{c.label}</p>
            <p className="text-4xl font-extrabold" style={{ color: c.color ?? "white" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Page list */}
      <div className="px-8 pb-8">
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {loading ? (
            <div className="flex items-center justify-center py-20" style={{ color: "#475569" }}>
              Loading…
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#475569" }}>
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No monitored pages yet</p>
              <p className="text-xs mt-1">Add a news source, Reddit thread, or social group to track</p>
              <button className="mt-5 flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded border mx-auto"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#94a3b8" }}>
                <Plus className="w-3.5 h-3.5" /> Add first source
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {pages.map((p) => {
                const isLive = p.publishStatus === "published";
                return (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-5 px-6 py-5 hover:bg-white/[0.03] transition cursor-pointer group">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
                      <Globe className="w-4 h-4" style={{ color: "#64748b" }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{p.title}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                          style={isLive
                            ? { background: "rgba(29,158,117,0.2)", color: GREEN, border: `1px solid rgba(29,158,117,0.3)` }
                            : { background: "rgba(100,116,139,0.2)", color: "#64748b", border: `1px solid rgba(100,116,139,0.3)` }}>
                          {isLive ? "LIVE" : "PAUSED"}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        {sourceType(p)} · {p.slug || "—"} · Since {new Date(p.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: p.issue ? AMBER : "#475569" }}>
                        {p.issue ? 1 : 0}
                      </p>
                      <p className="text-xs" style={{ color: "#334155" }}>ALERTS</p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs" style={{ color: "#475569" }}>{timeAgo(p.createdAt)}</p>
                      <p className="text-xs" style={{ color: "#334155" }}>Last activity</p>
                    </div>

                    <ChevronRight className="w-4 h-4 ml-2 opacity-30 group-hover:opacity-70 transition" style={{ color: "#94a3b8" }} />
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
