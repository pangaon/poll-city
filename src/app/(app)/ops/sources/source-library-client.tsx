"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rss, Globe, Search, Plus, RefreshCw, Filter, CheckCircle2,
  AlertTriangle, XCircle, Clock, BarChart3, ChevronDown,
  ExternalLink, Settings, Archive, Eye, Layers, Zap,
} from "lucide-react";
import { SOURCE_TYPE_LABELS, SOURCE_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/sources/types";
import CreateSourceModal from "./create-source-modal";
import type { SourceType, SourceStatus, SourceVerificationStatus } from "@prisma/client";

interface SourceRow {
  id: string;
  name: string;
  slug: string;
  sourceType: SourceType;
  sourceStatus: SourceStatus;
  verificationStatus: SourceVerificationStatus;
  municipality: string | null;
  province: string | null;
  isRecommended: boolean;
  isFeatured: boolean;
  canonicalUrl: string | null;
  feedUrl: string | null;
  lastSuccessAt: string | null;
  lastCheckedAt: string | null;
  errorCount: number;
  _count: { activations: number; items: number };
  healthChecks: { isReachable: boolean; checkedAt: string }[];
}

interface Stats {
  total: number;
  active: number;
  broken: number;
  unverified: number;
  recommended: number;
}

const STATUS_COLORS: Record<SourceStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  broken: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
  restricted: "bg-purple-100 text-purple-700",
};

const VERIFICATION_COLORS: Record<SourceVerificationStatus, string> = {
  unverified: "text-gray-400",
  verified: "text-green-600",
  needs_review: "text-amber-600",
  rejected: "text-red-600",
};

export default function SourceLibraryClient() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVerification, setFilterVerification] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");

  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filterType) p.set("sourceType", filterType);
      if (filterStatus) p.set("sourceStatus", filterStatus);
      if (filterVerification) p.set("verificationStatus", filterVerification);
      if (filterMunicipality) p.set("municipality", filterMunicipality);
      p.set("page", String(page));
      p.set("limit", String(limit));

      const [srcRes, statsRes] = await Promise.all([
        fetch(`/api/sources?${p}`),
        stats === null ? fetch("/api/sources?stats=true") : Promise.resolve(null),
      ]);

      const srcData = await srcRes.json();
      setSources(srcData.sources ?? []);
      setTotal(srcData.total ?? 0);

      if (statsRes) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterVerification, filterMunicipality, page, stats]);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterType, filterStatus, filterVerification, filterMunicipality, page]);

  const handleValidate = async (sourceId: string) => {
    await fetch(`/api/sources/${sourceId}/validate`, { method: "POST" });
    load();
  };

  const handleArchive = async (sourceId: string) => {
    if (!confirm("Archive this source? It will be hidden from campaigns.")) return;
    await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
    load();
  };

  const latestHealth = (s: SourceRow) => s.healthChecks?.[0] ?? null;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2342]">Master Source Library</h1>
          <p className="text-sm text-gray-500 mt-1">Platform-controlled intelligence source repository</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="/ops/sources/packs"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <Layers className="w-4 h-4" />
            Manage Packs
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm hover:bg-[#0A2342]/90"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Sources", value: stats.total, icon: Globe, color: "text-gray-700" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-600" },
            { label: "Broken", value: stats.broken, icon: XCircle, color: "text-red-600" },
            { label: "Unverified", value: stats.unverified, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Recommended", value: stats.recommended, icon: Zap, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className={`flex items-center gap-2 ${s.color}`}>
                <s.icon className="w-4 h-4" />
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Search name, URL, municipality…"
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

          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {(Object.entries(SOURCE_STATUS_LABELS) as [SourceStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={filterVerification}
            onChange={(e) => { setFilterVerification(e.target.value); setPage(1); }}
          >
            <option value="">All Verification</option>
            {(Object.entries(VERIFICATION_STATUS_LABELS) as [SourceVerificationStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <input
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-40"
            placeholder="Municipality…"
            value={filterMunicipality}
            onChange={(e) => { setFilterMunicipality(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaigns</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Success</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading sources…
                  </td>
                </tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No sources found</p>
                    <p className="text-gray-400 text-xs mt-1">Add your first source to start monitoring.</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm"
                    >
                      Add Source
                    </button>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {sources.map((s) => {
                    const health = latestHealth(s);
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#0A2342]">{s.name}</span>
                              {s.isRecommended && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">★ Rec</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-xs">
                              {s.municipality && `${s.municipality} · `}{s.canonicalUrl ?? s.feedUrl ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[s.sourceStatus]}`}>
                            {SOURCE_STATUS_LABELS[s.sourceStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {health ? (
                            <div className="flex items-center gap-1">
                              {health.isReachable
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                              <span className={`text-xs ${VERIFICATION_COLORS[s.verificationStatus]}`}>
                                {VERIFICATION_STATUS_LABELS[s.verificationStatus]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not checked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                            {s._count.activations}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {s.lastSuccessAt
                            ? new Date(s.lastSuccessAt).toLocaleDateString("en-CA")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/ops/sources/${s.id}`}
                              className="p-1.5 text-gray-400 hover:text-[#0A2342] rounded"
                              title="View detail"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleValidate(s.id)}
                              className="p-1.5 text-gray-400 hover:text-[#1D9E75] rounded"
                              title="Validate source"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            {s.canonicalUrl && (
                              <a
                                href={s.canonicalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                title="Open source"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleArchive(s.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} sources</span>
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

      {/* Create modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSourceModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => { setShowCreateModal(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
