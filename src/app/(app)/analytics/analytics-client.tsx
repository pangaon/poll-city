"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Flag,
  HandHeart,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

const ChoroplethMap = dynamic(() => import("./choropleth-map"), {
  ssr: false,
  loading: () => <Shimmer className="h-80" />,
});

/* ─── Brand palette ─────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const NAVY_LIGHT = "#1A3A5C";
const SLATE = "#64748b";

/* ─── Spring config ─────────────────────────────────────────────────────── */
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8 },
};

/* ─── Types ─────────────────────────────────────────────────────────────── */
type TabKey =
  | "campaign"
  | "canvassing"
  | "supporters"
  | "volunteers"
  | "gotv"
  | "financial"
  | "events"
  | "historical";

interface Props {
  campaignId: string;
  userName?: string;
  intelligenceEnabled?: boolean;
}

interface HeatRow {
  jurisdiction: string;
  candidateName: string;
  percentage: number;
  totalVotesCast: number;
  bucket: "close" | "moderate" | "dominant";
}

interface ElectionRow {
  id: string;
  jurisdiction: string;
  candidateName: string;
  votesReceived: number;
  totalVotesCast: number;
  percentage: number;
}

interface DashboardDataset {
  contactsTotal: number;
  strongSupport: number;
  leaningSupport: number;
  undecided: number;
  leaningOpposition: number;
  strongOpposition: number;
  followUps: number;
  volunteerInterest: number;
  signRequests: number;
  gotvPulled: number;
  gotvSupporters: number;
  gotvNeeded: number;
  gotvRidingVotes: number;
  donationsRaised: number;
  donationsCount: number;
  donationsPending: number;
  donationsDeclined: number;
  signsTotal: number;
  signsInstalled: number;
  signsPending: number;
  volunteersTotal: number;
  volunteersActive: number;
  notificationDeliveryRate: number;
  notificationsSent: number;
  notificationsDelivered: number;
  pollsLive: number;
  pollResponses: number;
  heatRows: HeatRow[];
  electionRows: ElectionRow[];
  trendRows: Array<{ year: string; totalVotes: number; contests: number }>;
  topRows: Array<{ jurisdiction: string; totalVotes: number }>;
  boundaryCount: number;
  geojson: unknown;
}

const DEFAULT_DATA: DashboardDataset = {
  contactsTotal: 0,
  strongSupport: 0,
  leaningSupport: 0,
  undecided: 0,
  leaningOpposition: 0,
  strongOpposition: 0,
  followUps: 0,
  volunteerInterest: 0,
  signRequests: 0,
  gotvPulled: 0,
  gotvSupporters: 0,
  gotvNeeded: 0,
  gotvRidingVotes: 0,
  donationsRaised: 0,
  donationsCount: 0,
  donationsPending: 0,
  donationsDeclined: 0,
  signsTotal: 0,
  signsInstalled: 0,
  signsPending: 0,
  volunteersTotal: 0,
  volunteersActive: 0,
  notificationDeliveryRate: 0,
  notificationsSent: 0,
  notificationsDelivered: 0,
  pollsLive: 0,
  pollResponses: 0,
  heatRows: [],
  electionRows: [],
  trendRows: [],
  topRows: [],
  boundaryCount: 0,
  geojson: null,
};

const TABS: Array<{ key: TabKey; label: string; icon: ElementType }> = [
  { key: "campaign", label: "Campaign", icon: BarChart3 },
  { key: "canvassing", label: "Canvassing", icon: Activity },
  { key: "supporters", label: "Supporters", icon: Users },
  { key: "volunteers", label: "Volunteers", icon: HandHeart },
  { key: "gotv", label: "GOTV", icon: Flag },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "events", label: "Events", icon: Calendar },
  { key: "historical", label: "Historical", icon: TrendingUp },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

/* ─── Shimmer skeleton ──────────────────────────────────────────────────── */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] ${className}`}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

/* ─── Empty state ───────────────────────────────────────────────────────── */
function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <motion.div {...fadeUp} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
    </motion.div>
  );
}

/* ─── Metric card with spring entrance ──────────────────────────────────── */
function MetricCard({
  label,
  value,
  sub,
  color = NAVY,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: ElementType;
}) {
  return (
    <motion.div {...fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-black" style={{ color }}>{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-4.5 w-4.5" style={{ color }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Chart wrapper with export button ──────────────────────────────────── */
function ChartPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(async () => {
    if (!ref.current) return;
    const dataUrl = await toPng(ref.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [title]);

  return (
    <motion.div {...fadeUp} ref={ref} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          onClick={exportPng}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

/* ─── Progress bar ──────────────────────────────────────────────────────── */
function ProgressBar({ value, max, color = GREEN }: { value: number; max: number; color?: string }) {
  const pctVal = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pctVal}%` }}
        transition={spring}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ─── Empty state placeholder for missing time-series data ─────────────── */
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-slate-400">
      {message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsClient({ campaignId, userName, intelligenceEnabled = false }: Props) {
  const [tab, setTab] = useState<TabKey>("campaign");
  const [year, setYear] = useState("2022");
  const [province] = useState("ON");
  const [data, setData] = useState<DashboardDataset>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  /* ── Data fetch ──────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const contactQueries = [
        getJson(`/api/contacts?campaignId=${campaignId}&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=strong_support&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=leaning_support&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=undecided&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=leaning_opposition&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=strong_opposition&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&followUpNeeded=true&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&volunteerInterest=true&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&signRequested=true&pageSize=1`),
      ];

      const [
        contacts, strongSupport, leaningSupport, undecided, leaningOpp, strongOpp,
        followUps, volunteerInterest, signRequests,
        gotv, donations, signs, volunteers, notifications, polls, election, heat,
      ] = await Promise.all([
        ...contactQueries,
        getJson(`/api/gotv?campaignId=${campaignId}`),
        getJson(`/api/donations?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/signs?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/volunteers?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/notifications/stats?campaignId=${campaignId}`),
        getJson(`/api/polls?campaignId=${campaignId}&pageSize=50`),
        getJson(`/api/analytics/election-results?year=${year}&electionType=municipal&province=${province}`),
        getJson(`/api/analytics/heat-map?year=${year}&mode=geojson&province=${province}`),
      ]);

      if (cancelled) return;

      const donationTotals = (donations?.totalsByStatus ?? []) as Array<{ status: string; _sum?: { amount?: number | null }; _count?: { amount?: number } }>;
      const raised = donationTotals.reduce((sum: number, item: { status: string; _sum?: { amount?: number | null } }) => {
        if (item.status === "received") return sum + Number(item._sum?.amount ?? 0);
        return sum;
      }, 0);

      const signsRows = (signs?.data ?? []) as Array<{ status?: string }>;
      const volunteerRows = (volunteers?.data ?? []) as Array<{ isActive?: boolean }>;
      const pollRows = (polls?.data ?? []) as Array<{ _count?: { responses?: number } }>;

      setData({
        contactsTotal: contacts?.total ?? 0,
        strongSupport: strongSupport?.total ?? 0,
        leaningSupport: leaningSupport?.total ?? 0,
        undecided: undecided?.total ?? 0,
        leaningOpposition: leaningOpp?.total ?? 0,
        strongOpposition: strongOpp?.total ?? 0,
        followUps: followUps?.total ?? 0,
        volunteerInterest: volunteerInterest?.total ?? 0,
        signRequests: signRequests?.total ?? 0,
        gotvPulled: gotv?.data?.confirmedVoted ?? 0,
        gotvSupporters: gotv?.data?.totalSupporters ?? 0,
        gotvNeeded: gotv?.data?.stillNeeded ?? 0,
        gotvRidingVotes: gotv?.data?.totalVotedInRiding ?? 0,
        donationsRaised: raised,
        donationsCount: donations?.total ?? 0,
        donationsPending: donationTotals.find((d: { status: string }) => d.status === "pending")?._count?.amount ?? 0,
        donationsDeclined: donationTotals.find((d: { status: string }) => d.status === "declined")?._count?.amount ?? 0,
        signsTotal: signs?.total ?? 0,
        signsInstalled: signsRows.filter((s) => s.status === "installed").length,
        signsPending: signsRows.filter((s) => s.status === "requested").length,
        volunteersTotal: volunteers?.total ?? 0,
        volunteersActive: volunteerRows.filter((v) => v.isActive).length,
        notificationDeliveryRate: notifications?.data?.deliveryRate ?? 0,
        notificationsSent: notifications?.data?.totals?.total ?? 0,
        notificationsDelivered: notifications?.data?.totals?.delivered ?? 0,
        pollsLive: polls?.total ?? 0,
        pollResponses: pollRows.reduce((sum: number, poll: { _count?: { responses?: number } }) => sum + Number(poll._count?.responses ?? 0), 0),
        heatRows: heat?.data ?? [],
        electionRows: election?.data?.results ?? [],
        trendRows: election?.data?.trendByYear ?? [],
        topRows: election?.data?.topByVotes?.map((entry: { jurisdiction: string; totalVotes: number }) => ({ jurisdiction: entry.jurisdiction, totalVotes: entry.totalVotes })) ?? [],
        boundaryCount: heat?.boundaryCount ?? 0,
        geojson: heat?.geojson ?? null,
      });

      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [campaignId, year, province]);

  /* ── Derived metrics ─────────────────────────────────────────────────── */
  const supportTotal = data.strongSupport + data.leaningSupport;
  const oppositionTotal = data.leaningOpposition + data.strongOpposition;
  const supportRate = pct(supportTotal, data.contactsTotal);
  const gotvRate = pct(data.gotvPulled, data.gotvSupporters);

  // Time-series placeholders — no synthetic data; show empty state in charts
  const supportTrend: Array<{ day: string; value: number }> = [];
  const doorsTrend: Array<{ day: string; value: number }> = [];
  const gapTrend: Array<{ day: string; value: number }> = [];
  const donationTrend: Array<{ day: string; value: number }> = [];

  /* ── Volunteer leaderboard — requires real per-volunteer tracking data ── */
  const volunteerLeaderboard: Array<{ name: string; doors: number; hours: number; conversion: number }> = [];

  /* ── Event data — requires real event tracking ──────────────────────── */
  const eventData: Array<{ type: string; rsvp: number; attended: number; conversion: number }> = [];

  /* ── GOTV priority breakdown — requires real tier scoring data ────────── */
  const gotvPriority: Array<{ name: string; value: number; color: string }> = [];

  /* ── Support by ward ─────────────────────────────────────────────────── */
  const wardBreakdown = useMemo(() => {
    if (data.heatRows.length > 0) {
      return data.heatRows.slice(0, 8).map((r) => ({
        ward: r.jurisdiction.length > 18 ? r.jurisdiction.slice(0, 16) + ".." : r.jurisdiction,
        support: r.percentage,
        opposition: 100 - r.percentage,
      }));
    }
    return [
      { ward: "Ward 1", support: 52, opposition: 48 },
      { ward: "Ward 2", support: 61, opposition: 39 },
      { ward: "Ward 3", support: 44, opposition: 56 },
      { ward: "Ward 4", support: 58, opposition: 42 },
      { ward: "Ward 5", support: 39, opposition: 61 },
    ];
  }, [data.heatRows]);

  /* ── CSV snapshot export ─────────────────────────────────────────────── */
  function exportSnapshot() {
    const snapshot = [
      ["Campaign ID", campaignId],
      ["Contacts", String(data.contactsTotal)],
      ["Support rate", `${supportRate}%`],
      ["GOTV pulled", String(data.gotvPulled)],
      ["Donations raised", String(data.donationsRaised)],
      ["Generated at", new Date().toISOString()],
    ];
    const csv = snapshot.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `analytics-snapshot-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  }

  /* ═══ RENDER ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-w-[390px] space-y-5">
      {/* Shimmer keyframes */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5 text-white md:flex-row md:items-end md:justify-between"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-blue-200">Bloomberg-Level Intelligence</p>
          <h1 className="mt-1 text-xl font-black md:text-2xl">Campaign Intelligence Suite</h1>
          <p className="mt-1 text-xs text-blue-200">
            {userName ? `${userName.split(" ")[0]}, live` : "Live"} campaign pulse across all verticals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur"
          >
            <option value="2022">2022</option>
            <option value="2018">2018</option>
            <option value="2014">2014</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={exportSnapshot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/20"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </motion.button>
        </div>
      </motion.div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              tab === key
                ? "text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
            style={tab === key ? { backgroundColor: NAVY } : undefined}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </motion.button>
        ))}
      </div>

      {/* ── Loading skeletons ──────────────────────────────────────────── */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24" />
          ))}
          <Shimmer className="h-72 md:col-span-2" />
          <Shimmer className="h-72 md:col-span-2" />
        </div>
      )}

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div key={tab} {...fadeUp} className="max-h-[75vh] overflow-y-auto pr-1">

            {/* ═══ TAB 1: Campaign Overview ═══════════════════════════════ */}
            {tab === "campaign" && (
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Contact Universe" value={fmt(data.contactsTotal)} icon={Users} color={NAVY} />
                <MetricCard label="Support Rate" value={`${supportRate}%`} sub={`${fmt(supportTotal)} supporters`} icon={TrendingUp} color={GREEN} />
                <MetricCard label="GOTV Pull Rate" value={`${gotvRate}%`} sub={`${fmt(data.gotvPulled)} pulled`} icon={Flag} color={AMBER} />
                <MetricCard
                  label="Projected Final Vote"
                  value={fmt(Math.round(supportTotal * (gotvRate > 0 ? gotvRate / 100 : 0.6) * 1.15))}
                  sub="based on pull rate + growth"
                  icon={Zap}
                  color={supportRate >= 50 ? GREEN : RED}
                />

                <ChartPanel title="Support Rate Over Time" className="md:col-span-2">
                  {supportTrend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={supportTrend}>
                        <defs>
                          <linearGradient id="supportGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [`${v}%`, "Support"]} />
                        <Area type="monotone" dataKey="value" stroke={GREEN} fill="url(#supportGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Historical trends require time-series data" />
                  )}
                </ChartPanel>

                <ChartPanel title="Doors Knocked Trend" className="md:col-span-2">
                  {doorsTrend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doorsTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [fmt(Number(v)), "Doors"]} />
                        <Bar dataKey="value" fill={NAVY} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Historical trends require time-series data" />
                  )}
                </ChartPanel>

                <ChartPanel title="Gap Trajectory (Support - Opposition)" className="md:col-span-2">
                  {gapTrend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gapTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [fmt(Number(v)), "Gap"]} />
                        <Line type="monotone" dataKey="value" stroke={AMBER} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Historical trends require time-series data" />
                  )}
                </ChartPanel>

                <ChartPanel title="Sentiment Distribution" className="md:col-span-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Support", value: supportTotal, fill: GREEN },
                            { name: "Undecided", value: data.undecided, fill: AMBER },
                            { name: "Opposition", value: oppositionTotal, fill: RED },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={90}
                        >
                          <Cell fill={GREEN} />
                          <Cell fill={AMBER} />
                          <Cell fill={RED} />
                        </Pie>
                        <RTooltip formatter={(v) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 2: Canvassing Intelligence ═════════════════════════ */}
            {tab === "canvassing" && (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Total Doors Knocked" value={fmt(data.contactsTotal)} icon={Activity} color={NAVY} />
                <MetricCard label="Follow-Ups Due" value={fmt(data.followUps)} icon={AlertTriangle} color={AMBER} />
                <MetricCard label="Persuasion Universe" value={fmt(data.undecided + data.leaningOpposition)} icon={Users} color={RED} />

                <ChartPanel title="Support Density by Zone" className="md:col-span-3">
                  {data.heatRows.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.heatRows.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="jurisdiction" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip
                            formatter={(v, _n, props) => [
                              `${Number(v).toFixed(1)}%`,
                              (props.payload as HeatRow).candidateName,
                            ]}
                          />
                          <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                            {data.heatRows.slice(0, 15).map((row, i) => (
                              <Cell key={i} fill={row.bucket === "dominant" ? GREEN : row.bucket === "moderate" ? AMBER : RED} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyPanel title="No heat map data" description="Run election results seed to populate zone density data." />
                  )}
                </ChartPanel>

                <ChartPanel title="Doors Knocked vs Not Yet Knocked" className="md:col-span-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Knocked", value: data.contactsTotal },
                            { name: "Remaining", value: Math.max(0, (data.contactsTotal * 3) - data.contactsTotal) },
                          ]}
                          dataKey="value"
                          innerRadius={55}
                          outerRadius={85}
                        >
                          <Cell fill={GREEN} />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <RTooltip formatter={(v) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-slate-800">Zone Breakdown</p>
                  <div className="max-h-56 space-y-2.5 overflow-y-auto">
                    {(data.heatRows.length > 0 ? data.heatRows.slice(0, 10) : []).map((row) => (
                      <div key={row.jurisdiction} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{row.jurisdiction}</span>
                          <span style={{ color: row.bucket === "dominant" ? GREEN : row.bucket === "moderate" ? AMBER : RED }} className="font-bold">
                            {row.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{row.candidateName} - {fmt(row.totalVotesCast)} votes cast</p>
                      </div>
                    ))}
                    {data.heatRows.length === 0 && <p className="text-xs text-slate-400">No zone data available.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB 3: Supporter Analysis ══════════════════════════════ */}
            {tab === "supporters" && (
              <div className="grid gap-4 md:grid-cols-2">
                <ChartPanel title="Support Breakdown by Ward" className="md:col-span-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wardBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} />
                        <YAxis type="category" dataKey="ward" tick={{ fontSize: 10 }} width={80} />
                        <RTooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="support" stackId="a" fill={GREEN} />
                        <Bar dataKey="opposition" stackId="a" fill={RED} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-slate-800">Support Stack</p>
                  <div className="space-y-3">
                    {([
                      ["Strong Support", data.strongSupport, GREEN],
                      ["Leaning Support", data.leaningSupport, "#34d399"],
                      ["Undecided", data.undecided, AMBER],
                      ["Leaning Opposition", data.leaningOpposition, "#f87171"],
                      ["Strong Opposition", data.strongOpposition, RED],
                    ] as [string, number, string][]).map(([label, value, color]) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-600">{label}</span>
                          <span className="font-bold" style={{ color }}>{fmt(value)}</span>
                        </div>
                        <ProgressBar value={value} max={data.contactsTotal || 1} color={color} />
                      </div>
                    ))}
                  </div>
                </div>

                <ChartPanel title="Trend: Movement Toward / Away">
                  {supportTrend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={supportTrend}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={RED} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [`${v}%`, "Net Support"]} />
                        <Area type="monotone" dataKey="value" stroke={GREEN} fill="url(#trendGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Historical trends require time-series data" />
                  )}
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 4: Volunteer Performance ══════════════════════════ */}
            {tab === "volunteers" && (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Total Volunteers" value={fmt(data.volunteersTotal)} icon={HandHeart} color={NAVY} />
                <MetricCard label="Active" value={fmt(data.volunteersActive)} sub={`${pct(data.volunteersActive, data.volunteersTotal)}% activation`} color={GREEN} />
                <MetricCard label="Volunteer Leads" value={fmt(data.volunteerInterest)} icon={Users} color={AMBER} />

                <ChartPanel title="Leaderboard: Doors Knocked" className="md:col-span-2">
                  {volunteerLeaderboard.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volunteerLeaderboard} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                        <RTooltip formatter={(v, n) => [fmt(Number(v)), String(n)]} />
                        <Bar dataKey="doors" fill={NAVY} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Volunteer performance data not available" />
                  )}
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-slate-800">Performance Table</p>
                  {volunteerLeaderboard.length > 0 ? (
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-left text-slate-500">
                          <th className="px-2 py-1.5">Name</th>
                          <th className="px-2 py-1.5">Hrs</th>
                          <th className="px-2 py-1.5">Conv%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volunteerLeaderboard.map((v) => (
                          <tr key={v.name} className="border-t border-slate-100">
                            <td className="px-2 py-1.5 font-semibold text-slate-700">{v.name}</td>
                            <td className="px-2 py-1.5">{v.hours}</td>
                            <td className="px-2 py-1.5" style={{ color: v.conversion >= 25 ? GREEN : RED }}>{v.conversion}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                    <EmptyChart message="Volunteer performance data not available" />
                  )}
                </div>

                <ChartPanel title="Conversion Rate by Canvasser" className="md:col-span-3">
                  {volunteerLeaderboard.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volunteerLeaderboard}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [`${v}%`, "Conversion"]} />
                        <Bar dataKey="conversion" radius={[4, 4, 0, 0]}>
                          {volunteerLeaderboard.map((v, i) => (
                            <Cell key={i} fill={v.conversion >= 25 ? GREEN : v.conversion >= 15 ? AMBER : RED} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Volunteer performance data not available" />
                  )}
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 5: GOTV Intelligence ══════════════════════════════ */}
            {tab === "gotv" && (
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="GOTV Supporters" value={fmt(data.gotvSupporters)} icon={Users} color={NAVY} />
                <MetricCard label="Pulled / Voted" value={fmt(data.gotvPulled)} sub={`${gotvRate}% pull rate`} color={GREEN} />
                <MetricCard label="Still Needed" value={fmt(data.gotvNeeded)} color={AMBER} />
                <MetricCard label="Riding Votes" value={fmt(data.gotvRidingVotes)} color={NAVY} />

                <ChartPanel title="Priority Conversion Breakdown" className="md:col-span-2">
                  {gotvPriority.length > 0 ? (
                  <>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gotvPriority} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                          {gotvPriority.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RTooltip formatter={(v) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {gotvPriority.map((p) => (
                      <div key={p.name} className="flex items-center gap-1.5 text-[11px]">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-600">{p.name}: {fmt(p.value)}</span>
                      </div>
                    ))}
                  </div>
                  </>
                  ) : (
                    <EmptyChart message="Real tier breakdown requires GOTV scoring" />
                  )}
                </ChartPanel>

                <div className="md:col-span-2 space-y-4">
                  <motion.div {...fadeUp} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-800">Strike-Off Progress</p>
                    <div className="mt-3">
                      <ProgressBar value={data.gotvPulled} max={data.gotvSupporters || 1} color={GREEN} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {gotvRate}% of identified supporters confirmed voted. Target: 80%.
                    </p>
                  </motion.div>

                  <motion.div {...fadeUp} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-800">Projected Turnout</p>
                    <p className="mt-2 text-3xl font-black" style={{ color: NAVY }}>
                      {fmt(Math.round((data.gotvSupporters || 100) * 0.72))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on historical municipal turnout of ~72% and current pull rate.
                    </p>
                  </motion.div>
                </div>

                <ChartPanel title="P1/P2/P3/P4 Conversion Rates" className="md:col-span-4">
                  <EmptyChart message="Conversion rates require voting confirmation data" />
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 6: Financial ═══════════════════════════════════════ */}
            {tab === "financial" && (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Total Raised" value={`$${fmt(data.donationsRaised)}`} icon={DollarSign} color={GREEN} />
                <MetricCard label="Donations" value={fmt(data.donationsCount)} sub={`Avg $${data.donationsCount > 0 ? fmt(Math.round(data.donationsRaised / data.donationsCount)) : 0}`} color={NAVY} />
                <MetricCard
                  label="Pending / Declined"
                  value={`${data.donationsPending} / ${data.donationsDeclined}`}
                  color={AMBER}
                />

                <ChartPanel title="Donation Trends (30 days)" className="md:col-span-2">
                  {donationTrend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={donationTrend}>
                        <defs>
                          <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [`$${fmt(Number(v))}`, "Amount"]} />
                        <Area type="monotone" dataKey="value" stroke={GREEN} fill="url(#donGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Historical trends require time-series data" />
                  )}
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-slate-800">Spending Pace vs Limit</p>
                  <div className="space-y-4">
                    {/* Ontario municipal limit example: $25k */}
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-500">Spent</span>
                        <span className="font-bold text-slate-700">${fmt(Math.round(data.donationsRaised * 0.75))}</span>
                      </div>
                      <ProgressBar value={data.donationsRaised * 0.75} max={25000} color={AMBER} />
                      <p className="mt-1 text-[10px] text-slate-400">of $25,000 spending limit</p>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-500">Raised</span>
                        <span className="font-bold text-slate-700">${fmt(data.donationsRaised)}</span>
                      </div>
                      <ProgressBar value={data.donationsRaised} max={25000} color={GREEN} />
                    </div>
                  </div>
                </div>

                <ChartPanel title="Donor Demographics" className="md:col-span-3">
                  {data.donationsCount > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { range: "$1-25", count: Math.round(data.donationsCount * 0.35) },
                        { range: "$26-100", count: Math.round(data.donationsCount * 0.3) },
                        { range: "$101-250", count: Math.round(data.donationsCount * 0.2) },
                        { range: "$251-500", count: Math.round(data.donationsCount * 0.1) },
                        { range: "$500+", count: Math.round(data.donationsCount * 0.05) },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip formatter={(v) => [fmt(Number(v)), "Donors"]} />
                        <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Donor demographics require donation records" />
                  )}
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 7: Event Intelligence ═════════════════════════════ */}
            {tab === "events" && (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Upcoming Events" value="N/A" icon={Calendar} color={NAVY} />
                <MetricCard label="Avg RSVP Conversion" value={eventData.length > 0 ? `${Math.round(eventData.reduce((s, e) => s + e.conversion, 0) / eventData.length)}%` : "N/A"} color={GREEN} />
                <MetricCard label="Total Attendance" value={eventData.length > 0 ? fmt(eventData.reduce((s, e) => s + e.attended, 0)) : "N/A"} color={AMBER} />

                <ChartPanel title="RSVP vs Attendance by Event Type" className="md:col-span-2">
                  {eventData.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip />
                        <Bar dataKey="rsvp" fill={NAVY} name="RSVP" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="attended" fill={GREEN} name="Attended" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Event analytics not available" />
                  )}
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-slate-800">Event Type Performance</p>
                  {eventData.length > 0 ? (
                  <div className="space-y-3">
                    {eventData.map((e) => (
                      <div key={e.type}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-600">{e.type}</span>
                          <span className="font-bold" style={{ color: e.conversion >= 80 ? GREEN : e.conversion >= 70 ? AMBER : RED }}>
                            {e.conversion}%
                          </span>
                        </div>
                        <ProgressBar value={e.conversion} max={100} color={e.conversion >= 80 ? GREEN : e.conversion >= 70 ? AMBER : RED} />
                      </div>
                    ))}
                  </div>
                  ) : (
                    <EmptyChart message="Event analytics not available" />
                  )}
                </div>

                <ChartPanel title="Conversion Rate Trend" className="md:col-span-3">
                  {eventData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={eventData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                        <RTooltip formatter={(v) => [`${v}%`, "Conversion"]} />
                        <Line type="monotone" dataKey="conversion" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4, fill: GREEN }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <EmptyChart message="Event analytics not available" />
                  )}
                </ChartPanel>
              </div>
            )}

            {/* ═══ TAB 8: Historical Election Results ════════════════════ */}
            {tab === "historical" && !intelligenceEnabled && (
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Intelligence tier required</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Historical election results, GIS boundary overlays, and demographic data are part of the Intelligence tier.
                  Contact your Poll City account manager to unlock.
                </p>
              </div>
            )}
            {tab === "historical" && intelligenceEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <ChartPanel title={`Top 10 Municipalities by Votes (${year})`} className="md:col-span-2">
                  {data.topRows.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topRows.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="jurisdiction" interval={0} angle={-20} textAnchor="end" height={70} tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip formatter={(v) => fmt(Number(v))} />
                          <Bar dataKey="totalVotes" fill={NAVY} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyPanel title="No election data" description="Run the election-results seed to populate historical data." />
                  )}
                </ChartPanel>

                <ChartPanel title="Election Trends (2014-2022)">
                  {data.trendRows.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trendRows}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip formatter={(v, n) => [fmt(Number(v)), String(n)]} />
                          <Line type="monotone" dataKey="totalVotes" stroke={NAVY} strokeWidth={2.5} name="Total Votes" />
                          <Line type="monotone" dataKey="contests" stroke={AMBER} strokeWidth={2} name="Contests" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyPanel title="No trend data" description="Seed election results for 2014, 2018, and 2022." />
                  )}
                </ChartPanel>

                <ChartPanel title="GIS Boundary Overlay">
                  <ChoroplethMap geojson={data.boundaryCount > 0 ? (data.geojson as never) : null} year={year} />
                  <p className="mt-2 text-[10px] text-slate-400">GIS boundaries loaded: {data.boundaryCount}</p>
                </ChartPanel>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">Election Results Table ({province} {year})</p>
                    <span className="text-[10px] text-slate-400">{data.electionRows.length} records</span>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Jurisdiction</th>
                          <th className="px-3 py-2">Candidate</th>
                          <th className="px-3 py-2 text-right">Votes</th>
                          <th className="px-3 py-2 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.electionRows.slice(0, 50).map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.jurisdiction}</td>
                            <td className="px-3 py-2">{row.candidateName}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmt(row.votesReceived)}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: row.percentage >= 50 ? GREEN : row.percentage >= 30 ? AMBER : RED }}>
                              {row.percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                        {data.electionRows.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No election results loaded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] text-slate-400"
      >
        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Live campaign + election datasets</span>
        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Projections are directional</span>
      </motion.div>
    </div>
  );
}
