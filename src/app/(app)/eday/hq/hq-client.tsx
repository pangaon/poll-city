"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  RefreshCw,
  MapPin,
  Trophy,
  Radio,
  Loader2,
  CheckCheck,
  XCircle,
  Camera,
  User,
} from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface HQData {
  campaign: {
    name: string | undefined;
    candidateName: string;
    electionDate: string | null | undefined;
    jurisdiction: string | null | undefined;
  };
  statusCounts: {
    total: number;
    verified: number;
    pending: number;
    scrutineersAssigned: number;
    scrutineersCheckedIn: number;
    pollsWithBothEntries: number;
    pollsWithOneEntry: number;
  };
  candidateTotals: Array<{
    name: string;
    party: string | null;
    votes: number;
    isOurCandidate: boolean;
  }>;
  ourCandidateVotes: number;
  scrutineers: Array<{
    id: string;
    pollingStation: string;
    pollingAddress: string | null;
    municipality: string;
    ward: string | null;
    user: { id: string; name: string | null; email: string };
    candidateSigned: boolean;
    hasSubmitted: boolean;
  }>;
  recentSubmissions: Array<{
    id: string;
    candidateName: string;
    party: string | null;
    votes: number;
    pollingStation: string | null;
    isVerified: boolean;
    ocrAssisted: boolean;
    createdAt: string;
  }>;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

function formatElectionDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pct(a: number, b: number): string {
  if (b === 0) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="rounded-lg p-1.5" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: NAVY }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function HQClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<HQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "scrutineers" | "feed">("results");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/eday/hq?campaignId=${campaignId}`);
        if (!res.ok) throw new Error("Failed to load");
        const { data: d } = (await res.json()) as { data: HQData };
        setData(d);
        setLastUpdated(new Date());
      } catch {
        // keep stale data on error
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  /* ─── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
        <header className="sticky top-0 z-10 px-4 py-3 text-white" style={{ backgroundColor: NAVY }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold">Election Night HQ</p>
            <p className="text-xs text-blue-200">Loading...</p>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Could not load election data</p>
          <button
            onClick={() => load()}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: NAVY }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { campaign, statusCounts, candidateTotals, ourCandidateVotes, scrutineers, recentSubmissions } = data;
  const leadingCandidate = candidateTotals[0];
  const ourIsLeading = leadingCandidate?.isOurCandidate;
  const totalVotesReported = candidateTotals.reduce((s, c) => s + c.votes, 0);

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 px-4 py-3 text-white shadow-md" style={{ backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: GREEN }}
            >
              <Radio className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {campaign.name ?? "Election Night HQ"}
              </p>
              <p className="text-xs text-blue-200 truncate">
                {campaign.jurisdiction
                  ? `${campaign.jurisdiction} · ${formatElectionDate(campaign.electionDate)}`
                  : formatElectionDate(campaign.electionDate)}
              </p>
            </div>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh now"
            className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {lastUpdated ? `Updated ${formatTime(lastUpdated.toISOString())}` : "Refresh"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Victory / Status Banner ─────────────────────────────────────── */}
        {candidateTotals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl text-white px-5 py-4"
            style={{ backgroundColor: ourIsLeading ? GREEN : AMBER }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {ourIsLeading ? "Leading" : "Trailing"}
                </p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  {ourCandidateVotes.toLocaleString()} votes
                </p>
                <p className="text-sm opacity-80 mt-0.5">
                  {campaign.candidateName || "Our candidate"} ·{" "}
                  {totalVotesReported > 0
                    ? `${pct(ourCandidateVotes, totalVotesReported)} of votes reported`
                    : "No verified entries yet"}
                </p>
              </div>
              <Trophy className="h-10 w-10 opacity-60 shrink-0" />
            </div>
          </motion.div>
        )}

        {/* ── Status Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Entries"
            value={statusCounts.total}
            sub="all submissions"
            color={NAVY}
            icon={BarChart3}
          />
          <StatCard
            label="Verified"
            value={statusCounts.verified}
            sub="double-entry confirmed"
            color={GREEN}
            icon={CheckCheck}
          />
          <StatCard
            label="Pending"
            value={statusCounts.pending}
            sub="awaiting 2nd entry"
            color={AMBER}
            icon={Clock}
          />
          <StatCard
            label="Scrutineers In"
            value={`${statusCounts.scrutineersCheckedIn}/${statusCounts.scrutineersAssigned}`}
            sub="submitted at least one result"
            color={statusCounts.scrutineersCheckedIn === statusCounts.scrutineersAssigned && statusCounts.scrutineersAssigned > 0 ? GREEN : AMBER}
            icon={Users}
          />
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(["results", "scrutineers", "feed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "results" ? "Vote Totals" : tab === "scrutineers" ? "Scrutineers" : "Live Feed"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Vote Totals ─────────────────────────────────────────────────── */}
          {activeTab === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-3"
            >
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Candidate Totals
                  </p>
                  <p className="text-xs text-slate-400">Verified entries only</p>
                </div>

                {candidateTotals.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <BarChart3 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No verified results yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Results appear here once two scrutineers submit matching vote counts
                    </p>
                  </div>
                ) : (
                  candidateTotals.map((c, idx) => {
                    const barPct = totalVotesReported > 0 ? (c.votes / totalVotesReported) * 100 : 0;
                    return (
                      <div
                        key={c.name}
                        className={`px-4 py-3 border-b border-slate-50 last:border-0 ${c.isOurCandidate ? "bg-emerald-50" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {idx === 0 && (
                              <Trophy className="h-4 w-4 shrink-0" style={{ color: AMBER }} />
                            )}
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${c.isOurCandidate ? "text-emerald-800" : "text-slate-800"}`}>
                                {c.name}
                                {c.isOurCandidate && (
                                  <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Our candidate
                                  </span>
                                )}
                              </p>
                              {c.party && (
                                <p className="text-xs text-slate-400">{c.party}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold tabular-nums text-slate-900">
                              {c.votes.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400">{pct(c.votes, totalVotesReported)}</p>
                          </div>
                        </div>
                        {/* Vote bar */}
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: c.isOurCandidate ? GREEN : NAVY }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reporting progress */}
              {statusCounts.scrutineersAssigned > 0 && (
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Polls Reporting
                    </p>
                    <p className="text-xs text-slate-500">
                      {statusCounts.scrutineersCheckedIn} of {statusCounts.scrutineersAssigned}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: GREEN }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(statusCounts.scrutineersCheckedIn / statusCounts.scrutineersAssigned) * 100}%`,
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Scrutineers ─────────────────────────────────────────────────── */}
          {activeTab === "scrutineers" && (
            <motion.div
              key="scrutineers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-2"
            >
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Scrutineer Roster
                  </p>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: GREEN }} />
                      Submitted
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" style={{ color: AMBER }} />
                      Pending
                    </span>
                  </div>
                </div>

                {scrutineers.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No scrutineers assigned</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Assign scrutineers from the Field Operations section
                    </p>
                  </div>
                ) : (
                  scrutineers.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0"
                    >
                      <div className="mt-0.5 shrink-0">
                        {s.hasSubmitted ? (
                          <CheckCircle2 className="h-5 w-5" style={{ color: GREEN }} />
                        ) : (
                          <Clock className="h-5 w-5" style={{ color: AMBER }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {s.pollingStation}
                            </p>
                            {s.pollingAddress && (
                              <p className="text-xs text-slate-400 truncate">{s.pollingAddress}</p>
                            )}
                            <p className="text-xs text-slate-400">
                              {s.municipality}{s.ward ? ` · Ward ${s.ward}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-slate-700">
                              {s.user.name ?? s.user.email}
                            </p>
                            <p
                              className={`text-xs font-semibold mt-0.5 ${
                                s.hasSubmitted ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {s.hasSubmitted ? "Submitted" : "Not yet"}
                            </p>
                            {!s.candidateSigned && (
                              <p className="text-xs text-red-500 mt-0.5">Unsigned</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick summary */}
              {scrutineers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color: GREEN }}>
                      {scrutineers.filter((s) => s.hasSubmitted).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Submitted</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color: AMBER }}>
                      {scrutineers.filter((s) => !s.hasSubmitted).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Waiting</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color: RED }}>
                      {scrutineers.filter((s) => !s.candidateSigned).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Unsigned</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Live Feed ───────────────────────────────────────────────────── */}
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: GREEN }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Live Submissions
                  </p>
                  <p className="ml-auto text-xs text-slate-400">Newest first</p>
                </div>

                {recentSubmissions.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Loader2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Waiting for first submission</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Entries appear here as scrutineers submit results from the field
                    </p>
                  </div>
                ) : (
                  recentSubmissions.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0"
                    >
                      <div className="mt-0.5 shrink-0">
                        {r.isVerified ? (
                          <CheckCheck className="h-4 w-4" style={{ color: GREEN }} />
                        ) : (
                          <Clock className="h-4 w-4" style={{ color: AMBER }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {r.candidateName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {r.party && (
                                <span className="text-xs text-slate-400">{r.party}</span>
                              )}
                              {r.pollingStation && (
                                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                  <MapPin className="h-3 w-3" />
                                  {r.pollingStation}
                                </span>
                              )}
                              {r.ocrAssisted && (
                                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                  <Camera className="h-3 w-3" />
                                  OCR
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold tabular-nums text-slate-900">
                              {r.votes.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400">{formatTime(r.createdAt)}</p>
                            <span
                              className={`text-xs font-semibold ${
                                r.isVerified ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {r.isVerified ? "Verified" : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Legend */}
              <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 font-medium mb-2">Status legend</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5" style={{ color: GREEN }} />
                    Verified — two entries matched
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" style={{ color: AMBER }} />
                    Pending — waiting for second entry
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-slate-400" />
                    OCR — scanned from printout
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Refresh note ─────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Auto-refreshes every 30 seconds · {lastUpdated ? `Last updated at ${formatTime(lastUpdated.toISOString())}` : "Loading..."}
        </p>
      </main>
    </div>
  );
}
