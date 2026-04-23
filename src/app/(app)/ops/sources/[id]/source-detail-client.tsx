"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Globe, Rss, CheckCircle2, XCircle, Clock, ExternalLink,
  Zap, Activity, Users, Package, FileText, History, RefreshCw, Loader2,
} from "lucide-react";
import {
  SOURCE_TYPE_LABELS, SOURCE_STATUS_LABELS, VERIFICATION_STATUS_LABELS, INGESTION_METHOD_LABELS,
} from "@/lib/sources/types";
import type { SourceType, SourceStatus, SourceVerificationStatus, SourceIngestionMethod } from "@prisma/client";

interface Source {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sourceType: SourceType;
  ingestionMethod: SourceIngestionMethod;
  platform: string | null;
  canonicalUrl: string | null;
  feedUrl: string | null;
  baseUrl: string | null;
  language: string;
  country: string;
  province: string | null;
  region: string | null;
  municipality: string | null;
  credibilityScore: number;
  priorityScore: number;
  verificationStatus: SourceVerificationStatus;
  sourceStatus: SourceStatus;
  pollingCadenceMinutes: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  errorCount: number;
  isActive: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
  notesInternal: string | null;
  createdAt: string;
  updatedAt: string;
  endpoints: { id: string; endpointType: string; url: string; isPrimary: boolean; lastStatus: number | null }[];
  healthChecks: {
    id: string;
    checkedAt: string;
    httpStatus: number | null;
    latencyMs: number | null;
    isReachable: boolean;
    isFeedValid: boolean;
    itemsFound: number;
    itemsNew: number;
    errorMessage: string | null;
  }[];
  items: {
    id: string;
    title: string | null;
    canonicalItemUrl: string;
    publishedAt: string | null;
    discoveredAt: string;
    processingStatus: string;
  }[];
  _count: { activations: number; items: number };
}

interface TenantUsing {
  campaign: { id: string; name: string; slug: string };
  status: string;
}

type Tab = "overview" | "health" | "items" | "tenants" | "audit";

const STATUS_COLORS: Record<SourceStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  broken: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
  restricted: "bg-purple-100 text-purple-700",
};

export default function SourceDetailClient({ id }: { id: string }) {
  const [source, setSource] = useState<Source | null>(null);
  const [tenantsUsing, setTenantsUsing] = useState<TenantUsing[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{
    foundFeeds: { url: string; type: string; title?: string }[];
    foundSitemap: string | null;
    notes: string[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/sources/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setSource(d.source ?? null);
        setTenantsUsing(d.tenantsUsing ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      await fetch(`/api/sources/${id}/validate`, { method: "POST" });
      const d = await (await fetch(`/api/sources/${id}`)).json();
      setSource(d.source ?? null);
    } finally {
      setValidating(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveryResult(null);
    try {
      const res = await fetch(`/api/sources/${id}/discover`, { method: "POST" });
      const d = await res.json();
      setDiscoveryResult(d.result ?? null);
    } finally {
      setDiscovering(false);
    }
  };

  const handleStatusChange = async (newStatus: SourceStatus) => {
    if (!source) return;
    await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceStatus: newStatus }),
    });
    setSource((s) => s ? { ...s, sourceStatus: newStatus } : s);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        Source not found.
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Globe },
    { id: "health", label: `Health (${source.healthChecks.length})`, icon: Activity },
    { id: "items", label: `Items (${source._count.items})`, icon: FileText },
    { id: "tenants", label: `Campaigns (${tenantsUsing.length})`, icon: Users },
    { id: "audit", label: "Audit Log", icon: History },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <a
          href="/ops/sources"
          className="mt-1 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </a>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#0A2342]">{source.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[source.sourceStatus]}`}>
              {SOURCE_STATUS_LABELS[source.sourceStatus]}
            </span>
            {source.isRecommended && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">★ Recommended</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {SOURCE_TYPE_LABELS[source.sourceType]} · {source.municipality ?? source.province ?? source.country}
            {source.feedUrl && (
              <a
                href={source.feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-blue-500 hover:underline"
              >
                {source.feedUrl.slice(0, 60)}{source.feedUrl.length > 60 ? "…" : ""}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Validate
          </button>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
            Discover Feeds
          </button>
        </div>
      </div>

      {/* Discovery result banner */}
      {discoveryResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-blue-800 mb-2">Feed Discovery Results</p>
          {discoveryResult.foundFeeds.length > 0 ? (
            <ul className="space-y-1">
              {discoveryResult.foundFeeds.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-blue-700">
                  <Rss className="w-3 h-3" />
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.url}</a>
                  <span className="text-xs text-blue-500">({f.type}{f.title ? ` · ${f.title}` : ""})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-blue-700">No RSS/Atom feeds found automatically.</p>
          )}
          {discoveryResult.notes.map((n, i) => (
            <p key={i} className="text-blue-600 text-xs mt-1">{n}</p>
          ))}
        </div>
      )}

      {/* Status actions */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">Change status:</span>
        {(["draft", "active", "paused", "restricted", "archived"] as SourceStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={source.sourceStatus === s}
            className={`px-3 py-1 rounded text-xs font-medium border transition-all disabled:opacity-40 ${
              source.sourceStatus === s ? "border-[#0A2342] text-[#0A2342] bg-blue-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {SOURCE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0">
          {tabs.map((t) => (
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

      {/* Tab content */}
      <div>
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Source Details</h3>
              {[
                ["Type", SOURCE_TYPE_LABELS[source.sourceType]],
                ["Ingestion", INGESTION_METHOD_LABELS[source.ingestionMethod]],
                ["Verification", VERIFICATION_STATUS_LABELS[source.verificationStatus]],
                ["Language", source.language],
                ["Country", source.country],
                ["Province", source.province ?? "—"],
                ["Region", source.region ?? "—"],
                ["Municipality", source.municipality ?? "—"],
                ["Credibility", `${source.credibilityScore}/10`],
                ["Priority", `${source.priorityScore}/100`],
                ["Poll cadence", `Every ${source.pollingCadenceMinutes} min`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Health Summary</h3>
              {[
                ["Last checked", source.lastCheckedAt ? new Date(source.lastCheckedAt).toLocaleString("en-CA") : "Never"],
                ["Last success", source.lastSuccessAt ? new Date(source.lastSuccessAt).toLocaleString("en-CA") : "Never"],
                ["Last error", source.lastErrorAt ? new Date(source.lastErrorAt).toLocaleString("en-CA") : "None"],
                ["Error count", String(source.errorCount)],
                ["Campaigns using", String(source._count.activations)],
                ["Items ingested", String(source._count.items)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
              {source.notesInternal && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Internal Notes</p>
                  <p className="text-xs text-gray-700">{source.notesInternal}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "health" && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {source.healthChecks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No health checks yet. Click Validate to run one.</td>
                  </tr>
                ) : source.healthChecks.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2 text-xs text-gray-600">{new Date(h.checkedAt).toLocaleString("en-CA")}</td>
                    <td className="px-4 py-2">
                      {h.isReachable
                        ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                        : <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">{h.httpStatus ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{h.latencyMs != null ? `${h.latencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2 text-xs">{h.itemsFound} found / {h.itemsNew} new</td>
                    <td className="px-4 py-2 text-xs text-red-500 truncate max-w-xs">{h.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "items" && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discovered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {source.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No items ingested yet.</td>
                  </tr>
                ) : source.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <a
                        href={item.canonicalItemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0A2342] hover:underline text-sm"
                      >
                        {item.title ?? item.canonicalItemUrl.slice(0, 60)}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-CA") : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(item.discoveredAt).toLocaleDateString("en-CA")}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.processingStatus === "processed" ? "bg-green-100 text-green-700" :
                        item.processingStatus === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {item.processingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "tenants" && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {tenantsUsing.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No campaigns are actively using this source.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenantsUsing.map((t) => (
                    <tr key={t.campaign.id}>
                      <td className="px-4 py-3 font-medium text-[#0A2342]">{t.campaign.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "audit" && (
          <AuditLogTab sourceId={id} />
        )}
      </div>
    </div>
  );
}

function AuditLogTab({ sourceId }: { sourceId: string }) {
  const [logs, setLogs] = useState<{ id: string; action: string; actorId: string | null; notes: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sources/${sourceId}/audit`)
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, [sourceId]);

  if (loading) return <div className="py-8 text-center text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {logs.length === 0 ? (
        <div className="px-4 py-12 text-center text-gray-400">No audit history yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-mono text-xs text-gray-700">{l.action}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{l.notes ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString("en-CA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
