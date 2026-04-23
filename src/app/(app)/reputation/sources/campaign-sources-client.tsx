"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Rss, Search, CheckCircle2, XCircle, Zap, Package,
  ToggleLeft, ToggleRight, RefreshCw, Star, Filter, ChevronDown,
  PauseCircle, PlayCircle, Layers, Plus,
} from "lucide-react";
import {
  SOURCE_TYPE_LABELS, ACTIVATION_STATUS_LABELS, PACK_TYPE_LABELS,
} from "@/lib/sources/types";
import type { SourceType, SourceActivationStatus } from "@prisma/client";

interface LibrarySource {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sourceType: SourceType;
  municipality: string | null;
  province: string | null;
  canonicalUrl: string | null;
  feedUrl: string | null;
  isRecommended: boolean;
  isFeatured: boolean;
  credibilityScore: number;
  lastSuccessAt: string | null;
  activationStatus: SourceActivationStatus | null;
  isActive: boolean;
}

interface ActiveSource {
  id: string;
  status: SourceActivationStatus;
  dailyDigestEnabled: boolean;
  realTimeAlertsEnabled: boolean;
  mentionTrackingEnabled: boolean;
  source: {
    id: string;
    name: string;
    slug: string;
    sourceType: SourceType;
    municipality: string | null;
    canonicalUrl: string | null;
    lastSuccessAt: string | null;
  };
}

interface Pack {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  packType: string;
  municipality: string | null;
  isRecommended: boolean;
  _count: { items: number };
}

type MainTab = "library" | "active" | "packs";

const ACTIVATION_STATUS_COLORS: Record<SourceActivationStatus, string> = {
  active: "text-green-600",
  paused: "text-amber-600",
  muted: "text-gray-400",
  disabled: "text-gray-400",
  error: "text-red-600",
  pending_approval: "text-blue-600",
};

export default function CampaignSourcesClient({ campaignId }: { campaignId: string | null }) {
  const [tab, setTab] = useState<MainTab>("library");
  const [libSources, setLibSources] = useState<LibrarySource[]>([]);
  const [activeSources, setActiveSources] = useState<ActiveSource[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  const loadLibrary = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("campaignId", campaignId);
      if (search) p.set("search", search);
      if (filterType) p.set("sourceType", filterType);
      if (filterRecommended) p.set("isRecommended", "true");
      p.set("page", String(page));
      p.set("limit", String(limit));
      const res = await fetch(`/api/campaign/sources?${p}`);
      const d = await res.json();
      setLibSources(d.sources ?? []);
      setLibTotal(d.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [campaignId, search, filterType, filterRecommended, page]);

  const loadActive = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    const res = await fetch(`/api/campaign/sources?campaignId=${campaignId}&view=active`);
    const d = await res.json();
    setActiveSources(d.activations ?? []);
    setLoading(false);
  }, [campaignId]);

  const loadPacks = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    const p = new URLSearchParams();
    p.set("campaignId", campaignId);
    p.set("view", "available");
    const res = await fetch(`/api/campaign/packs?${p}`);
    const d = await res.json();
    setPacks(d.packs ?? []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    if (tab === "library") loadLibrary();
    else if (tab === "active") loadActive();
    else if (tab === "packs") loadPacks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, filterType, filterRecommended, page]);

  const handleToggleSource = async (sourceId: string, currentlyActive: boolean) => {
    if (!campaignId) return;
    if (currentlyActive) {
      // Disable
      await fetch(`/api/campaign/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", campaignId }),
      });
    } else {
      // Activate
      await fetch("/api/campaign/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, sourceId }),
      });
    }
    loadLibrary();
  };

  const handleActivatePack = async (packId: string) => {
    if (!campaignId) return;
    const res = await fetch("/api/campaign/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, packId, action: "activate" }),
    });
    const d = await res.json();
    if (res.ok) {
      alert(`Pack activated — ${d.sourcesActivated} sources added to your monitoring.`);
      loadPacks();
    }
  };

  const handleToggleActivation = async (sourceId: string, action: "enable" | "pause" | "disable") => {
    if (!campaignId) return;
    await fetch(`/api/campaign/sources/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, campaignId }),
    });
    loadActive();
  };

  const totalPages = Math.ceil(libTotal / limit);

  if (!campaignId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        No active campaign. Select a campaign first.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A2342]">Source Activations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse and activate intelligence sources for your campaign monitoring.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0">
          {([
            { id: "library" as MainTab, label: "Available Sources", icon: Globe },
            { id: "active" as MainTab, label: `My Active Sources (${activeSources.length})`, icon: Zap },
            { id: "packs" as MainTab, label: "Source Packs", icon: Layers },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#0A2342] text-[#0A2342]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Search sources…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              {(Object.entries(SOURCE_TYPE_LABELS) as [SourceType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={() => { setFilterRecommended((r) => !r); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
                filterRecommended ? "bg-[#0A2342] text-white border-[#0A2342]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Star className="w-4 h-4" />
              Recommended
            </button>
          </div>

          {/* Source cards */}
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading sources…
            </div>
          ) : libSources.length === 0 ? (
            <div className="py-12 text-center">
              <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No sources available yet</p>
              <p className="text-gray-400 text-xs mt-1">Poll City is building out the source library. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {libSources.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                    s.isActive ? "border-[#1D9E75]/30 bg-green-50/30" : "border-gray-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#0A2342] text-sm">{s.name}</span>
                      {s.isRecommended && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">★ Recommended</span>
                      )}
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {s.municipality ? `${s.municipality} · ` : ""}{s.description ?? s.canonicalUrl ?? s.feedUrl ?? ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {s.lastSuccessAt && (
                      <span className="text-xs text-gray-400">
                        Last update: {new Date(s.lastSuccessAt).toLocaleDateString("en-CA")}
                      </span>
                    )}
                    {s.isActive ? (
                      <div className="flex items-center gap-1 text-[#1D9E75] text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Active
                      </div>
                    ) : null}
                    <button
                      onClick={() => handleToggleSource(s.id, s.isActive)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        s.isActive
                          ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
                          : "bg-[#0A2342] text-white hover:bg-[#0A2342]/90"
                      }`}
                    >
                      {s.isActive ? (
                        <><XCircle className="w-3.5 h-3.5" /> Turn Off</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5" /> Turn On</>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{libTotal} sources</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active sources tab */}
      {tab === "active" && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading…
            </div>
          ) : activeSources.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No sources active yet</p>
              <p className="text-gray-400 text-xs mt-1">Go to Available Sources or Source Packs to start monitoring.</p>
              <button
                onClick={() => setTab("library")}
                className="mt-3 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm"
              >
                Browse Sources
              </button>
            </div>
          ) : (
            activeSources.map((a) => (
              <motion.div
                key={a.id}
                layout
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0A2342] text-sm">{a.source.name}</span>
                    <span className={`text-xs font-medium ${ACTIVATION_STATUS_COLORS[a.status]}`}>
                      {ACTIVATION_STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {SOURCE_TYPE_LABELS[a.source.sourceType]}
                    {a.source.municipality ? ` · ${a.source.municipality}` : ""}
                  </p>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    {a.mentionTrackingEnabled && <span>Mentions</span>}
                    {a.dailyDigestEnabled && <span>Daily Digest</span>}
                    {a.realTimeAlertsEnabled && <span>Real-Time Alerts</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {a.status === "active" ? (
                    <button
                      onClick={() => handleToggleActivation(a.source.id, "pause")}
                      className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleActivation(a.source.id, "enable")}
                      className="flex items-center gap-1 px-2.5 py-1.5 border border-green-200 rounded-lg text-xs text-green-700 hover:bg-green-50"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActivation(a.source.id, "disable")}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-red-100 rounded-lg text-xs text-red-500 hover:bg-red-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Packs tab */}
      {tab === "packs" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Source Packs</strong> are curated bundles of monitoring sources for specific municipalities, offices, or topics.
            Activating a pack turns on all included sources at once.
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading packs…
            </div>
          ) : packs.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No packs available yet</p>
              <p className="text-gray-400 text-xs mt-1">Poll City is building out source packs for Ontario municipalities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packs.map((pack) => (
                <motion.div
                  key={pack.id}
                  layout
                  className="bg-white border border-gray-100 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#0A2342] text-sm">{pack.name}</h3>
                        {pack.isRecommended && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">★ Recommended</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {PACK_TYPE_LABELS[pack.packType] ?? pack.packType}
                        {pack.municipality ? ` · ${pack.municipality}` : ""}
                        {" · "}{pack._count.items} sources
                      </p>
                    </div>
                  </div>
                  {pack.description && (
                    <p className="text-xs text-gray-600">{pack.description}</p>
                  )}
                  <button
                    onClick={() => handleActivatePack(pack.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm hover:bg-[#0A2342]/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Activate Pack
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
