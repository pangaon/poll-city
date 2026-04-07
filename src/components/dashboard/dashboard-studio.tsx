"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  DollarSign,
  Eye,
  EyeOff,
  LayoutDashboard,
  MapPin,
  Moon,
  Phone,
  PlusCircle,
  Settings,
  Shield,
  Users,
  Vote,
  X,
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
type CampaignType = "municipal" | "provincial" | "federal" | "by_election" | "other";

type DashboardStudioProps = {
  campaignId: string;
  campaignName: string;
  campaignLogoUrl?: string;
  campaignType?: CampaignType;
  popoutWidgetId?: string | null;
  isPopout?: boolean;
};

/* ── Widget definitions for customize panel ───────── */
type StudioWidgetId = "gap" | "stat-cards" | "activity" | "canvassers" | "turf" | "walk-list" | "call-stats"
  | "donation-total" | "donation-chart" | "top-donors" | "recent-donations" | "spending"
  | "gotv-countdown" | "voted-counter" | "p1p4-breakdown" | "support-pie" | "priority-calls"
  | "war-numbers" | "war-gap" | "war-grid" | "war-ticker"
  | "election-polls" | "election-result" | "election-countdown";

interface StudioWidget {
  id: StudioWidgetId;
  label: string;
  mode: DashboardMode;
  relevance: CampaignType[];
}

const ALL_STUDIO_WIDGETS: StudioWidget[] = [
  { id: "gap", label: "The Gap", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "stat-cards", label: "Stat Cards (Supporters, Doors, Volunteers, Signs)", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "activity", label: "Recent Activity Feed", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "canvassers", label: "Canvasser Summary", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "turf", label: "Turf Completion", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "walk-list", label: "Walk List Progress", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "call-stats", label: "Call List Stats", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "donation-total", label: "Donation Total", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "donation-chart", label: "Donation Trend Chart", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "top-donors", label: "Top Donors", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "recent-donations", label: "Recent Donations", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "spending", label: "Spending vs Limit", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "gotv-countdown", label: "Election Countdown", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "voted-counter", label: "Supporters Voted Counter", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "p1p4-breakdown", label: "P1-P4 Breakdown Cards", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "support-pie", label: "Support Breakdown Pie", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "priority-calls", label: "Priority Call List", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-numbers", label: "War Room Numbers", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-gap", label: "War Room Gap Display", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-grid", label: "War Room Mini Grid", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-ticker", label: "Live Activity Ticker", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-polls", label: "Polls Reporting", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-result", label: "Election Results", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-countdown", label: "Election Day Counter", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
];

/* ── Preferences type ─────────────────────────────── */
interface DashboardPreferences {
  defaultMode: DashboardMode;
  hiddenWidgets: StudioWidgetId[];
}

const DEFAULT_PREFS: DashboardPreferences = { defaultMode: "overview", hiddenWidgets: [] };
const PREFS_LS_KEY = "pc-dash-prefs";

function loadPrefsFromLS(campaignId: string): DashboardPreferences {
  try {
    const raw = localStorage.getItem(`${PREFS_LS_KEY}-${campaignId}`);
    if (raw) return JSON.parse(raw) as DashboardPreferences;
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

function savePrefsToLS(campaignId: string, prefs: DashboardPreferences) {
  try { localStorage.setItem(`${PREFS_LS_KEY}-${campaignId}`, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/* ── Empty-state config per widget ────────────────── */
const EMPTY_STATE_CONFIG: Record<string, { message: string; action: string; href: string }> = {
  "gap": { message: "No supporter data yet — start by adding your first contacts", action: "Import contacts", href: "/contacts/import" },
  "stat-cards": { message: "Your stats will appear as data comes in", action: "Add your first supporter", href: "/contacts/new" },
  "activity": { message: "No recent activity yet — your team's actions will show here", action: "Invite a volunteer", href: "/volunteers" },
  "canvassers": { message: "No canvasser activity yet — set up your first turf", action: "Set up canvassing", href: "/canvassing" },
  "turf": { message: "No turfs created yet — divide your area into walkable turfs", action: "Create a turf", href: "/canvassing" },
  "walk-list": { message: "No walk lists assigned yet — create turfs and assign volunteers", action: "Set up canvassing", href: "/canvassing" },
  "call-stats": { message: "No calls made yet — set up your phone bank", action: "Start calling", href: "/phone-bank" },
  "donation-total": { message: "No donations yet — share your fundraising page", action: "Log first donation", href: "/finance/donations/new" },
  "donation-chart": { message: "Donation trends will appear after your first contributions", action: "Log first donation", href: "/finance/donations/new" },
  "top-donors": { message: "Your top donors will appear here", action: "Log first donation", href: "/finance/donations/new" },
  "recent-donations": { message: "No recent donations to show", action: "Log first donation", href: "/finance/donations/new" },
  "spending": { message: "Track spending against your campaign limit", action: "Log an expense", href: "/finance" },
  "gotv-countdown": { message: "Election countdown is active", action: "View GOTV plan", href: "/gotv" },
  "voted-counter": { message: "No supporters have voted yet — start identifying supporters", action: "Import contacts", href: "/contacts/import" },
  "p1p4-breakdown": { message: "No support levels recorded yet — start canvassing", action: "Set up canvassing", href: "/canvassing" },
  "support-pie": { message: "Support breakdown will appear after canvassing", action: "Set up canvassing", href: "/canvassing" },
  "priority-calls": { message: "No priority calls needed yet", action: "Start calling", href: "/phone-bank" },
  "war-numbers": { message: "War room numbers populate from live campaign data", action: "Import contacts", href: "/contacts/import" },
  "war-gap": { message: "The gap will appear once you have voter data", action: "Import contacts", href: "/contacts/import" },
  "war-grid": { message: "Mini grid populates from live data", action: "Import contacts", href: "/contacts/import" },
  "war-ticker": { message: "Live activity will stream here as your team works", action: "Invite a volunteer", href: "/volunteers" },
  "election-polls": { message: "Poll results will appear on election night", action: "View election setup", href: "/election-night" },
  "election-result": { message: "Results will stream in on election night", action: "View election setup", href: "/election-night" },
  "election-countdown": { message: "Counting down to election day", action: "View GOTV plan", href: "/gotv" },
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
  /* Health */
  healthScore: number;
  grade: string;
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
  healthScore: 0,
  grade: "–",
};

/* ── Main component ────────────────────────────────── */
export default function DashboardStudio({ campaignId, campaignName, campaignLogoUrl, campaignType = "municipal" }: DashboardStudioProps) {
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  /* Load preferences: try API, fallback to localStorage */
  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      try {
        const res = await fetch(`/api/campaigns/current`);
        if (res.ok) {
          const json = await res.json();
          const stored = json?.customization?.dashboardPreferences;
          if (stored && !cancelled) {
            const p: DashboardPreferences = {
              defaultMode: stored.defaultMode ?? "overview",
              hiddenWidgets: Array.isArray(stored.hiddenWidgets) ? stored.hiddenWidgets : [],
            };
            setPrefs(p);
            savePrefsToLS(campaignId, p);
            setPrefsLoaded(true);
            return;
          }
        }
      } catch { /* API unavailable */ }
      if (!cancelled) {
        setPrefs(loadPrefsFromLS(campaignId));
        setPrefsLoaded(true);
      }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, [campaignId]);

  const [mode, setMode] = useState<DashboardMode>("overview");
  const [data, setData] = useState<DashboardData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  /* Set mode from prefs once loaded */
  useEffect(() => {
    if (!prefsLoaded) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(`pc-dash-mode-${campaignId}`) as DashboardMode | null : null;
    setMode(stored ?? prefs.defaultMode);
  }, [prefsLoaded, campaignId, prefs.defaultMode]);

  const switchMode = useCallback((m: DashboardMode) => {
    setMode(m);
    localStorage.setItem(`pc-dash-mode-${campaignId}`, m);
  }, [campaignId]);

  const isWidgetHidden = useCallback((id: StudioWidgetId) => prefs.hiddenWidgets.includes(id), [prefs.hiddenWidgets]);

  /* Save preferences: API + localStorage */
  const savePreferences = useCallback(async (newPrefs: DashboardPreferences) => {
    setPrefs(newPrefs);
    savePrefsToLS(campaignId, newPrefs);
    setSavingPrefs(true);
    try {
      await fetch(`/api/campaigns/current`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardPreferences: newPrefs }),
      });
    } catch { /* offline — localStorage already saved */ }
    setSavingPrefs(false);
  }, [campaignId]);

  /* Data fetching */
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const [health, gotv, election, morning, volunteers, donations, signs] = await Promise.all([
          fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/gotv/summary?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/election-night?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/briefing?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/volunteers/performance?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/donations?campaignId=${campaignId}&pageSize=100`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/signs?campaignId=${campaignId}&pageSize=100`).then((r) => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;

        /* ── Process donation data ────────────────────────── */
        const donationRecords: any[] = donations?.data ?? [];
        const receivedGroup = donations?.totalsByStatus?.find((g: any) => g.status === "received");
        const computedDonationTotal = Number(receivedGroup?._sum?.amount ?? 0);

        const computedRecentDonations: DonationItem[] = donationRecords.slice(0, 5).map((d: any) => ({
          id: d.id,
          name: d.contact ? `${d.contact.firstName ?? ""} ${d.contact.lastName ?? ""}`.trim() || "Anonymous" : "Anonymous",
          amount: Number(d.amount ?? 0),
          time: relativeTime(d.createdAt),
        }));

        const donorMap = new Map<string, number>();
        for (const d of donationRecords) {
          const name = d.contact ? `${d.contact.firstName ?? ""} ${d.contact.lastName ?? ""}`.trim() || "Anonymous" : "Anonymous";
          donorMap.set(name, (donorMap.get(name) ?? 0) + Number(d.amount ?? 0));
        }
        const computedTopDonors: DonorRow[] = Array.from(donorMap.entries())
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        /* ── Process sign data ────────────────────────────── */
        const signRecords: any[] = signs?.data ?? [];
        const computedSignsPending = signRecords.filter((s: any) => s.status === "requested").length;

        setData((prev) => ({
          ...prev,
          gap: gotv?.gap ?? election?.gap ?? prev.gap,
          supportersVoted: gotv?.supportersVoted ?? election?.supportersVoted ?? prev.supportersVoted,
          confirmedSupporters: gotv?.confirmedSupporters ?? election?.confirmedSupporters ?? prev.confirmedSupporters,
          doorsToday: morning?.yesterday?.doorsKnocked ?? prev.doorsToday,
          volunteersActive: volunteers?.summary?.active ?? prev.volunteersActive,
          signRequestsPending: computedSignsPending || prev.signRequestsPending,
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
          /* Finance */
          donationTotal: computedDonationTotal || prev.donationTotal,
          recentDonations: computedRecentDonations.length > 0 ? computedRecentDonations : prev.recentDonations,
          topDonors: computedTopDonors.length > 0 ? computedTopDonors : prev.topDonors,
          /* Health */
          healthScore: health?.healthScore ?? prev.healthScore,
          grade: health?.grade ?? prev.grade,
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
          <div className="flex items-center gap-3">
            {/* Campaign Logo */}
            {campaignLogoUrl ? (
              <img
                src={campaignLogoUrl}
                alt={`${campaignName} logo`}
                className="h-10 w-10 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: NAVY }}
              >
                {campaignName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={isDark ? "text-2xl font-black text-white" : "text-2xl font-black text-slate-900"}>
                {campaignName}
              </h1>
              <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                {daysUntilElection()} days to election day
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Customize button */}
            <motion.button
              type="button"
              onClick={() => setShowCustomize(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTap}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                isDark
                  ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Customize
            </motion.button>
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

      {/* Customize Panel (Slide-over) */}
      <AnimatePresence>
        {showCustomize && (
          <CustomizePanel
            prefs={prefs}
            campaignType={campaignType}
            saving={savingPrefs}
            onSave={savePreferences}
            onClose={() => setShowCustomize(false)}
          />
        )}
      </AnimatePresence>

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
            {mode === "overview" && <OverviewMode data={data} dark={false} hidden={isWidgetHidden} />}
            {mode === "field-ops" && <FieldOpsMode data={data} hidden={isWidgetHidden} />}
            {mode === "finance" && <FinanceMode data={data} hidden={isWidgetHidden} />}
            {mode === "gotv" && <GOTVMode data={data} hidden={isWidgetHidden} />}
            {mode === "war-room" && <WarRoomMode data={data} hidden={isWidgetHidden} />}
            {mode === "election-night" && <ElectionNightMode data={data} hidden={isWidgetHidden} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 1: OVERVIEW
   ════════════════════════════════════════════════════════ */
function OverviewMode({ data, dark, hidden }: { data: DashboardData; dark: boolean; hidden: (id: StudioWidgetId) => boolean }) {
  const days = daysUntilElection();
  const greeting = getGreeting();
  const hasNoData = data.confirmedSupporters === FALLBACK.confirmedSupporters && data.doorsToday === FALLBACK.doorsToday;

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
      {!hidden("gap") && (
        hasNoData ? <WarmEmptyState widgetId="gap" /> : <GapWidget value={data.gap} supportersVoted={data.supportersVoted} confirmed={data.confirmedSupporters} />
      )}

      {/* Stat cards */}
      {!hidden("stat-cards") && (
        hasNoData ? <WarmEmptyState widgetId="stat-cards" /> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Supporters" value={data.confirmedSupporters} icon={Users} color={GREEN} />
            <StatCard label="Doors Today" value={data.doorsToday} icon={MapPin} color={NAVY} />
            <StatCard label="Volunteers Active" value={data.volunteersActive} icon={Zap} color={AMBER} />
            <StatCard label="Sign Requests" value={data.signRequestsPending} icon={Activity} color={RED} />
          </div>
        )
      )}

      {/* Recent Activity */}
      {!hidden("activity") && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Recent Activity</h3>
          <div className="space-y-2">
            {data.recentActivity.length === 0 ? (
              <WarmEmptyState widgetId="activity" />
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
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 2: FIELD OPS
   ════════════════════════════════════════════════════════ */
function FieldOpsMode({ data, hidden }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean }) {
  return (
    <div className="space-y-4">
      {/* Canvasser Summary */}
      {!hidden("canvassers") && <Card title="Canvasser Activity Summary">
        {data.canvassersSummary.length === 0 ? (
          <WarmEmptyState widgetId="canvassers" />
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
      </Card>}

      {/* Turf Completion */}
      {!hidden("turf") && <Card title="Turf Completion">
        {data.turfCompletion.length === 0 ? (
          <WarmEmptyState widgetId="turf" />
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
      </Card>}

      {/* Walk List Progress & Call Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {!hidden("walk-list") && <Card title="Walk List Progress">
          {data.walkListProgress.length === 0 ? (
            <WarmEmptyState widgetId="walk-list" />
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
        </Card>}

        {/* Call List Stats */}
        {!hidden("call-stats") && <Card title="Call List Stats">
          {data.callListStats.total === 0 ? (
            <WarmEmptyState widgetId="call-stats" />
          ) : (
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
          )}
        </Card>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 3: FINANCE
   ════════════════════════════════════════════════════════ */
function FinanceMode({ data, hidden }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean }) {
  const spendPct = Math.round((data.currentSpending / Math.max(1, data.spendingLimit)) * 100);
  const overBudget = spendPct >= 80;

  return (
    <div className="space-y-4">
      {/* Donation Total */}
      {!hidden("donation-total") && (
        data.donationTotal === 0 ? <WarmEmptyState widgetId="donation-total" /> : (
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
        )
      )}

      {/* Donation Chart */}
      {!hidden("donation-chart") && <Card title="Donation Trend (Weekly)">
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
      </Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Donors */}
        {!hidden("top-donors") && <Card title="Top Donors">
          {data.topDonors.length === 0 ? (
            <WarmEmptyState widgetId="top-donors" />
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
        </Card>}

        {/* Recent Donations */}
        {!hidden("recent-donations") && <Card title="Recent Donations">
          {data.recentDonations.length === 0 ? (
            <WarmEmptyState widgetId="recent-donations" />
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
        </Card>}
      </div>

      {/* Spending vs Limit */}
      {!hidden("spending") && <Card title="Spending vs Limit">
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
      </Card>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 4: GOTV
   ════════════════════════════════════════════════════════ */
function GOTVMode({ data, hidden }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean }) {
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
      {!hidden("gotv-countdown") && <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springEnter}
        className="rounded-xl p-6 text-center text-white"
        style={{ background: NAVY }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Election Day Countdown</p>
        <AnimatedNumber value={days} className="mt-1 text-6xl font-black md:text-7xl" />
        <p className="mt-1 text-sm font-semibold text-slate-300">days remaining</p>
      </motion.div>}

      {/* Giant Voted Counter + Progress */}
      {!hidden("voted-counter") && (
        data.totalVoted === 0 && data.totalSupporters === 0 ? <WarmEmptyState widgetId="voted-counter" /> : (
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
        )
      )}

      {/* P1-P4 Breakdown */}
      {!hidden("p1p4-breakdown") && (
        data.p1Count === 0 && data.p2Count === 0 ? <WarmEmptyState widgetId="p1p4-breakdown" /> : (
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
        )
      )}

      {/* Pie Chart */}
      {!hidden("support-pie") && <Card title="Support Breakdown">
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
      </Card>}

      {/* Priority Call List */}
      {!hidden("priority-calls") && <Card title="Priority Call List">
        {data.priorityCallList.length === 0 ? (
          <WarmEmptyState widgetId="priority-calls" />
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
      </Card>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 5: WAR ROOM (Dark #0A1628)
   ════════════════════════════════════════════════════════ */
function WarRoomMode({ data, hidden }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean }) {
  const [ticker, setTicker] = useState<ActivityItem[]>(data.recentActivity);

  useEffect(() => {
    setTicker(data.recentActivity);
  }, [data.recentActivity]);

  return (
    <div className="space-y-4">
      {/* Critical numbers row */}
      {!hidden("war-numbers") && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <WarCard label="The Gap" value={data.gap} color={data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN} />
        <WarCard label="Voted" value={data.totalVoted} color={GREEN} />
        <WarCard label="Volunteers Active" value={data.volunteersActive} color={AMBER} />
        <WarCard label="Doors Today" value={data.doorsToday} color="#3B82F6" />
      </div>}

      {/* Giant gap display */}
      {!hidden("war-gap") && <motion.div
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
      </motion.div>}

      {/* All numbers at once */}
      {!hidden("war-grid") && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <WarMini label="P1" value={data.p1Count} />
        <WarMini label="P2" value={data.p2Count} />
        <WarMini label="P3" value={data.p3Count} />
        <WarMini label="P4" value={data.p4Count} />
        <WarMini label="Signs Pending" value={data.signRequestsPending} />
        <WarMini label="Days Left" value={daysUntilElection()} />
      </div>}

      {/* Activity ticker */}
      {!hidden("war-ticker") && <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Live Activity</p>
        </div>
        <div className="space-y-1">
          {ticker.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Live activity will stream here as your team works</p>
          ) : ticker.map((item, i) => (
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
      </div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 6: ELECTION NIGHT (Dark CNN-style)
   ════════════════════════════════════════════════════════ */
function ElectionNightMode({ data, hidden }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean }) {
  const total = data.candidateVotes + data.opponentVotes;
  const candPct = total > 0 ? Math.round((data.candidateVotes / total) * 100) : 0;
  const oppPct = total > 0 ? 100 - candPct : 0;
  const leading = data.candidateVotes >= data.opponentVotes;

  return (
    <div className="space-y-4">
      {/* Polls reporting */}
      {!hidden("election-polls") && <motion.div
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
      </motion.div>}

      {/* Main result */}
      {!hidden("election-result") && <motion.div
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
      </motion.div>}

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
      {!hidden("election-countdown") && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {daysUntilElection() === 0 ? "ELECTION DAY" : `${daysUntilElection()} DAYS TO GO`}
        </p>
      </div>}
    </div>
  );
}

/* ── Customize Panel (Slide-over) ─────────────────── */
function CustomizePanel({
  prefs,
  campaignType,
  saving,
  onSave,
  onClose,
}: {
  prefs: DashboardPreferences;
  campaignType: CampaignType;
  saving: boolean;
  onSave: (p: DashboardPreferences) => void;
  onClose: () => void;
}) {
  const [localPrefs, setLocalPrefs] = useState<DashboardPreferences>({ ...prefs });

  const toggleWidget = (id: StudioWidgetId) => {
    setLocalPrefs((p) => ({
      ...p,
      hiddenWidgets: p.hiddenWidgets.includes(id)
        ? p.hiddenWidgets.filter((w) => w !== id)
        : [...p.hiddenWidgets, id],
    }));
  };

  const widgetsByMode = MODES.map((m) => ({
    mode: m,
    widgets: ALL_STUDIO_WIDGETS.filter((w) => w.mode === m.id),
  }));

  const campaignTypeLabel: Record<CampaignType, string> = {
    municipal: "Municipal",
    provincial: "Provincial",
    federal: "Federal",
    by_election: "By-Election",
    other: "Other",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        style={{ minWidth: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Customize Dashboard</h2>
            <p className="text-xs text-slate-500">
              Campaign type: <span className="font-bold" style={{ color: GREEN }}>{campaignTypeLabel[campaignType]}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Default Mode */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Default Mode</label>
            <select
              value={localPrefs.defaultMode}
              onChange={(e) => setLocalPrefs((p) => ({ ...p, defaultMode: e.target.value as DashboardMode }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">This mode will load when you open the dashboard</p>
          </div>

          {/* Widgets by mode */}
          {widgetsByMode.map(({ mode, widgets }) => {
            const ModeIcon = mode.icon;
            return (
              <div key={mode.id}>
                <div className="mb-2 flex items-center gap-2">
                  <ModeIcon className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">{mode.label} Widgets</h3>
                </div>
                <div className="space-y-1">
                  {widgets.map((w) => {
                    const isRelevant = w.relevance.includes(campaignType);
                    const isHidden = localPrefs.hiddenWidgets.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWidget(w.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                          isHidden
                            ? "bg-slate-50 text-slate-400"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isHidden ? <EyeOff className="h-3.5 w-3.5 text-slate-300" /> : <Eye className="h-3.5 w-3.5" style={{ color: GREEN }} />}
                          <span className="font-semibold">{w.label}</span>
                          {!isRelevant && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                              Not typical for {campaignTypeLabel[campaignType]}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold ${isHidden ? "text-slate-300" : "text-slate-500"}`}>
                          {isHidden ? "OFF" : "ON"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4">
          <motion.button
            type="button"
            onClick={() => { onSave(localPrefs); onClose(); }}
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springTap}
            className="w-full rounded-lg py-3 text-sm font-black text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Warm Empty State with Action ─────────────────── */
function WarmEmptyState({ widgetId }: { widgetId: string }) {
  const config = EMPTY_STATE_CONFIG[widgetId];
  if (!config) return <EmptyState text="No data yet" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springEnter}
      className="rounded-xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center"
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <PlusCircle className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{config.message}</p>
      <a
        href={config.href}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: GREEN }}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        {config.action}
      </a>
    </motion.div>
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

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
