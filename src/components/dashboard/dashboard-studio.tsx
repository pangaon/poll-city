"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  DollarSign,
  Eye,
  LayoutDashboard,
  MapPin,
  Moon,
  Phone,
  Shield,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AnimatedNumber from "@/components/dashboard/animated-number";

/* ── Brand colours ─────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const WAR_BG = "#0A1628";

/* ── Election date ─────────────────────────────────── */
const ELECTION_DATE = new Date("2026-10-26T00:00:00");

function daysUntilElection(): number {
  const now = new Date();
  const diff = ELECTION_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/* ── Spring transition presets ─────────────────────── */
const springTap = { type: "spring" as const, stiffness: 400, damping: 30 };
const springEnter = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ── Mode definitions ──────────────────────────────── */
type DashboardMode = "overview" | "field-ops" | "finance" | "gotv" | "war-room" | "election-night";

const MODES: { id: DashboardMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "field-ops", label: "Field Ops", icon: MapPin },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "gotv", label: "GOTV", icon: Vote },
  { id: "war-room", label: "War Room", icon: Shield },
  { id: "election-night", label: "Election Night", icon: Moon },
];

/* ── Types ─────────────────────────────────────────── */
type DashboardStudioProps = {
  campaignId: string;
  campaignName: string;
  popoutWidgetId?: string | null;
  isPopout?: boolean;
};

type DashboardData = {
  gap: number;
  supportersVoted: number;
  confirmedSupporters: number;
  doorsToday: number;
  volunteersActive: number;
  signRequestsPending: number;
  recentActivity: ActivityItem[];
  /* Field Ops */
  canvassersSummary: CanvasserSummary[];
  turfCompletion: TurfRow[];
  walkListProgress: WalkListRow[];
  callListStats: { total: number; completed: number; reached: number };
  /* Finance */
  donationTotal: number;
  spendingLimit: number;
  currentSpending: number;
  donationChart: ChartPoint[];
  topDonors: DonorRow[];
  recentDonations: DonationItem[];
  /* GOTV */
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p4Count: number;
  totalVoted: number;
  totalSupporters: number;
  priorityCallList: CallItem[];
  /* Election Night */
  candidateVotes: number;
  opponentVotes: number;
  candidateName: string;
  opponentName: string;
  pollsReporting: number;
  totalPolls: number;
  pollResults: PollResult[];
};

type ActivityItem = { id: string; text: string; time: string; type: "door" | "call" | "donation" | "signup" };
type CanvasserSummary = { name: string; doors: number; ids: number; commits: number };
type TurfRow = { name: string; percent: number };
type WalkListRow = { volunteer: string; assigned: number; completed: number };
type ChartPoint = { label: string; amount: number };
type DonorRow = { name: string; total: number };
type DonationItem = { id: string; name: string; amount: number; time: string };
type CallItem = { name: string; phone: string; priority: "P1" | "P2" };
type PollResult = { pollId: string; candidate: number; opponent: number; reporting: boolean };

const FALLBACK: DashboardData = {
  gap: 312,
  supportersVoted: 2334,
  confirmedSupporters: 4280,
  doorsToday: 87,
  volunteersActive: 14,
  signRequestsPending: 6,
  recentActivity: [
    { id: "1", text: "Jane K. knocked 12 doors on Elm St", time: "2m ago", type: "door" },
    { id: "2", text: "Mike T. completed call list batch 4", time: "8m ago", type: "call" },
    { id: "3", text: "$250 donation from Sarah L.", time: "15m ago", type: "donation" },
    { id: "4", text: "New volunteer signup: Alex R.", time: "22m ago", type: "signup" },
    { id: "5", text: "Turf 7 completed — 94% contact rate", time: "35m ago", type: "door" },
  ],
  canvassersSummary: [
    { name: "Jane K.", doors: 48, ids: 32, commits: 18 },
    { name: "Mike T.", doors: 35, ids: 22, commits: 12 },
    { name: "Alex R.", doors: 29, ids: 20, commits: 15 },
    { name: "Sarah L.", doors: 22, ids: 14, commits: 8 },
  ],
  turfCompletion: [
    { name: "Turf 1 — Elm St", percent: 94 },
    { name: "Turf 2 — Oak Ave", percent: 78 },
    { name: "Turf 3 — Maple Dr", percent: 62 },
    { name: "Turf 4 — Pine Rd", percent: 45 },
    { name: "Turf 5 — Cedar Ln", percent: 31 },
  ],
  walkListProgress: [
    { volunteer: "Jane K.", assigned: 60, completed: 48 },
    { volunteer: "Mike T.", assigned: 50, completed: 35 },
    { volunteer: "Alex R.", assigned: 40, completed: 29 },
  ],
  callListStats: { total: 500, completed: 312, reached: 198 },
  donationTotal: 47850,
  spendingLimit: 75000,
  currentSpending: 38200,
  donationChart: [
    { label: "Mon", amount: 2400 },
    { label: "Tue", amount: 3100 },
    { label: "Wed", amount: 1800 },
    { label: "Thu", amount: 4200 },
    { label: "Fri", amount: 3600 },
    { label: "Sat", amount: 5800 },
    { label: "Sun", amount: 2900 },
  ],
  topDonors: [
    { name: "Sarah L.", total: 1500 },
    { name: "David M.", total: 1200 },
    { name: "Karen W.", total: 1000 },
    { name: "James P.", total: 800 },
    { name: "Lisa C.", total: 750 },
  ],
  recentDonations: [
    { id: "d1", name: "Sarah L.", amount: 250, time: "15m ago" },
    { id: "d2", name: "Anonymous", amount: 100, time: "1h ago" },
    { id: "d3", name: "David M.", amount: 500, time: "2h ago" },
    { id: "d4", name: "Karen W.", amount: 75, time: "3h ago" },
  ],
  p1Count: 1842,
  p2Count: 1120,
  p3Count: 680,
  p4Count: 320,
  totalVoted: 2334,
  totalSupporters: 4280,
  priorityCallList: [
    { name: "Margaret S.", phone: "(416) 555-0142", priority: "P1" },
    { name: "Robert J.", phone: "(416) 555-0198", priority: "P1" },
    { name: "Patricia D.", phone: "(416) 555-0231", priority: "P1" },
    { name: "William B.", phone: "(416) 555-0317", priority: "P2" },
    { name: "Linda F.", phone: "(416) 555-0428", priority: "P2" },
  ],
  candidateVotes: 4218,
  opponentVotes: 3906,
  candidateName: "Our Candidate",
  opponentName: "Opponent",
  pollsReporting: 34,
  totalPolls: 52,
  pollResults: [],
};

/* ── Main component ────────────────────────────────── */
export default function DashboardStudio({ campaignId, campaignName }: DashboardStudioProps) {
  const [mode, setMode] = useState<DashboardMode>(() => {
    if (typeof window === "undefined") return "overview";
    return (localStorage.getItem(`pc-dash-mode-${campaignId}`) as DashboardMode) || "overview";
  });
  const [data, setData] = useState<DashboardData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const switchMode = useCallback((m: DashboardMode) => {
    setMode(m);
    localStorage.setItem(`pc-dash-mode-${campaignId}`, m);
  }, [campaignId]);

  /* Data fetching */
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const [health, gotv, election, morning, volunteers] = await Promise.all([
          fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/gotv/summary?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/election-night/live?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/briefing/morning?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/volunteers/performance?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;

        setData((prev) => ({
          ...prev,
          gap: gotv?.gap ?? election?.gap ?? prev.gap,
          supportersVoted: gotv?.supportersVoted ?? election?.supportersVoted ?? prev.supportersVoted,
          confirmedSupporters: gotv?.confirmedSupporters ?? election?.confirmedSupporters ?? prev.confirmedSupporters,
          doorsToday: morning?.trends?.doorsToday ?? prev.doorsToday,
          volunteersActive: volunteers?.active ?? prev.volunteersActive,
          p1Count: gotv?.p1Count ?? prev.p1Count,
          p2Count: gotv?.p2Count ?? prev.p2Count,
          p3Count: gotv?.p3Count ?? prev.p3Count,
          p4Count: gotv?.p4Count ?? prev.p4Count,
          totalVoted: gotv?.supportersVoted ?? prev.totalVoted,
          totalSupporters: gotv?.confirmedSupporters ?? prev.totalSupporters,
          candidateVotes: election?.candidateVotes ?? prev.candidateVotes,
          opponentVotes: election?.opponentVotes ?? prev.opponentVotes,
          pollsReporting: election?.pollsReporting ?? prev.pollsReporting,
          totalPolls: election?.totalPolls ?? prev.totalPolls,
        }));
      } catch {
        /* keep fallback data */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    pull();
    const timer = setInterval(pull, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [campaignId]);

  const isDark = mode === "war-room" || mode === "election-night";

  return (
    <div
      className={isDark ? "min-h-screen rounded-xl p-4" : "space-y-4"}
      style={isDark ? { background: mode === "war-room" ? WAR_BG : "#0D1117", color: "#F0F6FC" } : undefined}
    >
      {/* Header & Mode Tabs */}
      <div className={isDark
        ? "rounded-xl border border-slate-700 bg-white/5 p-4"
        : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      }>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={isDark ? "text-2xl font-black text-white" : "text-2xl font-black text-slate-900"}>
              {campaignName} Dashboard
            </h1>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              {daysUntilElection()} days to election day
            </p>
          </div>
          {/* Mobile dropdown */}
          <select
            value={mode}
            onChange={(e) => switchMode(e.target.value as DashboardMode)}
            className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:hidden"
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        {/* Desktop tabs */}
        <div className="mt-3 hidden gap-1 overflow-x-auto sm:flex">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => switchMode(m.id)}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={springTap}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? isDark
                      ? "bg-white/10 text-white"
                      : "text-white"
                    : isDark
                      ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                style={active && !isDark ? { backgroundColor: NAVY } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Shimmer key={i} height={100} dark={isDark} />)}
          </div>
          <Shimmer height={300} dark={isDark} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={springEnter}
          >
            {mode === "overview" && <OverviewMode data={data} dark={false} />}
            {mode === "field-ops" && <FieldOpsMode data={data} />}
            {mode === "finance" && <FinanceMode data={data} />}
            {mode === "gotv" && <GOTVMode data={data} />}
            {mode === "war-room" && <WarRoomMode data={data} />}
            {mode === "election-night" && <ElectionNightMode data={data} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 1: OVERVIEW
   ════════════════════════════════════════════════════════ */
function OverviewMode({ data, dark }: { data: DashboardData; dark: boolean }) {
  const days = daysUntilElection();
  const greeting = getGreeting();

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springEnter}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <p className="text-lg font-bold text-slate-900">{greeting}</p>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-black text-[#0A2342]">{days}</span> days until Election Day — October 26, 2026
        </p>
      </motion.div>

      {/* The Gap — hero */}
      <GapWidget value={data.gap} supportersVoted={data.supportersVoted} confirmed={data.confirmedSupporters} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Supporters" value={data.confirmedSupporters} icon={Users} color={GREEN} />
        <StatCard label="Doors Today" value={data.doorsToday} icon={MapPin} color={NAVY} />
        <StatCard label="Volunteers Active" value={data.volunteersActive} icon={Zap} color={AMBER} />
        <StatCard label="Sign Requests" value={data.signRequestsPending} icon={Activity} color={RED} />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Recent Activity</h3>
        <div className="space-y-2">
          {data.recentActivity.length === 0 ? (
            <EmptyState text="No recent activity yet" />
          ) : (
            data.recentActivity.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springEnter, delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2"
              >
                <ActivityIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">{item.text}</p>
                  <p className="text-[11px] text-slate-400">{item.time}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 2: FIELD OPS
   ════════════════════════════════════════════════════════ */
function FieldOpsMode({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      {/* Canvasser Summary */}
      <Card title="Canvasser Activity Summary">
        {data.canvassersSummary.length === 0 ? (
          <EmptyState text="No canvasser activity yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Canvasser</th>
                  <th className="py-2 pr-4 font-semibold">Doors</th>
                  <th className="py-2 pr-4 font-semibold">IDs</th>
                  <th className="py-2 font-semibold">Commits</th>
                </tr>
              </thead>
              <tbody>
                {data.canvassersSummary.map((row, i) => (
                  <motion.tr
                    key={row.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springEnter, delay: i * 0.05 }}
                    className="border-b border-slate-50"
                  >
                    <td className="py-2 pr-4 font-bold text-slate-800">{row.name}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-600">{row.doors}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-600">{row.ids}</td>
                    <td className="py-2 font-semibold" style={{ color: GREEN }}>{row.commits}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Turf Completion */}
      <Card title="Turf Completion">
        {data.turfCompletion.length === 0 ? (
          <EmptyState text="No turf data yet" />
        ) : (
          <div className="space-y-3">
            {data.turfCompletion.map((turf, i) => (
              <motion.div
                key={turf.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springEnter, delay: i * 0.04 }}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{turf.name}</span>
                  <span className="font-bold" style={{ color: turf.percent >= 80 ? GREEN : turf.percent >= 50 ? AMBER : RED }}>
                    {turf.percent}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: turf.percent >= 80 ? GREEN : turf.percent >= 50 ? AMBER : RED }}
                    initial={{ width: 0 }}
                    animate={{ width: `${turf.percent}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.05 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Walk List Progress */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Walk List Progress">
          {data.walkListProgress.length === 0 ? (
            <EmptyState text="No walk lists assigned yet" />
          ) : (
            <div className="space-y-3">
              {data.walkListProgress.map((row) => {
                const pct = Math.round((row.completed / Math.max(1, row.assigned)) * 100);
                return (
                  <div key={row.volunteer}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{row.volunteer}</span>
                      <span className="text-slate-500">{row.completed}/{row.assigned}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: NAVY }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Call List Stats */}
        <Card title="Call List Stats">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <AnimatedNumber value={data.callListStats.total} className="text-2xl font-black text-slate-900" />
                <p className="text-[11px] font-semibold text-slate-500">Total</p>
              </div>
              <div>
                <AnimatedNumber value={data.callListStats.completed} className="text-2xl font-black" style={{ color: GREEN }} />
                <p className="text-[11px] font-semibold text-slate-500">Completed</p>
              </div>
              <div>
                <AnimatedNumber value={data.callListStats.reached} className="text-2xl font-black" style={{ color: NAVY }} />
                <p className="text-[11px] font-semibold text-slate-500">Reached</p>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: GREEN }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((data.callListStats.completed / Math.max(1, data.callListStats.total)) * 100)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 3: FINANCE
   ════════════════════════════════════════════════════════ */
function FinanceMode({ data }: { data: DashboardData }) {
  const spendPct = Math.round((data.currentSpending / Math.max(1, data.spendingLimit)) * 100);
  const overBudget = spendPct >= 80;

  return (
    <div className="space-y-4">
      {/* Donation Total */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springEnter}
        className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total Raised</p>
        <AnimatedNumber
          value={data.donationTotal}
          className="mt-1 text-5xl font-black md:text-6xl"
          style={{ color: GREEN }}
          format={(v) => `$${v.toLocaleString()}`}
        />
      </motion.div>

      {/* Donation Chart */}
      <Card title="Donation Trend (Weekly)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.donationChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                formatter={((value: number) => [`$${value.toLocaleString()}`, "Amount"]) as never}
              />
              <Bar dataKey="amount" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Donors */}
        <Card title="Top Donors">
          {data.topDonors.length === 0 ? (
            <EmptyState text="No donations yet" />
          ) : (
            <div className="space-y-2">
              {data.topDonors.map((donor, i) => (
                <motion.div
                  key={donor.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springEnter, delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: NAVY }}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{donor.name}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: GREEN }}>${donor.total.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Donations */}
        <Card title="Recent Donations">
          {data.recentDonations.length === 0 ? (
            <EmptyState text="No recent donations" />
          ) : (
            <div className="space-y-2">
              {data.recentDonations.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springEnter, delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{d.name}</p>
                    <p className="text-[11px] text-slate-400">{d.time}</p>
                  </div>
                  <span className="text-sm font-black" style={{ color: GREEN }}>${d.amount}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Spending vs Limit */}
      <Card title="Spending vs Limit">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">
              ${data.currentSpending.toLocaleString()} of ${data.spendingLimit.toLocaleString()}
            </span>
            <span className="font-black" style={{ color: overBudget ? RED : GREEN }}>{spendPct}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: overBudget ? RED : GREEN }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, spendPct)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
          {overBudget && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold"
              style={{ color: RED }}
            >
              Warning: Approaching spending limit
            </motion.p>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 4: GOTV
   ════════════════════════════════════════════════════════ */
function GOTVMode({ data }: { data: DashboardData }) {
  const days = daysUntilElection();
  const votedPct = Math.round((data.totalVoted / Math.max(1, data.totalSupporters)) * 100);
  const pieData = [
    { name: "P1 Strong", value: data.p1Count, color: GREEN },
    { name: "P2 Leaning", value: data.p2Count, color: "#3B82F6" },
    { name: "P3 Undecided", value: data.p3Count, color: AMBER },
    { name: "P4 Against", value: data.p4Count, color: RED },
  ];

  return (
    <div className="space-y-4">
      {/* Election Countdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springEnter}
        className="rounded-xl p-6 text-center text-white"
        style={{ background: NAVY }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Election Day Countdown</p>
        <AnimatedNumber value={days} className="mt-1 text-6xl font-black md:text-7xl" />
        <p className="mt-1 text-sm font-semibold text-slate-300">days remaining</p>
      </motion.div>

      {/* Giant Voted Counter + Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-500">Supporters Voted</p>
        <div className="mt-2 text-center">
          <AnimatedNumber
            value={data.totalVoted}
            className="text-5xl font-black md:text-6xl"
            style={{ color: GREEN }}
          />
          <span className="ml-2 text-xl font-semibold text-slate-400">/ {data.totalSupporters.toLocaleString()}</span>
        </div>
        <div className="mx-auto mt-4 max-w-md">
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: GREEN }}
              initial={{ width: 0 }}
              animate={{ width: `${votedPct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
          <p className="mt-1 text-center text-xs font-bold text-slate-500">{votedPct}% turned out</p>
        </div>
      </div>

      {/* P1-P4 Breakdown */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pieData.map((seg) => (
          <motion.div
            key={seg.name}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={springTap}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
          >
            <div className="mx-auto mb-2 h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <AnimatedNumber value={seg.value} className="text-2xl font-black text-slate-900" />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{seg.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Pie Chart */}
      <Card title="Support Breakdown">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                formatter={((value: number) => [value.toLocaleString(), ""]) as never}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Priority Call List */}
      <Card title="Priority Call List">
        {data.priorityCallList.length === 0 ? (
          <EmptyState text="No priority calls needed" />
        ) : (
          <div className="space-y-2">
            {data.priorityCallList.map((call, i) => (
              <motion.div
                key={`${call.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springEnter, delay: i * 0.04 }}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-black text-white"
                    style={{ backgroundColor: call.priority === "P1" ? GREEN : "#3B82F6" }}
                  >
                    {call.priority}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{call.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3 w-3" />
                  {call.phone}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 5: WAR ROOM (Dark #0A1628)
   ════════════════════════════════════════════════════════ */
function WarRoomMode({ data }: { data: DashboardData }) {
  const [ticker, setTicker] = useState<ActivityItem[]>(data.recentActivity);

  useEffect(() => {
    setTicker(data.recentActivity);
  }, [data.recentActivity]);

  return (
    <div className="space-y-4">
      {/* Critical numbers row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <WarCard label="The Gap" value={data.gap} color={data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN} />
        <WarCard label="Voted" value={data.totalVoted} color={GREEN} />
        <WarCard label="Volunteers Active" value={data.volunteersActive} color={AMBER} />
        <WarCard label="Doors Today" value={data.doorsToday} color="#3B82F6" />
      </div>

      {/* Giant gap display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springEnter}
        className="rounded-xl border border-white/10 p-8 text-center"
        style={{ background: "linear-gradient(135deg, #0A2342 0%, #0A1628 100%)" }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">THE GAP</p>
        <AnimatedNumber
          value={data.gap}
          className="text-[72px] font-black leading-none md:text-[96px]"
          style={{ color: data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN }}
        />
        <div className="mx-auto mt-4 max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: GREEN }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.round((data.totalVoted / Math.max(1, data.totalSupporters)) * 100))}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
        </div>
      </motion.div>

      {/* All numbers at once */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <WarMini label="P1" value={data.p1Count} />
        <WarMini label="P2" value={data.p2Count} />
        <WarMini label="P3" value={data.p3Count} />
        <WarMini label="P4" value={data.p4Count} />
        <WarMini label="Signs Pending" value={data.signRequestsPending} />
        <WarMini label="Days Left" value={daysUntilElection()} />
      </div>

      {/* Activity ticker */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Live Activity</p>
        </div>
        <div className="space-y-1">
          {ticker.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springEnter, delay: i * 0.05 }}
              className="flex items-center gap-2 text-xs"
            >
              <span className="text-slate-500">{item.time}</span>
              <span className="text-slate-300">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 6: ELECTION NIGHT (Dark CNN-style)
   ════════════════════════════════════════════════════════ */
function ElectionNightMode({ data }: { data: DashboardData }) {
  const total = data.candidateVotes + data.opponentVotes;
  const candPct = total > 0 ? Math.round((data.candidateVotes / total) * 100) : 0;
  const oppPct = total > 0 ? 100 - candPct : 0;
  const leading = data.candidateVotes >= data.opponentVotes;

  return (
    <div className="space-y-4">
      {/* Polls reporting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">LIVE</span>
        </div>
        <span className="text-sm font-bold text-slate-300">
          <span className="text-white">{data.pollsReporting}</span> of <span className="text-white">{data.totalPolls}</span> polls reporting
        </span>
      </motion.div>

      {/* Main result */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springEnter}
        className="overflow-hidden rounded-xl border border-white/10"
        style={{ background: "linear-gradient(135deg, #0D1117 0%, #161B22 100%)" }}
      >
        <div className="p-6">
          {/* Candidate vs Opponent */}
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{data.candidateName}</p>
              <AnimatedNumber
                value={data.candidateVotes}
                className="mt-1 text-4xl font-black md:text-5xl"
                style={{ color: leading ? GREEN : "#6B7280" }}
              />
              <p className="mt-1 text-2xl font-black" style={{ color: leading ? GREEN : "#6B7280" }}>{candPct}%</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{data.opponentName}</p>
              <AnimatedNumber
                value={data.opponentVotes}
                className="mt-1 text-4xl font-black md:text-5xl"
                style={{ color: !leading ? RED : "#6B7280" }}
              />
              <p className="mt-1 text-2xl font-black" style={{ color: !leading ? RED : "#6B7280" }}>{oppPct}%</p>
            </div>
          </div>

          {/* Bar comparison */}
          <div className="mt-6 flex h-8 overflow-hidden rounded-full">
            <motion.div
              className="flex items-center justify-center text-xs font-black text-white"
              style={{ backgroundColor: GREEN }}
              initial={{ width: "50%" }}
              animate={{ width: `${candPct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {candPct > 10 && `${candPct}%`}
            </motion.div>
            <motion.div
              className="flex items-center justify-center text-xs font-black text-white"
              style={{ backgroundColor: RED }}
              initial={{ width: "50%" }}
              animate={{ width: `${oppPct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {oppPct > 10 && `${oppPct}%`}
            </motion.div>
          </div>
        </div>

        {/* Vote difference */}
        <div className="border-t border-white/10 bg-white/5 px-6 py-3 text-center">
          <p className="text-xs text-slate-400">
            {leading ? data.candidateName : data.opponentName} leads by{" "}
            <span className="font-black text-white">{Math.abs(data.candidateVotes - data.opponentVotes).toLocaleString()}</span>{" "}
            votes
          </p>
        </div>
      </motion.div>

      {/* Poll results table */}
      {data.pollResults.length > 0 && (
        <Card title="Poll-by-Poll Results" dark>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Poll</th>
                  <th className="py-2 pr-4 font-semibold">{data.candidateName}</th>
                  <th className="py-2 pr-4 font-semibold">{data.opponentName}</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pollResults.map((poll) => (
                  <tr key={poll.pollId} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-bold text-slate-300">{poll.pollId}</td>
                    <td className="py-2 pr-4 font-semibold" style={{ color: poll.candidate > poll.opponent ? GREEN : "#6B7280" }}>
                      {poll.candidate}
                    </td>
                    <td className="py-2 pr-4 font-semibold" style={{ color: poll.opponent > poll.candidate ? RED : "#6B7280" }}>
                      {poll.opponent}
                    </td>
                    <td className="py-2">
                      {poll.reporting ? (
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">Reported</span>
                      ) : (
                        <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Election countdown */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {daysUntilElection() === 0 ? "ELECTION DAY" : `${daysUntilElection()} DAYS TO GO`}
        </p>
      </div>
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────── */

function GapWidget({ value, supportersVoted, confirmed }: { value: number; supportersVoted: number; confirmed: number }) {
  const valueColor = value > 500 ? RED : value >= 100 ? AMBER : GREEN;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springEnter}
      className="relative overflow-hidden rounded-xl p-6 text-white"
      style={{ background: value === 0 ? GREEN : NAVY }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-slate-300">The Gap</p>
      <motion.div
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <AnimatedNumber
          value={value}
          className="text-[72px] font-black leading-none"
          format={(v) => v.toLocaleString()}
        />
      </motion.div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: valueColor }}
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(100, (supportersVoted / Math.max(1, confirmed)) * 100))}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-300">
        {supportersVoted.toLocaleString()} voted of {confirmed.toLocaleString()} supporters
      </p>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={springTap}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-4 w-4" />
      </div>
      <AnimatedNumber value={value} className="text-2xl font-black text-slate-900" />
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </motion.div>
  );
}

function Card({ title, children, dark }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={dark
      ? "rounded-xl border border-white/10 bg-white/5 p-4"
      : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    }>
      <h3 className={dark
        ? "mb-3 text-sm font-black uppercase tracking-wide text-slate-400"
        : "mb-3 text-sm font-black uppercase tracking-wide text-slate-500"
      }>
        {title}
      </h3>
      {children}
    </div>
  );
}

function WarCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={springTap}
      className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
    >
      <AnimatedNumber value={value} className="text-3xl font-black" style={{ color }} />
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </motion.div>
  );
}

function WarMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
      <AnimatedNumber value={value} className="text-xl font-black text-white" />
      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const map = {
    door: { icon: MapPin, color: NAVY },
    call: { icon: Phone, color: GREEN },
    donation: { icon: DollarSign, color: AMBER },
    signup: { icon: Users, color: "#3B82F6" },
  };
  const { icon: Icon, color } = map[type];
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}15` }}>
      <Icon className="h-3 w-3" style={{ color }} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <Eye className="mx-auto h-6 w-6 text-slate-300" />
      <p className="mt-2 text-xs font-semibold text-slate-400">{text}</p>
    </div>
  );
}

function Shimmer({ height, dark }: { height: number; dark: boolean }) {
  return (
    <div
      style={{ height }}
      className={`w-full rounded-xl ${
        dark
          ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_25%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.03)_75%)]"
          : "bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_50%,#f1f5f9_75%)]"
      } bg-[length:200%_100%] animate-[shimmer_1.5s_linear_infinite]`}
    />
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
