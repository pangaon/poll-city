"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  LayoutDashboard,
  Loader2,
  Map,
  MapPin,
  Moon,
  Phone,
  Plus,
  PlusCircle,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Vote,
  X,
  Zap,
  Target,
  Gauge,
  Layers,
  Hash,
  Calendar,
  FileText,
  MessageSquare,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import AnimatedNumber from "@/components/dashboard/animated-number";

const LiveInsightMap = dynamic(() => import("@/components/dashboard/live-insight-map"), { ssr: false });

/* ── Brand colours ─────────────────────────────────── */
const BLUE = "#2563EB";
const NAVY = "#0F172A";
const GREEN = "#16A34A";
const EMERALD = "#059669";
const AMBER = "#D97706";
const RED = "#DC2626";
const VIOLET = "#7C3AED";
const WAR_BG = "#0A1628";

/* ── Election date ─────────────────────────────────── */
const ELECTION_DATE = new Date("2026-10-26T00:00:00");

function daysUntilElection(): number {
  const now = new Date();
  const diff = ELECTION_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/* ── Transitions ───────────────────────────────────── */
const springTap = { type: "spring" as const, stiffness: 400, damping: 30 };
const springEnter = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ── Mode definitions ──────────────────────────────── */
type DashboardMode = "overview" | "field-ops" | "finance" | "gotv" | "war-room" | "election-night";

const MODES: { id: DashboardMode; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: BLUE },
  { id: "field-ops", label: "Field Ops", icon: MapPin, color: EMERALD },
  { id: "finance", label: "Finance", icon: DollarSign, color: VIOLET },
  { id: "gotv", label: "GOTV", icon: Target, color: GREEN },
  { id: "war-room", label: "War Room", icon: Shield, color: RED },
  { id: "election-night", label: "Election Night", icon: Moon, color: AMBER },
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

type StudioWidgetId = "gap" | "stat-cards" | "activity" | "canvassers" | "turf" | "walk-list" | "call-stats"
  | "donation-total" | "donation-chart" | "top-donors" | "recent-donations" | "spending"
  | "gotv-countdown" | "voted-counter" | "p1p4-breakdown" | "support-pie" | "priority-calls"
  | "war-numbers" | "war-gap" | "war-grid" | "war-ticker"
  | "election-polls" | "election-result" | "election-countdown"
  | "live-map" | "health-score" | "quick-actions" | "funnel";


interface StudioWidget {
  id: StudioWidgetId;
  label: string;
  mode: DashboardMode;
  relevance: CampaignType[];
}

const ALL_STUDIO_WIDGETS: StudioWidget[] = [
  { id: "gap", label: "The Gap", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "stat-cards", label: "Stat Cards", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "live-map", label: "Live Insight Map", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "health-score", label: "Campaign Health", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "quick-actions", label: "Quick Actions", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "activity", label: "Recent Activity Feed", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "canvassers", label: "Canvasser Summary", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "turf", label: "Turf Completion", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "walk-list", label: "Walk List Progress", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "call-stats", label: "Call List Stats", mode: "field-ops", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "donation-total", label: "Donation Total", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "donation-chart", label: "Donation Trend", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "top-donors", label: "Top Donors", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "recent-donations", label: "Recent Donations", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
  { id: "spending", label: "Spending vs Limit", mode: "finance", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "gotv-countdown", label: "Election Countdown", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "voted-counter", label: "Supporters Voted", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "p1p4-breakdown", label: "P1-P4 Breakdown", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "support-pie", label: "Support Breakdown", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "priority-calls", label: "Priority Call List", mode: "gotv", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-numbers", label: "War Room Numbers", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-gap", label: "War Room Gap", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-grid", label: "War Room Grid", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "war-ticker", label: "Live Ticker", mode: "war-room", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-polls", label: "Polls Reporting", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-result", label: "Election Results", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "election-countdown", label: "Election Counter", mode: "election-night", relevance: ["municipal", "provincial", "federal", "by_election"] },
  { id: "funnel", label: "Campaign Funnel", mode: "overview", relevance: ["municipal", "provincial", "federal", "by_election", "other"] },
];

/* ── Custom Widget Types ──────────────────────────── */
type CustomWidgetType = "metric" | "progress" | "counter" | "list" | "comparison";

interface CustomWidget {
  id: string;
  title: string;
  type: CustomWidgetType;
  dataSource: string; // key from DashboardData or derived
  color: string;
  mode: DashboardMode;
  format?: "number" | "currency" | "percent";
  target?: number; // for progress type
  compareKey?: string; // for comparison type
}

const CUSTOM_WIDGET_SOURCES: Array<{ key: string; label: string; category: string }> = [
  { key: "confirmedSupporters", label: "Confirmed Supporters", category: "Contacts" },
  { key: "doorsToday", label: "Doors Knocked Today", category: "Field" },
  { key: "volunteersActive", label: "Active Volunteers", category: "Team" },
  { key: "signRequestsPending", label: "Sign Requests", category: "Field" },
  { key: "gap", label: "The Gap", category: "GOTV" },
  { key: "supportersVoted", label: "Supporters Voted", category: "GOTV" },
  { key: "totalVoted", label: "Total Voted", category: "GOTV" },
  { key: "totalSupporters", label: "Total Supporters", category: "GOTV" },
  { key: "donationTotal", label: "Total Donations", category: "Finance" },
  { key: "currentSpending", label: "Current Spending", category: "Finance" },
  { key: "spendingLimit", label: "Spending Limit", category: "Finance" },
  { key: "p1Count", label: "P1 (Strong Support)", category: "GOTV" },
  { key: "p2Count", label: "P2 (Leaning Support)", category: "GOTV" },
  { key: "p3Count", label: "P3 (Undecided)", category: "GOTV" },
  { key: "p4Count", label: "P4 (Against)", category: "GOTV" },
  { key: "healthScore", label: "Health Score", category: "Campaign" },
  { key: "candidateVotes", label: "Candidate Votes", category: "Election" },
  { key: "opponentVotes", label: "Opponent Votes", category: "Election" },
  { key: "pollsReporting", label: "Polls Reporting", category: "Election" },
  { key: "callListStats.total", label: "Total Calls", category: "Phone" },
  { key: "callListStats.completed", label: "Calls Completed", category: "Phone" },
  { key: "callListStats.reached", label: "Contacts Reached", category: "Phone" },
];

const WIDGET_COLORS = [
  { value: "#2563EB", label: "Blue" },
  { value: "#16A34A", label: "Green" },
  { value: "#DC2626", label: "Red" },
  { value: "#D97706", label: "Amber" },
  { value: "#7C3AED", label: "Violet" },
  { value: "#059669", label: "Emerald" },
  { value: "#0F172A", label: "Navy" },
  { value: "#EC4899", label: "Pink" },
];

/* ── Preferences ──────────────────────────────────── */
const OVERVIEW_DEFAULT_ORDER: StudioWidgetId[] = ["health-score", "gap", "stat-cards", "funnel", "live-map", "quick-actions", "activity"];

interface DashboardPreferences {
  defaultMode: DashboardMode;
  hiddenWidgets: StudioWidgetId[];
  customWidgets: CustomWidget[];
  widgetOrder: Partial<Record<DashboardMode, StudioWidgetId[]>>;
  widgetSizes: Record<string, "half" | "full">;
}

const DEFAULT_PREFS: DashboardPreferences = {
  defaultMode: "overview",
  hiddenWidgets: [],
  customWidgets: [],
  widgetOrder: { overview: OVERVIEW_DEFAULT_ORDER },
  widgetSizes: {},
};
const PREFS_LS_KEY = "pc-dash-prefs";

function loadPrefsFromLS(campaignId: string): DashboardPreferences {
  try {
    const raw = localStorage.getItem(`${PREFS_LS_KEY}-${campaignId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
      return {
        defaultMode: parsed.defaultMode ?? DEFAULT_PREFS.defaultMode,
        hiddenWidgets: Array.isArray(parsed.hiddenWidgets) ? parsed.hiddenWidgets : [],
        customWidgets: Array.isArray(parsed.customWidgets) ? parsed.customWidgets : [],
        widgetOrder: parsed.widgetOrder ?? { overview: OVERVIEW_DEFAULT_ORDER },
        widgetSizes: parsed.widgetSizes ?? {},
      };
    }
  } catch (e) { /* graceful degradation */ }
  return DEFAULT_PREFS;
}

function savePrefsToLS(campaignId: string, prefs: DashboardPreferences) {
  try { localStorage.setItem(`${PREFS_LS_KEY}-${campaignId}`, JSON.stringify(prefs)); } catch (e) { /* graceful degradation */ }
}

/* ── Empty states ─────────────────────────────────── */
const EMPTY_STATE: Record<string, { msg: string; action: string; href: string }> = {
  gap: { msg: "No supporter data yet", action: "Import contacts", href: "/contacts/import" },
  "stat-cards": { msg: "Stats appear as data comes in", action: "Add a supporter", href: "/contacts/new" },
  activity: { msg: "No recent activity", action: "Invite a volunteer", href: "/volunteers" },
  canvassers: { msg: "No canvasser activity", action: "Set up canvassing", href: "/canvassing" },
  turf: { msg: "No turfs created yet", action: "Create a turf", href: "/canvassing" },
  "walk-list": { msg: "No walk lists assigned", action: "Set up canvassing", href: "/canvassing" },
  "call-stats": { msg: "No calls made yet", action: "Start calling", href: "/contacts" },
  "donation-total": { msg: "No donations yet", action: "Log a donation", href: "/donations" },
  "donation-chart": { msg: "Trends appear after first donations", action: "Log a donation", href: "/donations" },
  "top-donors": { msg: "Top donors appear here", action: "Log a donation", href: "/donations" },
  "recent-donations": { msg: "No recent donations", action: "Log a donation", href: "/donations" },
  spending: { msg: "Track spending against limits", action: "Log an expense", href: "/budget" },
  "gotv-countdown": { msg: "Election countdown active", action: "View GOTV", href: "/gotv" },
  "voted-counter": { msg: "No supporters voted yet", action: "Import contacts", href: "/contacts/import" },
  "p1p4-breakdown": { msg: "No support levels recorded", action: "Set up canvassing", href: "/canvassing" },
  "support-pie": { msg: "Support breakdown after canvassing", action: "Start canvassing", href: "/canvassing" },
  "priority-calls": { msg: "No priority calls needed", action: "View contacts", href: "/contacts" },
};

/* ── Data types ───────────────────────────────────── */
type DashboardData = {
  gap: number;
  supportersVoted: number;
  confirmedSupporters: number;
  doorsToday: number;
  volunteersActive: number;
  signRequestsPending: number;
  recentActivity: ActivityItem[];
  canvassersSummary: CanvasserSummary[];
  turfCompletion: TurfRow[];
  walkListProgress: WalkListRow[];
  callListStats: { total: number; completed: number; reached: number };
  donationTotal: number;
  spendingLimit: number;
  currentSpending: number;
  donationChart: ChartPoint[];
  topDonors: DonorRow[];
  recentDonations: DonationItem[];
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p4Count: number;
  totalVoted: number;
  totalSupporters: number;
  priorityCallList: CallItem[];
  candidateVotes: number;
  opponentVotes: number;
  candidateName: string;
  opponentName: string;
  pollsReporting: number;
  totalPolls: number;
  pollResults: PollResult[];
  healthScore: number;
  grade: string;
  funnelData: { stage: string; count: number; pct: number }[] | null;
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
  gap: 0, supportersVoted: 0, confirmedSupporters: 0, doorsToday: 0,
  volunteersActive: 0, signRequestsPending: 0, recentActivity: [],
  canvassersSummary: [], turfCompletion: [], walkListProgress: [],
  callListStats: { total: 0, completed: 0, reached: 0 },
  donationTotal: 0, spendingLimit: 0, currentSpending: 0,
  donationChart: [], topDonors: [], recentDonations: [],
  p1Count: 0, p2Count: 0, p3Count: 0, p4Count: 0,
  totalVoted: 0, totalSupporters: 0, priorityCallList: [],
  candidateVotes: 0, opponentVotes: 0,
  candidateName: "Our Candidate", opponentName: "Opponent",
  pollsReporting: 0, totalPolls: 0, pollResults: [],
  healthScore: 0, grade: "–",
  funnelData: null,
};

/* ── Quick Actions ────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: "Import Contacts", icon: Upload, href: "/contacts/import", color: "bg-blue-50 text-blue-600" },
  { label: "Log Donation", icon: DollarSign, href: "/donations", color: "bg-emerald-50 text-emerald-600" },
  { label: "Send Message", icon: MessageSquare, href: "/communications", color: "bg-violet-50 text-violet-600" },
  { label: "Create Event", icon: Calendar, href: "/events", color: "bg-amber-50 text-amber-600" },
  { label: "Add Volunteer", icon: Users, href: "/volunteers", color: "bg-pink-50 text-pink-600" },
  { label: "View Reports", icon: BarChart3, href: "/reports", color: "bg-slate-100 text-slate-600" },
];

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function DashboardStudio({ campaignId, campaignName, campaignLogoUrl, campaignType = "municipal" }: DashboardStudioProps) {
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showWidgetBuilder, setShowWidgetBuilder] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

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
              customWidgets: Array.isArray(stored.customWidgets) ? stored.customWidgets : [],
              widgetOrder: stored.widgetOrder ?? { overview: OVERVIEW_DEFAULT_ORDER },
              widgetSizes: stored.widgetSizes ?? {},
            };
            setPrefs(p);
            savePrefsToLS(campaignId, p);
            setPrefsLoaded(true);
            return;
          }
        }
      } catch (e) { /* graceful degradation */ }
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
    } catch (e) { /* graceful degradation */ }
    setSavingPrefs(false);
  }, [campaignId]);

  /* Data fetching — every 10s */
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const [health, gotv, election, morning, volunteers, donations, signs, activity, turfs, callList, priorityList, funnel] = await Promise.all([
          fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/gotv/summary?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/election-night?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/briefing?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/volunteers/performance?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/donations?campaignId=${campaignId}&pageSize=100`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/signs?campaignId=${campaignId}&pageSize=100`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/activity/live-feed?campaignId=${campaignId}&limit=20`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/turf?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/call-list?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/gotv/priority-list?campaignId=${campaignId}&tier=P1&limit=10`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/funnel/metrics?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;

        // ── Donations ───────────────────────────────────────────
        const donationRecords: any[] = donations?.data ?? [];
        const receivedGroup = donations?.totalsByStatus?.find((g: any) => g.status === "received");
        const computedDonationTotal = Number(receivedGroup?._sum?.amount ?? 0);

        const computedRecentDonations: DonationItem[] = donationRecords.slice(0, 5).map((d: any) => ({
          id: d.id,
          name: d.contact ? `${d.contact.firstName ?? ""} ${d.contact.lastName ?? ""}`.trim() || "Anonymous" : "Anonymous",
          amount: Number(d.amount ?? 0),
          time: relativeTime(d.createdAt),
        }));

        const donorMap: Record<string, number> = {};
        for (const d of donationRecords) {
          const name = d.contact ? `${d.contact.firstName ?? ""} ${d.contact.lastName ?? ""}`.trim() || "Anonymous" : "Anonymous";
          donorMap[name] = (donorMap[name] ?? 0) + Number(d.amount ?? 0);
        }
        const computedTopDonors: DonorRow[] = Object.entries(donorMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Donation chart — group received donations by month (last 6 months)
        const now = new Date();
        const computedDonationChart: ChartPoint[] = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const label = d.toLocaleString("default", { month: "short" });
          const amount = donationRecords
            .filter((r: any) => {
              const rd = new Date(r.createdAt);
              return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
            })
            .reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0);
          return { label, amount };
        });

        // ── Signs ────────────────────────────────────────────────
        const signRecords: any[] = signs?.data ?? [];
        const computedSignsPending = signRecords.filter((s: any) => s.status === "requested").length;

        // ── Activity feed ────────────────────────────────────────
        const feedItems: any[] = activity?.feed ?? [];
        const computedActivity: ActivityItem[] = feedItems.slice(0, 20).map((f: any) => ({
          id: f.id,
          text: f.message,
          time: relativeTime(f.time),
          type: (f.category === "donation" ? "donation" : f.category === "gotv" ? "door" : f.category === "canvass" ? "door" : "signup") as ActivityItem["type"],
        }));

        // ── Volunteers / Field Ops ────────────────────────────────
        const leaderboard: any[] = volunteers?.leaderboard ?? [];
        const computedCanvassersSummary: CanvasserSummary[] = leaderboard.slice(0, 8).map((v: any) => ({
          name: v.name ?? "Unknown",
          doors: v.doorsThisWeek ?? v.doorsTotal ?? 0,
          ids: v.supportersFound ?? 0,
          commits: v.doorsTotal > 0 ? Math.round(((v.supportersFound ?? 0) / v.doorsTotal) * 100) : 0,
        }));

        const computedWalkListProgress: WalkListRow[] = leaderboard.slice(0, 6).map((v: any) => ({
          volunteer: v.name ?? "Unknown",
          assigned: v.doorsTotal ?? 0,
          completed: v.doorsThisWeek ?? 0,
        }));

        // ── Turf completion ──────────────────────────────────────
        const turfRecords: any[] = turfs?.data ?? [];
        const computedTurfCompletion: TurfRow[] = turfRecords.slice(0, 8).map((t: any) => {
          const pct = t.status === "completed" ? 100 : t.status === "in_progress" ? 50 : t.status === "assigned" ? 10 : 0;
          return { name: t.name ?? t.ward ?? "Turf", percent: pct };
        });

        // ── Call list stats ──────────────────────────────────────
        const callRecords: any[] = callList?.data ?? [];
        const computedCallListStats = {
          total: callRecords.length,
          completed: callRecords.filter((c: any) => c.status === "completed").length,
          reached: callRecords.filter((c: any) => c.status === "completed" || c.status === "reached").length,
        };

        // ── Priority call list (P1 + P2 contacts with phones) ────
        const p1Contacts: any[] = priorityList?.contacts ?? priorityList?.data ?? [];
        const computedPriorityCallList: CallItem[] = p1Contacts
          .filter((c: any) => c.phone)
          .slice(0, 10)
          .map((c: any) => ({
            name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unknown",
            phone: c.phone,
            priority: (c.tier === 1 ? "P1" : "P2") as "P1" | "P2",
          }));

        setData((prev) => ({
          ...prev,
          gap: gotv?.gap ?? election?.gap ?? prev.gap,
          supportersVoted: gotv?.supportersVoted ?? election?.supportersVoted ?? prev.supportersVoted,
          confirmedSupporters: gotv?.confirmedSupporters ?? election?.confirmedSupporters ?? prev.confirmedSupporters,
          doorsToday: morning?.yesterday?.doorsKnocked ?? prev.doorsToday,
          volunteersActive: volunteers?.summary?.active ?? (leaderboard.filter((v: any) => v.status === "active" || v.status === "star").length || prev.volunteersActive),
          signRequestsPending: computedSignsPending || prev.signRequestsPending,
          recentActivity: computedActivity.length > 0 ? computedActivity : prev.recentActivity,
          canvassersSummary: computedCanvassersSummary.length > 0 ? computedCanvassersSummary : prev.canvassersSummary,
          turfCompletion: computedTurfCompletion.length > 0 ? computedTurfCompletion : prev.turfCompletion,
          walkListProgress: computedWalkListProgress.length > 0 ? computedWalkListProgress : prev.walkListProgress,
          callListStats: computedCallListStats.total > 0 ? computedCallListStats : prev.callListStats,
          donationChart: computedDonationChart,
          p1Count: gotv?.p1Count ?? prev.p1Count,
          p2Count: gotv?.p2Count ?? prev.p2Count,
          p3Count: gotv?.p3Count ?? prev.p3Count,
          p4Count: gotv?.p4Count ?? prev.p4Count,
          totalVoted: gotv?.supportersVoted ?? prev.totalVoted,
          totalSupporters: gotv?.confirmedSupporters ?? prev.totalSupporters,
          priorityCallList: computedPriorityCallList.length > 0 ? computedPriorityCallList : prev.priorityCallList,
          candidateVotes: election?.candidateVotes ?? prev.candidateVotes,
          opponentVotes: election?.opponentVotes ?? prev.opponentVotes,
          pollsReporting: election?.pollsReporting ?? prev.pollsReporting,
          totalPolls: election?.totalPolls ?? prev.totalPolls,
          donationTotal: computedDonationTotal || prev.donationTotal,
          recentDonations: computedRecentDonations.length > 0 ? computedRecentDonations : prev.recentDonations,
          topDonors: computedTopDonors.length > 0 ? computedTopDonors : prev.topDonors,
          healthScore: health?.healthScore ?? prev.healthScore,
          grade: health?.grade ?? prev.grade,
          funnelData: funnel?.stages ?? prev.funnelData,
        }));
        setLastRefresh(new Date());
      } catch (e) { /* graceful degradation */ }
      if (!cancelled) setLoading(false);
    }
    pull();
    const timer = setInterval(pull, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [campaignId]);

  const isDark = mode === "war-room" || mode === "election-night";
  const currentModeInfo = MODES.find((m) => m.id === mode)!;

  return (
    <div
      className={isDark ? "rounded-xl -m-3 sm:-m-4 md:-m-6 p-4 min-h-full" : "space-y-4"}
      style={isDark ? { background: mode === "war-room" ? WAR_BG : "#0D1117", color: "#F0F6FC" } : undefined}
    >
      {/* ─── Header ──────────────────────────────────────── */}
      <div className={isDark
        ? "rounded-xl border border-white/10 bg-white/5 p-4"
        : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      }>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {campaignLogoUrl ? (
              <img src={campaignLogoUrl} alt={campaignName} className="h-11 w-11 rounded-xl object-cover shadow-sm border border-slate-200/50" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm" style={{ backgroundColor: currentModeInfo.color }}>
                {campaignName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                {campaignName}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {daysUntilElection()} days to election
                </span>
                {lastRefresh && (
                  <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Updated {lastRefresh.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWidgetBuilder(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Widget
            </button>
            <button
              onClick={() => setShowCustomize(true)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                isDark
                  ? "border border-white/10 text-slate-300 hover:bg-white/10"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Customize
            </button>
            <select
              value={mode}
              onChange={(e) => switchMode(e.target.value as DashboardMode)}
              className="block sm:hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            >
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mt-3 hidden gap-1 overflow-x-auto sm:flex">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? isDark
                      ? "bg-white/10 text-white"
                      : "text-white shadow-sm"
                    : isDark
                      ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
                style={active && !isDark ? { backgroundColor: m.color } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────── */}
      <div>
        {/* Customize Panel */}
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

        {/* Widget Builder */}
        <AnimatePresence>
          {showWidgetBuilder && (
            <WidgetBuilderPanel
              currentMode={mode}
              onAdd={(widget) => {
                const newPrefs = { ...prefs, customWidgets: [...prefs.customWidgets, widget] };
                savePreferences(newPrefs);
              }}
              onClose={() => setShowWidgetBuilder(false)}
            />
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Shimmer key={i} h={100} dark={isDark} />)}
            </div>
            <Shimmer h={400} dark={isDark} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springEnter}
            >
              {mode === "overview" && <OverviewMode
                data={data}
                campaignId={campaignId}
                hidden={isWidgetHidden}
                customWidgets={prefs.customWidgets.filter((w) => w.mode === "overview")}
                onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })}
                widgetOrder={prefs.widgetOrder.overview ?? OVERVIEW_DEFAULT_ORDER}
                widgetSizes={prefs.widgetSizes}
                onReorder={(newOrder) => savePreferences({ ...prefs, widgetOrder: { ...prefs.widgetOrder, overview: newOrder } })}
                onResize={(id, size) => savePreferences({ ...prefs, widgetSizes: { ...prefs.widgetSizes, [id]: size } })}
              />}
              {mode === "field-ops" && <FieldOpsMode data={data} hidden={isWidgetHidden} customWidgets={prefs.customWidgets.filter((w) => w.mode === "field-ops")} onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })} />}
              {mode === "finance" && <FinanceMode data={data} hidden={isWidgetHidden} customWidgets={prefs.customWidgets.filter((w) => w.mode === "finance")} onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })} />}
              {mode === "gotv" && <GOTVMode data={data} hidden={isWidgetHidden} customWidgets={prefs.customWidgets.filter((w) => w.mode === "gotv")} onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })} />}
              {mode === "war-room" && <WarRoomMode data={data} hidden={isWidgetHidden} customWidgets={prefs.customWidgets.filter((w) => w.mode === "war-room")} onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })} />}
              {mode === "election-night" && <ElectionNightMode data={data} campaignId={campaignId} hidden={isWidgetHidden} customWidgets={prefs.customWidgets.filter((w) => w.mode === "election-night")} onRemoveWidget={(id) => savePreferences({ ...prefs, customWidgets: prefs.customWidgets.filter((w) => w.id !== id) })} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   FUNNEL WIDGET
   ════════════════════════════════════════════════════════ */
const FUNNEL_COLORS: Record<string, string> = {
  unknown: "#94a3b8",
  contact: "#3b82f6",
  supporter: "#10b981",
  volunteer: "#8b5cf6",
  donor: "#f59e0b",
  voter: "#ef4444",
};
const FUNNEL_LABELS: Record<string, string> = {
  unknown: "Unknown",
  contact: "Contact",
  supporter: "Supporter",
  volunteer: "Volunteer",
  donor: "Donor",
  voter: "Voter",
};

function FunnelWidget({ data, campaignId }: { data: DashboardData; campaignId: string }) {
  const stages = data.funnelData;
  if (!stages) return <EmptyWidget id="funnel" compact />;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign Funnel</p>
        <a href={`/contacts?campaignId=${campaignId}`} className="text-[10px] text-blue-500 hover:underline">View all →</a>
      </div>
      <div className="space-y-2">
        {stages.filter((s) => s.stage !== "unknown").map((s) => (
          <a key={s.stage} href={`/contacts?campaignId=${campaignId}&funnelStage=${s.stage}`} className="block group">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-slate-500 w-16 flex-shrink-0">{FUNNEL_LABELS[s.stage] ?? s.stage}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full transition-all group-hover:opacity-80"
                  style={{ backgroundColor: FUNNEL_COLORS[s.stage] ?? "#6b7280" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((s.count / maxCount) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700 w-10 text-right">{s.count.toLocaleString()}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SORTABLE WIDGET WRAPPER
   ════════════════════════════════════════════════════════ */
interface SortableWidgetProps {
  id: StudioWidgetId;
  size: "half" | "full";
  onResize: (id: StudioWidgetId, size: "half" | "full") => void;
  children: React.ReactNode;
}

function SortableWidget({ id, size, onResize, children }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: size === "full" ? "1 / -1" : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Widget controls bar — visible on hover */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onResize(id, size === "full" ? "half" : "full")}
          title={size === "full" ? "Shrink to half width" : "Expand to full width"}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {size === "full" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="flex items-center justify-center w-6 h-6 rounded-md bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 1: OVERVIEW — Enterprise Command View
   ════════════════════════════════════════════════════════ */
function OverviewMode({
  data,
  campaignId,
  hidden,
  customWidgets,
  onRemoveWidget,
  widgetOrder,
  widgetSizes,
  onReorder,
  onResize,
}: {
  data: DashboardData;
  campaignId: string;
  hidden: (id: StudioWidgetId) => boolean;
  customWidgets: CustomWidget[];
  onRemoveWidget: (id: string) => void;
  widgetOrder: StudioWidgetId[];
  widgetSizes: Record<string, "half" | "full">;
  onReorder: (newOrder: StudioWidgetId[]) => void;
  onResize: (id: StudioWidgetId, size: "half" | "full") => void;
}) {
  const days = daysUntilElection();
  const greeting = getGreeting();
  const hasData = data.confirmedSupporters > 0 || data.doorsToday > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Build a full ordered list — any ids in the stored order first, then any new ones appended
  const orderedIds = useMemo(() => {
    const base = OVERVIEW_DEFAULT_ORDER;
    const stored = widgetOrder;
    const inOrder = stored.filter((id) => base.includes(id));
    const missing = base.filter((id) => !inOrder.includes(id));
    return [...inOrder, ...missing];
  }, [widgetOrder]);

  // Only the visible (non-hidden) ids
  const visibleIds = useMemo(
    () => orderedIds.filter((id) => !hidden(id as StudioWidgetId)),
    [orderedIds, hidden]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id as StudioWidgetId);
    const newIndex = orderedIds.indexOf(over.id as StudioWidgetId);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(orderedIds, oldIndex, newIndex));
  }

  // Stat cards — filter to visible metrics
  const statCards: Array<{ label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }> = [];
  if (hasData) {
    statCards.push({ label: "Confirmed Supporters", value: data.confirmedSupporters, icon: Users, color: GREEN });
    statCards.push({ label: "Doors Today", value: data.doorsToday, icon: MapPin, color: BLUE });
    statCards.push({ label: "Active Volunteers", value: data.volunteersActive, icon: Zap, color: AMBER });
    statCards.push({ label: "Sign Requests", value: data.signRequestsPending, icon: Activity, color: RED });
  }

  function renderWidget(id: StudioWidgetId) {
    const size = widgetSizes[id] ?? "half";

    switch (id) {
      case "health-score":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springEnter}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign Health</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.healthScore >= 70 ? "bg-green-50 text-green-700" : data.healthScore >= 40 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{data.grade}</span>
              </div>
              <AnimatedNumber value={data.healthScore} className="text-4xl font-black text-slate-900" />
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: data.healthScore >= 70 ? GREEN : data.healthScore >= 40 ? AMBER : RED }} initial={{ width: 0 }} animate={{ width: `${data.healthScore}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{greeting} — {days} days to go</p>
            </motion.div>
          </SortableWidget>
        );

      case "gap":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            {hasData ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springEnter, delay: 0.05 }}
                className="rounded-xl p-5 text-white relative overflow-hidden h-full" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1E293B 100%)` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">The Gap</p>
                <div className="flex items-end gap-4 mt-1">
                  <AnimatedNumber value={data.gap} className="text-6xl font-black leading-none" />
                  <div className="mb-1">
                    <p className="text-xs text-slate-400">{data.supportersVoted.toLocaleString()} voted / {data.confirmedSupporters.toLocaleString()} supporters</p>
                    <div className="mt-1.5 h-2 w-48 overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.round((data.supportersVoted / Math.max(1, data.confirmedSupporters)) * 100))}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : <EmptyWidget id="gap" />}
          </SortableWidget>
        );

      case "stat-cards":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <div>
              {statCards.length > 0 ? (
                <div className={`grid grid-cols-2 lg:grid-cols-${statCards.length} gap-3`}>
                  {statCards.map((sc) => <MetricCard key={sc.label} label={sc.label} value={sc.value} icon={sc.icon} color={sc.color} />)}
                </div>
              ) : <EmptyWidget id="stat-cards" />}
            </div>
          </SortableWidget>
        );

      case "funnel":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springEnter}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <FunnelWidget data={data} campaignId={campaignId} />
            </motion.div>
          </SortableWidget>
        );

      case "live-map":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Intelligence Map</h3>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>
                </div>
                <Link href="/canvassing" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">Full map <ArrowUpRight className="w-3 h-3" /></Link>
              </div>
              <div className="h-[380px]"><LiveInsightMap campaignId={campaignId} /></div>
            </div>
          </SortableWidget>
        );

      case "quick-actions":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link key={a.label} href={a.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.color}`}><Icon className="w-4 h-4" /></div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{a.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </SortableWidget>
        );

      case "activity":
        return (
          <SortableWidget key={id} id={id} size={size} onResize={onResize}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Activity</h3>
                <Link href="/reports" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">View all</Link>
              </div>
              {data.recentActivity.length === 0 ? <EmptyWidget id="activity" compact /> : (
                <div className="space-y-1.5">
                  {data.recentActivity.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springEnter, delay: i * 0.03 }}
                      className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <ActivityDot type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 leading-snug">{item.text}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </SortableWidget>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Custom Widgets (not sortable with standard widgets) */}
      {customWidgets.length > 0 && (
        <div className={`grid grid-cols-2 ${customWidgets.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"} ${customWidgets.length >= 4 ? "xl:grid-cols-4" : ""} gap-3`}>
          {customWidgets.map((cw) => (
            <CustomWidgetCard key={cw.id} widget={cw} data={data} onRemove={() => onRemoveWidget(cw.id)} />
          ))}
        </div>
      )}

      {/* Sortable standard widgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-2 gap-4">
            {visibleIds.map((id) => renderWidget(id))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 2: FIELD OPS
   ════════════════════════════════════════════════════════ */
function FieldOpsMode({ data, hidden, customWidgets, onRemoveWidget }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean; customWidgets: CustomWidget[]; onRemoveWidget: (id: string) => void }) {
  return (
    <div className="space-y-5">
      {customWidgets.length > 0 && <CustomWidgetGrid widgets={customWidgets} data={data} onRemove={onRemoveWidget} />}
      {!hidden("canvassers") && (
        <Panel title="Canvasser Activity">
          {data.canvassersSummary.length === 0 ? <EmptyWidget id="canvassers" compact /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Canvasser</th>
                    <th className="pb-2 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Doors</th>
                    <th className="pb-2 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">IDs</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Commits</th>
                  </tr>
                </thead>
                <tbody>
                  {data.canvassersSummary.map((row, i) => (
                    <motion.tr key={row.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springEnter, delay: i * 0.04 }} className="border-t border-slate-100">
                      <td className="py-2.5 pr-4 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-600 tabular-nums">{row.doors}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-600 tabular-nums">{row.ids}</td>
                      <td className="py-2.5 font-bold tabular-nums" style={{ color: GREEN }}>{row.commits}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {!hidden("turf") && (
        <Panel title="Turf Completion">
          {data.turfCompletion.length === 0 ? <EmptyWidget id="turf" compact /> : (
            <div className="space-y-3">
              {data.turfCompletion.map((turf, i) => (
                <motion.div key={turf.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springEnter, delay: i * 0.03 }}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{turf.name}</span>
                    <span className="font-bold tabular-nums" style={{ color: turf.percent >= 80 ? GREEN : turf.percent >= 50 ? AMBER : RED }}>{turf.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: turf.percent >= 80 ? GREEN : turf.percent >= 50 ? AMBER : RED }} initial={{ width: 0 }} animate={{ width: `${turf.percent}%` }} transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.04 }} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {!hidden("walk-list") && (
          <Panel title="Walk List Progress">
            {data.walkListProgress.length === 0 ? <EmptyWidget id="walk-list" compact /> : (
              <div className="space-y-3">
                {data.walkListProgress.map((row) => {
                  const pct = Math.round((row.completed / Math.max(1, row.assigned)) * 100);
                  return (
                    <div key={row.volunteer}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800">{row.volunteer}</span>
                        <span className="text-slate-500 tabular-nums">{row.completed}/{row.assigned}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: BLUE }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {!hidden("call-stats") && (
          <Panel title="Call List Stats">
            {data.callListStats.total === 0 ? <EmptyWidget id="call-stats" compact /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><AnimatedNumber value={data.callListStats.total} className="text-2xl font-black text-slate-900" /><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Total</p></div>
                  <div><AnimatedNumber value={data.callListStats.completed} className="text-2xl font-black" style={{ color: GREEN }} /><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Completed</p></div>
                  <div><AnimatedNumber value={data.callListStats.reached} className="text-2xl font-black" style={{ color: BLUE }} /><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Reached</p></div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: GREEN }} initial={{ width: 0 }} animate={{ width: `${Math.round((data.callListStats.completed / Math.max(1, data.callListStats.total)) * 100)}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 3: FINANCE
   ════════════════════════════════════════════════════════ */
function FinanceMode({ data, hidden, customWidgets, onRemoveWidget }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean; customWidgets: CustomWidget[]; onRemoveWidget: (id: string) => void }) {
  const spendPct = Math.round((data.currentSpending / Math.max(1, data.spendingLimit)) * 100);

  return (
    <div className="space-y-5">
      {!hidden("donation-total") && (
        data.donationTotal === 0 ? <EmptyWidget id="donation-total" /> : (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={springEnter}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Total Raised</p>
            <AnimatedNumber value={data.donationTotal} className="mt-1 text-5xl font-black md:text-6xl" format={(v) => `$${v.toLocaleString()}`} />
          </motion.div>
        )
      )}

      {!hidden("donation-chart") && (
        <Panel title="Donation Trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.donationChart}>
                <defs>
                  <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={EMERALD} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={((value: number) => [`$${value.toLocaleString()}`, "Amount"]) as never} />
                <Area type="monotone" dataKey="amount" stroke={EMERALD} fill="url(#donGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {!hidden("top-donors") && (
          <Panel title="Top Donors">
            {data.topDonors.length === 0 ? <EmptyWidget id="top-donors" compact /> : (
              <div className="space-y-2">
                {data.topDonors.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: NAVY }}>{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-800">{d.name}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: GREEN }}>${d.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {!hidden("recent-donations") && (
          <Panel title="Recent Donations">
            {data.recentDonations.length === 0 ? <EmptyWidget id="recent-donations" compact /> : (
              <div className="space-y-2">
                {data.recentDonations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                    <div><p className="text-xs font-semibold text-slate-800">{d.name}</p><p className="text-[10px] text-slate-400">{d.time}</p></div>
                    <span className="text-sm font-black" style={{ color: GREEN }}>${d.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      {!hidden("spending") && (
        <Panel title="Spending vs Limit">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-600">${data.currentSpending.toLocaleString()} of ${data.spendingLimit.toLocaleString()}</span>
            <span className="font-black" style={{ color: spendPct >= 80 ? RED : GREEN }}>{spendPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: spendPct >= 80 ? RED : GREEN }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, spendPct)}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
          </div>
          {spendPct >= 80 && <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Approaching spending limit</p>}
        </Panel>
      )}

      {customWidgets.length > 0 && <CustomWidgetGrid widgets={customWidgets} data={data} onRemove={onRemoveWidget} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 4: GOTV
   ════════════════════════════════════════════════════════ */
function GOTVMode({ data, hidden, customWidgets, onRemoveWidget }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean; customWidgets: CustomWidget[]; onRemoveWidget: (id: string) => void }) {
  const days = daysUntilElection();
  const votedPct = Math.round((data.totalVoted / Math.max(1, data.totalSupporters)) * 100);
  const pieData = [
    { name: "P1 Strong", value: data.p1Count, color: GREEN },
    { name: "P2 Leaning", value: data.p2Count, color: BLUE },
    { name: "P3 Undecided", value: data.p3Count, color: AMBER },
    { name: "P4 Against", value: data.p4Count, color: RED },
  ];

  return (
    <div className="space-y-5">
      {!hidden("gotv-countdown") && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={springEnter}
          className="rounded-xl p-6 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1E293B 100%)` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Election Day Countdown</p>
          <AnimatedNumber value={days} className="mt-1 text-7xl font-black" />
          <p className="mt-1 text-sm font-medium text-slate-400">days remaining</p>
        </motion.div>
      )}

      {!hidden("voted-counter") && (
        data.totalVoted === 0 && data.totalSupporters === 0 ? <EmptyWidget id="voted-counter" /> : (
          <Panel title="Supporters Voted">
            <div className="text-center">
              <AnimatedNumber value={data.totalVoted} className="text-5xl font-black" style={{ color: GREEN }} />
              <span className="ml-2 text-xl font-semibold text-slate-400">/ {data.totalSupporters.toLocaleString()}</span>
            </div>
            <div className="mx-auto mt-4 max-w-md">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: GREEN }} initial={{ width: 0 }} animate={{ width: `${votedPct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
              </div>
              <p className="mt-1.5 text-center text-xs font-semibold text-slate-500">{votedPct}% turned out</p>
            </div>
          </Panel>
        )
      )}

      {!hidden("p1p4-breakdown") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {pieData.map((seg) => (
            <motion.div key={seg.name} whileHover={{ scale: 1.02, y: -2 }} transition={springTap} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="mx-auto mb-2 h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <AnimatedNumber value={seg.value} className="text-2xl font-black text-slate-900" />
              <p className="mt-1 text-[10px] font-semibold text-slate-500">{seg.name}</p>
            </motion.div>
          ))}
        </div>
      )}

      {!hidden("support-pie") && (
        <Panel title="Support Breakdown">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
                  {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={((v: number) => [v.toLocaleString(), ""]) as never} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {!hidden("priority-calls") && (
        <Panel title="Priority Call List">
          {data.priorityCallList.length === 0 ? <EmptyWidget id="priority-calls" compact /> : (
            <div className="space-y-2">
              {data.priorityCallList.map((call, i) => (
                <div key={`${call.name}-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: call.priority === "P1" ? GREEN : BLUE }}>{call.priority}</span>
                    <span className="text-xs font-semibold text-slate-800">{call.name}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{call.phone}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {customWidgets.length > 0 && <CustomWidgetGrid widgets={customWidgets} data={data} onRemove={onRemoveWidget} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 5: WAR ROOM
   ════════════════════════════════════════════════════════ */
function WarRoomMode({ data, hidden, customWidgets, onRemoveWidget }: { data: DashboardData; hidden: (id: StudioWidgetId) => boolean; customWidgets: CustomWidget[]; onRemoveWidget: (id: string) => void }) {
  return (
    <div className="space-y-4">
      {!hidden("war-numbers") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DarkCard label="The Gap" value={data.gap} color={data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN} />
          <DarkCard label="Voted" value={data.totalVoted} color={GREEN} />
          <DarkCard label="Volunteers" value={data.volunteersActive} color={AMBER} />
          <DarkCard label="Doors Today" value={data.doorsToday} color={BLUE} />
        </div>
      )}

      {!hidden("war-gap") && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={springEnter}
          className="rounded-xl border border-white/10 p-8 text-center" style={{ background: "linear-gradient(135deg, #0A2342 0%, #0A1628 100%)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">THE GAP</p>
          <AnimatedNumber value={data.gap} className="text-[80px] font-black leading-none lg:text-[100px]" style={{ color: data.gap > 500 ? RED : data.gap >= 100 ? AMBER : GREEN }} />
          <div className="mx-auto mt-4 max-w-sm h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: GREEN }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.round((data.totalVoted / Math.max(1, data.totalSupporters)) * 100))}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
          </div>
        </motion.div>
      )}

      {!hidden("war-grid") && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "P1", value: data.p1Count },
            { label: "P2", value: data.p2Count },
            { label: "P3", value: data.p3Count },
            { label: "P4", value: data.p4Count },
            { label: "Signs", value: data.signRequestsPending },
            { label: "Days", value: daysUntilElection() },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <AnimatedNumber value={m.value} className="text-xl font-black text-white" />
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {!hidden("war-ticker") && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Activity</p>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Activity will stream here as your team works</p>
          ) : (
            <div className="space-y-1.5">
              {data.recentActivity.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...springEnter, delay: i * 0.04 }} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 shrink-0">{item.time}</span>
                  <span className="text-slate-300">{item.text}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MODE 6: ELECTION NIGHT — CNN-Style
   ════════════════════════════════════════════════════════ */
function ElectionNightMode({ data, campaignId, hidden, customWidgets, onRemoveWidget }: { data: DashboardData; campaignId: string; hidden: (id: StudioWidgetId) => boolean; customWidgets: CustomWidget[]; onRemoveWidget: (id: string) => void }) {
  const total = data.candidateVotes + data.opponentVotes;
  const candPct = total > 0 ? Math.round((data.candidateVotes / total) * 100) : 0;
  const oppPct = total > 0 ? 100 - candPct : 0;
  const leading = data.candidateVotes >= data.opponentVotes;

  return (
    <div className="space-y-4">
      {/* LIVE Banner */}
      {!hidden("election-polls") && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">LIVE — Election Night</span>
          </div>
          <span className="text-sm font-bold text-slate-300">
            <span className="text-white text-lg font-black">{data.pollsReporting}</span>
            <span className="text-slate-500"> / {data.totalPolls} polls reporting</span>
          </span>
        </div>
      )}

      {/* Result Board */}
      {!hidden("election-result") && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={springEnter}
          className="overflow-hidden rounded-xl border border-white/10" style={{ background: "linear-gradient(135deg, #0D1117 0%, #161B22 100%)" }}>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{data.candidateName}</p>
                <AnimatedNumber value={data.candidateVotes} className="mt-2 text-5xl font-black lg:text-6xl" style={{ color: leading ? GREEN : "#4B5563" }} />
                <p className="mt-2 text-3xl font-black" style={{ color: leading ? GREEN : "#4B5563" }}>{candPct}%</p>
                {leading && <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 uppercase tracking-wider">Leading</span>}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{data.opponentName}</p>
                <AnimatedNumber value={data.opponentVotes} className="mt-2 text-5xl font-black lg:text-6xl" style={{ color: !leading ? RED : "#4B5563" }} />
                <p className="mt-2 text-3xl font-black" style={{ color: !leading ? RED : "#4B5563" }}>{oppPct}%</p>
                {!leading && <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 uppercase tracking-wider">Leading</span>}
              </div>
            </div>
            <div className="mt-8 flex h-10 overflow-hidden rounded-full">
              <motion.div className="flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: GREEN }} initial={{ width: "50%" }} animate={{ width: `${candPct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                {candPct > 15 && `${candPct}%`}
              </motion.div>
              <motion.div className="flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: RED }} initial={{ width: "50%" }} animate={{ width: `${oppPct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                {oppPct > 15 && `${oppPct}%`}
              </motion.div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-white/5 px-6 py-4 text-center">
            <p className="text-sm text-slate-400">
              {leading ? data.candidateName : data.opponentName} leads by{" "}
              <span className="font-black text-xl text-white">{Math.abs(data.candidateVotes - data.opponentVotes).toLocaleString()}</span> votes
            </p>
          </div>
        </motion.div>
      )}

      {/* Election Night Map */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Results Map</h3>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
        <div className="h-[400px]">
          <LiveInsightMap campaignId={campaignId} />
        </div>
      </div>

      {/* Poll Results Table */}
      {data.pollResults.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Poll-by-Poll Results</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Poll</th>
                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{data.candidateName}</th>
                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{data.opponentName}</th>
                <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.pollResults.map((p) => (
                <tr key={p.pollId} className="border-b border-white/5">
                  <td className="px-4 py-2 font-bold text-slate-300">{p.pollId}</td>
                  <td className="px-4 py-2 font-semibold tabular-nums" style={{ color: p.candidate > p.opponent ? GREEN : "#6B7280" }}>{p.candidate}</td>
                  <td className="px-4 py-2 font-semibold tabular-nums" style={{ color: p.opponent > p.candidate ? RED : "#6B7280" }}>{p.opponent}</td>
                  <td className="px-4 py-2">
                    {p.reporting
                      ? <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">Reported</span>
                      : <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hidden("election-countdown") && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {daysUntilElection() === 0 ? "ELECTION DAY" : `${daysUntilElection()} DAYS TO GO`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Customize Panel ──────────────────────────────── */
function CustomizePanel({
  prefs, campaignType, saving, onSave, onClose,
}: {
  prefs: DashboardPreferences; campaignType: CampaignType; saving: boolean;
  onSave: (p: DashboardPreferences) => void; onClose: () => void;
}) {
  const [lp, setLp] = useState<DashboardPreferences>({ ...prefs });

  const toggle = (id: StudioWidgetId) => {
    setLp((p) => ({
      ...p,
      hiddenWidgets: p.hiddenWidgets.includes(id) ? p.hiddenWidgets.filter((w) => w !== id) : [...p.hiddenWidgets, id],
    }));
  };

  const widgetsByMode = MODES.map((m) => ({ mode: m, widgets: ALL_STUDIO_WIDGETS.filter((w) => w.mode === m.id) }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customize Dashboard</h2>
            <p className="text-xs text-slate-500">Toggle widgets and set your default view</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Default Mode</label>
            <select value={lp.defaultMode} onChange={(e) => setLp((p) => ({ ...p, defaultMode: e.target.value as DashboardMode }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700">
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          {widgetsByMode.map(({ mode, widgets }) => {
            const Icon = mode.icon;
            return (
              <div key={mode.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{mode.label}</h3>
                </div>
                <div className="space-y-1">
                  {widgets.map((w) => {
                    const isHidden = lp.hiddenWidgets.includes(w.id);
                    return (
                      <button key={w.id} onClick={() => toggle(w.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-colors ${isHidden ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-slate-800"}`}>
                        <div className="flex items-center gap-2">
                          {isHidden ? <EyeOff className="h-3.5 w-3.5 text-slate-300" /> : <Eye className="h-3.5 w-3.5 text-blue-600" />}
                          <span className="font-semibold">{w.label}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isHidden ? "text-slate-300" : "text-blue-600"}`}>{isHidden ? "OFF" : "ON"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4">
          <button onClick={() => { onSave(lp); onClose(); }} disabled={saving}
            className="w-full rounded-lg py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Widget Builder Panel ─────────────────────────── */
function WidgetBuilderPanel({ currentMode, onAdd, onClose }: { currentMode: DashboardMode; onAdd: (w: CustomWidget) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CustomWidgetType>("metric");
  const [dataSource, setDataSource] = useState(CUSTOM_WIDGET_SOURCES[0].key);
  const [color, setColor] = useState(WIDGET_COLORS[0].value);
  const [format, setFormat] = useState<"number" | "currency" | "percent">("number");
  const [target, setTarget] = useState<number>(0);
  const [compareKey, setCompareKey] = useState(CUSTOM_WIDGET_SOURCES[1].key);
  const [targetMode, setTargetMode] = useState<DashboardMode>(currentMode);
  const [addedCount, setAddedCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  /* Tell Adoni (and any other floating UI) to step aside */
  useEffect(() => {
    window.dispatchEvent(new Event("pollcity:right-panel-open"));
    return () => { window.dispatchEvent(new Event("pollcity:right-panel-close")); };
  }, []);

  /* Auto-fill title when data source is selected */
  function selectDataSource(key: string) {
    setDataSource(key);
    const label = CUSTOM_WIDGET_SOURCES.find((s) => s.key === key)?.label ?? "";
    if (!title || CUSTOM_WIDGET_SOURCES.some((s) => s.label === title)) {
      setTitle(label);
    }
  }

  function handleAdd() {
    const resolvedTitle = title.trim() || (CUSTOM_WIDGET_SOURCES.find((s) => s.key === dataSource)?.label ?? "Widget");
    const widget: CustomWidget = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: resolvedTitle,
      type,
      dataSource,
      color,
      mode: targetMode,
      format,
      ...(type === "progress" && target > 0 ? { target } : {}),
      ...(type === "comparison" ? { compareKey } : {}),
    };
    onAdd(widget);
    setLastAdded(resolvedTitle);
    setAddedCount((n) => n + 1);
    // Reset for next widget — keep mode/type/format preferences
    setTitle("");
    setDataSource(CUSTOM_WIDGET_SOURCES[0].key);
    setColor(WIDGET_COLORS[0].value);
    setTarget(0);
  }

  function handleDone() {
    onClose();
  }

  const categories = Array.from(new Set(CUSTOM_WIDGET_SOURCES.map((s) => s.category)));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Widgets</h2>
            <p className="text-xs text-slate-500">
              {addedCount > 0
                ? `${addedCount} widget${addedCount !== 1 ? "s" : ""} added — keep going or click Done`
                : "Pick a metric, add as many as you want. They auto-arrange."}
            </p>
          </div>
          <button onClick={handleDone} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {lastAdded && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            &ldquo;{lastAdded}&rdquo; added to your dashboard
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Widget Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Supporter Conversion Rate"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Widget Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {([
                { id: "metric" as const, label: "Metric", icon: Hash },
                { id: "progress" as const, label: "Progress", icon: Gauge },
                { id: "counter" as const, label: "Counter", icon: TrendingUp },
                { id: "list" as const, label: "Stat Card", icon: BarChart3 },
                { id: "comparison" as const, label: "Compare", icon: Layers },
              ]).map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setType(t.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-[10px] font-semibold transition-colors border ${
                      type === t.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                    }`}>
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Source */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Data Source</label>
            {categories.map((cat) => (
              <div key={cat} className="mb-2">
                <p className="text-[10px] font-semibold text-slate-400 mb-1">{cat}</p>
                <div className="flex flex-wrap gap-1">
                  {CUSTOM_WIDGET_SOURCES.filter((s) => s.category === cat).map((s) => (
                    <button key={s.key} onClick={() => selectDataSource(s.key)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        dataSource === s.key ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Compare key (for comparison type) */}
          {type === "comparison" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Compare With</label>
              <select value={compareKey} onChange={(e) => setCompareKey(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm">
                {CUSTOM_WIDGET_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          )}

          {/* Target (for progress type) */}
          {type === "progress" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Target Value</label>
              <input type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} placeholder="e.g. 5000"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
          )}

          {/* Format */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Number Format</label>
            <div className="flex gap-2">
              {(["number", "currency", "percent"] as const).map((f) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                    format === f ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {WIDGET_COLORS.map((c) => (
                <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c.value ? "border-slate-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }} />
              ))}
            </div>
          </div>

          {/* Dashboard Mode */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Show On</label>
            <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as DashboardMode)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm">
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 space-y-2">
          <button onClick={handleAdd}
            className="w-full rounded-lg py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            + Add Widget
          </button>
          {addedCount > 0 && (
            <button onClick={handleDone}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Done — close builder
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Custom Widget Rendering ─────────────────────── */

function resolveDataValue(data: DashboardData, key: string): number {
  if (key.includes(".")) {
    const [obj, field] = key.split(".");
    const nested = (data as Record<string, unknown>)[obj];
    if (nested && typeof nested === "object") return Number((nested as Record<string, unknown>)[field] ?? 0);
    return 0;
  }
  return Number((data as Record<string, unknown>)[key] ?? 0);
}

function formatWidgetValue(value: number, format?: string): string {
  if (format === "currency") return `$${value.toLocaleString()}`;
  if (format === "percent") return `${value}%`;
  return value.toLocaleString();
}

function CustomWidgetCard({ widget, data, onRemove }: { widget: CustomWidget; data: DashboardData; onRemove: () => void }) {
  const value = resolveDataValue(data, widget.dataSource);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div whileHover={{ y: -2 }} transition={springTap} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative group">
      {/* Remove button */}
      <button onClick={() => setShowMenu(!showMenu)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
        <X className="w-3 h-3" />
      </button>
      {showMenu && (
        <div className="absolute top-8 right-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
          <button onClick={() => { onRemove(); setShowMenu(false); }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 w-full text-left font-semibold">Remove widget</button>
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{widget.title}</p>

      {widget.type === "metric" && (
        <AnimatedNumber value={value} className="text-3xl font-black text-slate-900" format={(v) => formatWidgetValue(v, widget.format)} />
      )}

      {widget.type === "counter" && (
        <div className="flex items-end gap-2">
          <AnimatedNumber value={value} className="text-3xl font-black" style={{ color: widget.color }} format={(v) => formatWidgetValue(v, widget.format)} />
          <TrendingUp className="w-4 h-4 mb-1" style={{ color: widget.color }} />
        </div>
      )}

      {widget.type === "progress" && (
        <div>
          <div className="flex items-end gap-1 mb-2">
            <AnimatedNumber value={value} className="text-2xl font-black text-slate-900" format={(v) => formatWidgetValue(v, widget.format)} />
            {widget.target && <span className="text-xs text-slate-400 mb-0.5">/ {formatWidgetValue(widget.target, widget.format)}</span>}
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: widget.color }}
              initial={{ width: 0 }} animate={{ width: `${Math.min(100, widget.target ? Math.round((value / widget.target) * 100) : 0)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }} />
          </div>
          {widget.target && <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{Math.round((value / widget.target) * 100)}% of target</p>}
        </div>
      )}

      {widget.type === "list" && (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${widget.color}15` }}>
            <Hash className="w-5 h-5" style={{ color: widget.color }} />
          </div>
          <div>
            <AnimatedNumber value={value} className="text-2xl font-black text-slate-900" format={(v) => formatWidgetValue(v, widget.format)} />
            <p className="text-[10px] text-slate-500">{CUSTOM_WIDGET_SOURCES.find((s) => s.key === widget.dataSource)?.label ?? widget.dataSource}</p>
          </div>
        </div>
      )}

      {widget.type === "comparison" && (() => {
        const compareValue = resolveDataValue(data, widget.compareKey ?? "");
        const total = value + compareValue;
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <AnimatedNumber value={value} className="text-2xl font-black" style={{ color: widget.color }} format={(v) => formatWidgetValue(v, widget.format)} />
                <p className="text-[10px] text-slate-400">{CUSTOM_WIDGET_SOURCES.find((s) => s.key === widget.dataSource)?.label}</p>
              </div>
              <div className="text-right">
                <AnimatedNumber value={compareValue} className="text-2xl font-black text-slate-400" format={(v) => formatWidgetValue(v, widget.format)} />
                <p className="text-[10px] text-slate-400">{CUSTOM_WIDGET_SOURCES.find((s) => s.key === widget.compareKey)?.label}</p>
              </div>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <motion.div className="h-full" style={{ backgroundColor: widget.color }} initial={{ width: "50%" }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
              <motion.div className="h-full bg-slate-200" initial={{ width: "50%" }} animate={{ width: `${100 - pct}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
            </div>
          </div>
        );
      })()}

      <div className="mt-2 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: widget.color }} />
        <span className="text-[9px] font-medium text-slate-400">Custom</span>
      </div>
    </motion.div>
  );
}

function CustomWidgetGrid({ widgets, data, onRemove }: { widgets: CustomWidget[]; data: DashboardData; onRemove: (id: string) => void }) {
  const cols = widgets.length === 1 ? "" : widgets.length === 2 ? "sm:grid-cols-2" : widgets.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {widgets.map((w) => <CustomWidgetCard key={w.id} widget={w} data={data} onRemove={() => onRemove(w.id)} />)}
    </div>
  );
}

/* ── Shared Components ────────────────────────────── */

function MetricCard({ label, value, icon: Icon, color, trend }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; trend?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={springTap} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {trend && <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{trend}</span>}
      </div>
      <AnimatedNumber value={value} className="text-2xl font-black text-slate-900" />
      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
    </motion.div>
  );
}

function Panel({ title, children, dark }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-xl border border-white/10 bg-white/5 p-5" : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"}>
      <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-slate-500" : "text-slate-400"}`}>{title}</h3>
      {children}
    </div>
  );
}

function DarkCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={springTap} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <AnimatedNumber value={value} className="text-3xl font-black" style={{ color }} />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </motion.div>
  );
}

function EmptyWidget({ id, compact }: { id: string; compact?: boolean }) {
  const config = EMPTY_STATE[id];
  if (!config) return null;
  return (
    <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? "p-4" : "p-8"}`}>
      <PlusCircle className={`mx-auto text-slate-300 ${compact ? "h-5 w-5 mb-1" : "h-8 w-8 mb-2"}`} />
      <p className={`font-semibold text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>{config.msg}</p>
      <Link href={config.href} className={`mt-2 inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 ${compact ? "text-[10px]" : "text-xs"}`}>
        <PlusCircle className="h-3 w-3" />
        {config.action}
      </Link>
    </div>
  );
}

function ActivityDot({ type }: { type: ActivityItem["type"] }) {
  const map = { door: BLUE, call: GREEN, donation: AMBER, signup: VIOLET };
  return <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: map[type] }} />;
}

function Shimmer({ h, dark }: { h: number; dark: boolean }) {
  return (
    <div style={{ height: h }} className={`w-full rounded-xl animate-pulse ${dark ? "bg-white/5" : "bg-slate-200/50"}`} />
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
