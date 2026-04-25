"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronRight, Users, ListChecks, Zap, AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScrapeRun {
  id: string; municipality: string; status: string;
  rawCount: number; error: string | null;
  startedAt: string; completedAt: string | null; sourceUrl: string;
}

interface RawCandidate {
  id: string; candidateName: string; office: string;
  ward: string | null; wardNumber: number | null;
  municipality: string; electionYear: number; promoted: boolean;
}

interface Lead {
  id: string; detectedNameRaw: string; canonicalName: string | null;
  officeRaw: string; officeNormalized: string | null;
  jurisdictionRaw: string; wardOrRidingRaw: string | null;
  partyRaw: string | null; sourceType: string;
  detectedAt: string; confidenceScore: number;
  verificationStatus: string; reviewStatus: string; reviewNotes: string | null;
  profile: { id: string; campaignStatus: string } | null;
  _count: { outreachAttempts: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:  "bg-green-100 text-green-800",
    running:    "bg-blue-100 text-blue-800",
    failed:     "bg-red-100 text-red-800",
    pending:    "bg-yellow-100 text-yellow-800",
    verified:   "bg-green-100 text-green-800",
    rejected:   "bg-red-100 text-red-800",
    duplicate:  "bg-gray-100 text-gray-600",
    unreviewed: "bg-gray-100 text-gray-700",
    in_review:  "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{score.toFixed(0)}</span>
    </div>
  );
}

function duration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "runs",       label: "Scrape Runs",      icon: PlayCircle  },
  { id: "candidates", label: "Raw Candidates",   icon: Users       },
  { id: "leads",      label: "Leads Pipeline",   icon: ListChecks  },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Scrape Runs tab ───────────────────────────────────────────────────────────

function RunsTab({ onSelectRun }: { onSelectRun: (run: ScrapeRun) => void }) {
  const [runs, setRuns]       = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/scraper/runs");
      const data = await res.json() as { runs: ScrapeRun[] };
      setRuns(data.runs ?? []);
    } catch { setError("Failed to load runs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadRuns(); }, [loadRuns]);

  async function triggerScrape() {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/scraper/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: "toronto" }),
      });
      const data = await res.json() as { candidatesFound?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scrape failed");
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Scrape History</h3>
          <p className="text-sm text-gray-500 mt-0.5">Toronto CKAN election results. Each run fetches the full candidate list.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRuns} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={triggerScrape}
            disabled={triggering}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0A2342] rounded-lg hover:bg-[#0A2342]/90 disabled:opacity-60"
          >
            {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            {triggering ? "Scraping Toronto…" : "Run Toronto Scrape"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <PlayCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scrape runs yet</p>
          <p className="text-sm mt-1">Run the Toronto scrape to pull election candidates.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Municipality", "Status", "Candidates", "Duration", "Started", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{run.municipality}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-3 text-gray-700">{run.rawCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{duration(run.startedAt, run.completedAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(run.startedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3">
                    {run.status === "completed" && run.rawCount > 0 && (
                      <button
                        onClick={() => onSelectRun(run)}
                        className="flex items-center gap-1 text-xs font-medium text-[#1D9E75] hover:text-[#1D9E75]/80"
                      >
                        View candidates <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {run.error && <span className="text-xs text-red-500 truncate max-w-[200px] block">{run.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Raw Candidates tab ────────────────────────────────────────────────────────

function CandidatesTab({ selectedRun }: { selectedRun: ScrapeRun | null }) {
  const [candidates, setCandidates] = useState<RawCandidate[]>([]);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(false);
  const [promoting, setPromoting]   = useState(false);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [toast, setToast]           = useState<string | null>(null);
  const [officeFilter, setOfficeFilter] = useState("");

  const load = useCallback(async () => {
    if (!selectedRun) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ runId: selectedRun.id, page: String(page), limit: "100" });
      if (officeFilter) params.set("office", officeFilter);
      const res  = await fetch(`/api/ops/scraper/candidates?${params}`);
      const data = await res.json() as { candidates: RawCandidate[]; total: number };
      setCandidates(data.candidates ?? []);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }, [selectedRun, page, officeFilter]);

  useEffect(() => { void load(); }, [load]);

  const unpromoted = candidates.filter(c => !c.promoted);
  const allSelected = unpromoted.length > 0 && unpromoted.every(c => selected.has(c.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(unpromoted.map(c => c.id)));
  }

  async function promoteSelected() {
    if (!selected.size) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/ops/scraper/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json() as { promoted: number; skipped: number };
      setToast(`Promoted ${data.promoted} candidates. ${data.skipped} already existed.`);
      setSelected(new Set());
      void load();
    } catch { setToast("Promotion failed"); }
    finally { setPromoting(false); }
  }

  if (!selectedRun) {
    return (
      <div className="p-6 text-center py-16 text-gray-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No run selected</p>
        <p className="text-sm mt-1">Go to Scrape Runs and click View candidates on a completed run.</p>
      </div>
    );
  }

  const offices = Array.from(new Set(candidates.map(c => c.office))).sort();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">{selectedRun.municipality} — {new Date(selectedRun.startedAt).toLocaleDateString("en-CA")}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} candidates · {candidates.filter(c => c.promoted).length} already promoted</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={promoteSelected}
              disabled={promoting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1D9E75] rounded-lg hover:bg-[#1D9E75]/90 disabled:opacity-60"
            >
              {promoting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Promote {selected.size} to leads
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setToast(null), 3000)}
            className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
          >
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {offices.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setOfficeFilter("")} className={`px-3 py-1 text-xs rounded-full border ${!officeFilter ? "bg-[#0A2342] text-white border-[#0A2342]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            All
          </button>
          {offices.map(o => (
            <button key={o} onClick={() => setOfficeFilter(o === officeFilter ? "" : o)} className={`px-3 py-1 text-xs rounded-full border truncate max-w-[180px] ${officeFilter === o ? "bg-[#0A2342] text-white border-[#0A2342]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {o}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300" />
                </th>
                {["Name", "Office", "Ward", "Year", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {candidates.map(c => (
                <tr key={c.id} className={`transition-colors ${c.promoted ? "opacity-50" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-2.5">
                    {!c.promoted && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => {
                          const next = new Set(selected);
                          next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                          setSelected(next);
                        }}
                        className="rounded border-gray-300"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.candidateName}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{c.office}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{c.ward ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{c.electionYear}</td>
                  <td className="px-4 py-2.5">
                    {c.promoted
                      ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Promoted</span>
                      : <span className="text-xs text-gray-400">Pending</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 100 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Showing {candidates.length} of {total.toLocaleString()}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={candidates.length < 100} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leads Pipeline tab ────────────────────────────────────────────────────────

function LeadsTab() {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [saving, setSaving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (statusFilter) params.set("verificationStatus", statusFilter);
      const res  = await fetch(`/api/ops/leads?${params}`);
      const data = await res.json() as { leads: Lead[]; total: number };
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function updateReview(id: string, field: "reviewStatus" | "verificationStatus", value: string) {
    setSaving(id);
    try {
      await fetch(`/api/ops/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      void load();
    } finally { setSaving(null); }
  }

  const STATUSES = ["", "pending", "verified", "rejected", "duplicate"];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Leads Pipeline</h3>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} candidates promoted from scraper runs</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUSES.map(s => (
          <button key={s || "all"} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1 text-xs rounded-full border ${statusFilter === s ? "bg-[#0A2342] text-white border-[#0A2342]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />)}</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No leads yet</p>
          <p className="text-sm mt-1">Promote raw candidates from the Raw Candidates tab to populate this list.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Candidate", "Office", "Ward / Riding", "Confidence", "Status", "Profile", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.canonicalName ?? lead.detectedNameRaw}</div>
                    <div className="text-xs text-gray-400 capitalize">{lead.jurisdictionRaw}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{lead.officeNormalized ?? lead.officeRaw}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.wardOrRidingRaw ?? "—"}</td>
                  <td className="px-4 py-3"><ScoreBar score={lead.confidenceScore} /></td>
                  <td className="px-4 py-3"><StatusBadge status={lead.verificationStatus} /></td>
                  <td className="px-4 py-3">
                    {lead.profile
                      ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Has profile</span>
                      : <span className="text-xs text-gray-400">No profile</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        disabled={saving === lead.id}
                        onClick={() => updateReview(lead.id, "verificationStatus", "manually_verified")}
                        title="Mark verified"
                        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        disabled={saving === lead.id}
                        onClick={() => updateReview(lead.id, "verificationStatus", "rejected")}
                        title="Mark rejected"
                        className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-40"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        disabled={saving === lead.id}
                        onClick={() => updateReview(lead.id, "reviewStatus", "in_review")}
                        title="Mark in review"
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-40"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Page {page} · {total.toLocaleString()} total</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={leads.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CandidatesOpsClient() {
  const [activeTab, setActiveTab]     = useState<TabId>("runs");
  const [selectedRun, setSelectedRun] = useState<ScrapeRun | null>(null);

  function handleSelectRun(run: ScrapeRun) {
    setSelectedRun(run);
    setActiveTab("candidates");
  }

  return (
    <div className="flex flex-col">
      {/* Sub-tab bar */}
      <div className="bg-white border-b border-gray-100 px-6">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  active ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "candidates" && selectedRun && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#1D9E75]/10 text-[#1D9E75] rounded-full">
                    {selectedRun.municipality}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {activeTab === "runs"       && <RunsTab onSelectRun={handleSelectRun} />}
          {activeTab === "candidates" && <CandidatesTab selectedRun={selectedRun} />}
          {activeTab === "leads"      && <LeadsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
