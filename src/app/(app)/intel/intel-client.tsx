"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateLead {
  id: string;
  detectedNameRaw: string;
  canonicalName: string | null;
  officeRaw: string;
  officeNormalized: string | null;
  jurisdictionRaw: string;
  wardOrRidingRaw: string | null;
  partyRaw: string | null;
  sourceType: string;
  sourceUrl: string;
  detectedAt: string;
  confidenceScore: number;
  verificationStatus: string;
  reviewStatus: string;
  reviewNotes: string | null;
  dataSource: { name: string; authorityScore: number } | null;
  _count: { newsSignals: number };
}

interface CandidateProfile {
  id: string;
  fullName: string;
  office: string;
  jurisdictionRef: string;
  wardOrRiding: string | null;
  party: string | null;
  website: string | null;
  email: string | null;
  campaignStatus: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  lead: {
    confidenceScore: number;
    verificationStatus: string;
    sourceUrl: string;
    dataSource: { name: string } | null;
  } | null;
  _count: { outreachAttempts: number };
}

interface NewsSignal {
  id: string;
  candidateNameRaw: string;
  officeRaw: string;
  jurisdictionRaw: string;
  confidenceScore: number;
  phraseMatched: string | null;
  signalType: string;
  reviewStatus: string;
  article: { title: string; url: string; publishedAt: string | null; dataSource: { name: string } };
  candidateLead: { id: string; verificationStatus: string } | null;
}

interface DataSource {
  id: string;
  name: string;
  slug: string;
  jurisdictionLevel: string;
  jurisdictionName: string;
  sourceType: string;
  priorityTier: number;
  authorityScore: number;
  candidateDetectionEnabled: boolean;
  isActive: boolean;
  lastCheckedAt: string | null;
  latestCheck?: {
    status: string;
    httpStatus: number | null;
    responseMs: number | null;
    checkedAt: string;
    itemsFound: number;
  } | null;
}

interface OutreachAttempt {
  id: string;
  outreachType: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  candidateProfile: { fullName: string; office: string; jurisdictionRef: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "feed", label: "Live Feed" },
  { id: "candidates", label: "Candidates" },
  { id: "review", label: "Review Queue" },
  { id: "outreach", label: "Outreach" },
  { id: "sources", label: "Sources" },
  { id: "health", label: "Health" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_CHIP: Record<string, { label: string; colour: string }> = {
  auto_verified: { label: "Auto-verified", colour: "bg-green-100 text-green-800" },
  manually_verified: { label: "Verified", colour: "bg-blue-100 text-blue-800" },
  pending: { label: "Pending", colour: "bg-amber-100 text-amber-800" },
  rejected: { label: "Rejected", colour: "bg-red-100 text-red-800" },
  duplicate: { label: "Duplicate", colour: "bg-gray-100 text-gray-600" },
  announced: { label: "Announced", colour: "bg-teal-100 text-teal-800" },
  nominated: { label: "Nominated", colour: "bg-blue-100 text-blue-800" },
  certified: { label: "Certified", colour: "bg-green-100 text-green-800" },
  withdrawn: { label: "Withdrawn", colour: "bg-gray-100 text-gray-600" },
  elected: { label: "Elected", colour: "bg-purple-100 text-purple-800" },
  sent: { label: "Sent", colour: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", colour: "bg-green-100 text-green-800" },
  failed: { label: "Failed", colour: "bg-red-100 text-red-800" },
  converted: { label: "Converted", colour: "bg-purple-100 text-purple-800" },
  healthy: { label: "Healthy", colour: "bg-green-100 text-green-800" },
  degraded: { label: "Degraded", colour: "bg-amber-100 text-amber-800" },
  down: { label: "Down", colour: "bg-red-100 text-red-800" },
  unknown: { label: "Unknown", colour: "bg-gray-100 text-gray-600" },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CHIP[status] ?? { label: status, colour: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.colour}`}>
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const colour = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${colour} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{Math.round(score)}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntelClient() {
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [leads, setLeads] = useState<CandidateLead[]>([]);
  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [healthSummary, setHealthSummary] = useState<{ summary: DataSource[]; counts: Record<string, number> } | null>(null);
  const [outreach, setOutreach] = useState<OutreachAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("unreviewed");
  const [ingestRunning, setIngestRunning] = useState(false);
  const [seedRunning, setSeedRunning] = useState(false);
  const [reviewAction, setReviewAction] = useState<{ leadId: string; action: string } | null>(null);

  const fetchLeads = useCallback(async (verificationStatus?: string, reviewStatus?: string) => {
    const params = new URLSearchParams({ pageSize: "25" });
    if (verificationStatus) params.set("verificationStatus", verificationStatus);
    if (reviewStatus) params.set("reviewStatus", reviewStatus);
    const res = await fetch(`/api/intel/leads?${params}`);
    if (res.ok) {
      const d = await res.json() as { leads: CandidateLead[] };
      setLeads(d.leads);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    const res = await fetch("/api/intel/profiles?pageSize=50");
    if (res.ok) {
      const d = await res.json() as { profiles: CandidateProfile[] };
      setProfiles(d.profiles);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    const res = await fetch("/api/intel/news?view=signals&pageSize=25");
    if (res.ok) {
      const d = await res.json() as { signals: NewsSignal[] };
      setSignals(d.signals);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/intel/sources?pageSize=100");
    if (res.ok) {
      const d = await res.json() as { sources: DataSource[] };
      setSources(d.sources);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    const res = await fetch("/api/intel/health");
    if (res.ok) {
      const d = await res.json() as { summary: DataSource[]; counts: Record<string, number> };
      setHealthSummary(d);
    }
  }, []);

  const fetchOutreach = useCallback(async () => {
    const res = await fetch("/api/intel/outreach?pageSize=25");
    if (res.ok) {
      const d = await res.json() as { attempts: OutreachAttempt[] };
      setOutreach(d.attempts);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const tab = activeTab;
    const p: Promise<void>[] = [];
    if (tab === "feed") { p.push(fetchLeads(), fetchSignals()); }
    else if (tab === "candidates") { p.push(fetchProfiles()); }
    else if (tab === "review") { p.push(fetchLeads(undefined, reviewFilter)); }
    else if (tab === "outreach") { p.push(fetchOutreach()); }
    else if (tab === "sources") { p.push(fetchSources()); }
    else if (tab === "health") { p.push(fetchHealth()); }
    Promise.all(p).finally(() => setLoading(false));
  }, [activeTab, reviewFilter, fetchLeads, fetchProfiles, fetchSignals, fetchSources, fetchHealth, fetchOutreach]);

  async function runIngest() {
    setIngestRunning(true);
    try {
      const res = await fetch("/api/cron/intel-ingest", { method: "POST" });
      const d = await res.json() as Record<string, unknown>;
      alert(`Ingest complete: ${d["articlesIngested"] ?? 0} articles, ${d["signalsDetected"] ?? 0} signals, ${d["leadsCreated"] ?? 0} leads`);
      void fetchLeads();
    } finally {
      setIngestRunning(false);
    }
  }

  async function runSeed() {
    setSeedRunning(true);
    try {
      const res = await fetch("/api/intel/seed", { method: "POST" });
      const d = await res.json() as Record<string, unknown>;
      alert(`Seed complete: ${d["created"] ?? 0} created, ${d["updated"] ?? 0} updated`);
      void fetchSources();
    } finally {
      setSeedRunning(false);
    }
  }

  async function reviewLead(leadId: string, action: string) {
    setReviewAction({ leadId, action });
    try {
      await fetch(`/api/intel/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      void fetchLeads(undefined, reviewFilter);
    } finally {
      setReviewAction(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2342]">Candidate Intelligence Engine</h1>
          <p className="mt-1 text-sm text-gray-500">Platform-level candidate detection, verification, and outreach</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void runSeed()}
            disabled={seedRunning}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {seedRunning ? "Seeding…" : "Seed Sources"}
          </button>
          <button
            onClick={() => void runIngest()}
            disabled={ingestRunning}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a65] disabled:opacity-50"
          >
            {ingestRunning ? "Running…" : "Run Ingest"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#1D9E75] text-[#1D9E75]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      )}

      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── Live Feed ─────────────────────────────────────────────── */}
            {activeTab === "feed" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Recent Leads ({leads.length})</h2>
                  <div className="space-y-2">
                    {leads.length === 0 && <p className="text-sm text-gray-400">No leads yet. Run ingest to detect candidates.</p>}
                    {leads.map((lead) => (
                      <div key={lead.id} className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#0A2342]">{lead.canonicalName ?? lead.detectedNameRaw}</p>
                            <p className="text-sm text-gray-500">{lead.officeNormalized ?? lead.officeRaw} · {lead.jurisdictionRaw}{lead.wardOrRidingRaw ? ` · ${lead.wardOrRidingRaw}` : ""}</p>
                          </div>
                          <StatusChip status={lead.verificationStatus} />
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <ConfidenceBar score={lead.confidenceScore} />
                          <span className="text-xs text-gray-400">{lead.dataSource?.name ?? lead.sourceType}</span>
                          <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs text-blue-500 hover:underline">Source</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">News Signals ({signals.length})</h2>
                  <div className="space-y-2">
                    {signals.length === 0 && <p className="text-sm text-gray-400">No signals detected yet.</p>}
                    {signals.map((sig) => (
                      <div key={sig.id} className="rounded-xl border bg-white p-4 shadow-sm">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{sig.article.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          <span className="font-medium text-[#0A2342]">{sig.candidateNameRaw}</span>
                          {" · "}{sig.officeRaw}{" · "}{sig.jurisdictionRaw}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusChip status={sig.signalType} />
                          <ConfidenceBar score={sig.confidenceScore} />
                          <span className="ml-auto text-xs text-gray-400">{sig.article.dataSource.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ── Candidates ─────────────────────────────────────────────── */}
            {activeTab === "candidates" && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Verified Candidates ({profiles.length})</h2>
                {profiles.length === 0 && <p className="text-sm text-gray-400">No verified candidates yet. Review and verify leads to create profiles.</p>}
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Office</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Jurisdiction</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Outreach</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Detected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-[#0A2342]">{p.fullName}</td>
                          <td className="px-4 py-3 text-gray-600">{p.office}</td>
                          <td className="px-4 py-3 text-gray-600">{p.jurisdictionRef}{p.wardOrRiding ? ` · ${p.wardOrRiding}` : ""}</td>
                          <td className="px-4 py-3"><StatusChip status={p.campaignStatus} /></td>
                          <td className="px-4 py-3 text-gray-500">{p._count.outreachAttempts > 0 ? `${p._count.outreachAttempts} sent` : "—"}</td>
                          <td className="px-4 py-3 text-gray-400">{new Date(p.firstDetectedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Review Queue ──────────────────────────────────────────── */}
            {activeTab === "review" && (
              <div>
                <div className="mb-4 flex gap-2">
                  {(["unreviewed", "in_review", "reviewed"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setReviewFilter(f)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        reviewFilter === f ? "bg-[#0A2342] text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
                      }`}
                    >
                      {f === "unreviewed" ? "Needs Review" : f === "in_review" ? "In Review" : "Reviewed"}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {leads.length === 0 && <p className="text-sm text-gray-400">No leads in this queue.</p>}
                  {leads.map((lead) => (
                    <div key={lead.id} className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#0A2342]">{lead.detectedNameRaw}</p>
                            <StatusChip status={lead.verificationStatus} />
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {lead.officeRaw} · {lead.jurisdictionRaw}{lead.wardOrRidingRaw ? ` · ${lead.wardOrRidingRaw}` : ""}
                          </p>
                          <div className="mt-1 flex items-center gap-3">
                            <ConfidenceBar score={lead.confidenceScore} />
                            <span className="text-xs text-gray-400">{lead.dataSource?.name ?? lead.sourceType}</span>
                            <span className="text-xs text-gray-400">{lead._count.newsSignals} signal{lead._count.newsSignals !== 1 ? "s" : ""}</span>
                          </div>
                          <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-blue-500 hover:underline truncate max-w-xs">
                            {lead.sourceUrl}
                          </a>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => void reviewLead(lead.id, "verify")}
                            disabled={reviewAction?.leadId === lead.id}
                            className="rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#178a65] disabled:opacity-50"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => void reviewLead(lead.id, "set_in_review")}
                            disabled={reviewAction?.leadId === lead.id}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Flag
                          </button>
                          <button
                            onClick={() => void reviewLead(lead.id, "reject")}
                            disabled={reviewAction?.leadId === lead.id}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Outreach ──────────────────────────────────────────────── */}
            {activeTab === "outreach" && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Outreach Attempts ({outreach.length})</h2>
                {outreach.length === 0 && <p className="text-sm text-gray-400">No outreach sent yet.</p>}
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-4 py-3 font-medium text-gray-600">Candidate</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Channel</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {outreach.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-[#0A2342]">{a.candidateProfile?.fullName ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{a.outreachType.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{a.channel}</td>
                          <td className="px-4 py-3"><StatusChip status={a.status} /></td>
                          <td className="px-4 py-3 text-gray-400">{a.sentAt ? new Date(a.sentAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Sources ───────────────────────────────────────────────── */}
            {activeTab === "sources" && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Source Registry ({sources.length})</h2>
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Level</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Authority</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Detection</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Last Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sources.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0A2342]">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.jurisdictionName}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{s.jurisdictionLevel}</td>
                          <td className="px-4 py-3 text-gray-600">{s.sourceType}</td>
                          <td className="px-4 py-3 text-gray-600">{(s.authorityScore * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3">
                            {s.candidateDetectionEnabled
                              ? <span className="text-xs font-medium text-green-700">Active</span>
                              : <span className="text-xs text-gray-400">Off</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Health ────────────────────────────────────────────────── */}
            {activeTab === "health" && healthSummary && (
              <div>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["healthy", "degraded", "down", "unknown"] as const).map((s) => (
                    <div key={s} className="rounded-xl border bg-white p-4 text-center shadow-sm">
                      <p className="text-2xl font-bold text-[#0A2342]">{healthSummary.counts[s] ?? 0}</p>
                      <StatusChip status={s} />
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-600">HTTP</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Response</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Items</th>
                        <th className="px-4 py-3 font-medium text-gray-600">Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {healthSummary.summary.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-[#0A2342]">{s.name}</td>
                          <td className="px-4 py-3">
                            <StatusChip status={s.latestCheck?.status ?? "unknown"} />
                          </td>
                          <td className="px-4 py-3 text-gray-500">{s.latestCheck?.httpStatus ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{s.latestCheck?.responseMs != null ? `${s.latestCheck.responseMs}ms` : "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{s.latestCheck?.itemsFound ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {s.latestCheck?.checkedAt ? new Date(s.latestCheck.checkedAt).toLocaleString() : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
