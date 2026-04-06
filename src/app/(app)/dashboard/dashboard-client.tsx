"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Users, ThumbsUp, HelpCircle, ThumbsDown, Bell, CheckSquare,
  Clock, ArrowRight, Settings, GripVertical, X, DollarSign,
  MapPin, UserCheck, Target, Phone,
  PlusCircle, Send, BarChart2, Sunrise, Sunset, CloudSun, Trophy,
  Monitor, Copy, RefreshCcw,
} from "lucide-react";
import { FunnelChart, Funnel, LabelList, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { StatCard, Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { formatRelative, fullName } from "@/lib/utils";
import { INTERACTION_TYPE_LABELS } from "@/types";
import { useMilestone } from "@/lib/hooks/useMilestone";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

/* ── Types ── */
interface OfficialInfo {
  id: string; name: string; title: string | null; district: string | null;
  level: string; isClaimed: boolean; photoUrl: string | null;
}

interface DashboardProps {
  data: {
    totalContacts: number;
    supporters: number;
    undecided: number;
    opposition: number;
    followUpsDue: number;
    notHome: number;
    pendingTasks: number;
    recentActivity: {
      id: string; action: string; entityType: string;
      details: unknown; createdAt: Date;
      user: { name: string | null; email: string | null };
    }[];
    recentInteractions: {
      id: string; type: string; notes: string | null; createdAt: Date;
      contact: { firstName: string; lastName: string };
      user: { name: string | null };
    }[];
  };
  campaign: { id: string; name: string; candidateName: string | null; electionDate: Date | null; isPublic?: boolean | null };
  user: { id: string; name?: string | null; role: string };
  official?: OfficialInfo;
}

type WidgetId =
  | "contacts" | "supporters" | "undecided" | "opposition"
  | "followups" | "tasks" | "donations" | "signs"
  | "doors" | "gotv" | "support-rate" | "recent-interactions"
  | "activity-log" | "call-progress";

interface WidgetDef {
  id: WidgetId;
  label: string;
  icon: React.ElementType;
  cols: 1 | 2 | 3;
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: "contacts",           label: "Total Contacts",       icon: Users,      cols: 1 },
  { id: "supporters",         label: "Supporters",           icon: ThumbsUp,   cols: 1 },
  { id: "undecided",          label: "Undecided",            icon: HelpCircle, cols: 1 },
  { id: "opposition",         label: "Opposition",           icon: ThumbsDown, cols: 1 },
  { id: "followups",          label: "Follow-ups Due",       icon: Bell,       cols: 1 },
  { id: "tasks",              label: "Open Tasks",           icon: CheckSquare,cols: 1 },
  { id: "donations",          label: "Donation Total",       icon: DollarSign, cols: 1 },
  { id: "signs",              label: "Sign Requests",        icon: MapPin,     cols: 1 },
  { id: "doors",              label: "Doors Knocked",        icon: UserCheck,  cols: 1 },
  { id: "gotv",               label: "GOTV Progress",        icon: Target,     cols: 1 },
  { id: "support-rate",       label: "Support Rate",         icon: ThumbsUp,   cols: 3 },
  { id: "recent-interactions",label: "Recent Interactions",  icon: Clock,      cols: 2 },
  { id: "activity-log",       label: "Activity Log",         icon: Bell,       cols: 2 },
  { id: "call-progress",      label: "Call List Progress",   icon: Phone,      cols: 2 },
];

const PRESETS: Record<string, WidgetId[]> = {
  Overview:  ["contacts","supporters","undecided","opposition","followups","tasks","support-rate","recent-interactions","activity-log"],
  "Canvass Mode": ["doors","contacts","supporters","followups","call-progress","recent-interactions","activity-log"],
  "GOTV Mode": ["gotv","supporters","undecided","doors","support-rate","call-progress","recent-interactions"],
  "Finance Mode": ["donations","contacts","signs","tasks","activity-log"],
  "Election Day Ops": ["gotv","call-progress","doors","supporters","followups","tasks","activity-log"],
  "Advance Vote Snapshot": ["gotv","support-rate","supporters","undecided","doors","recent-interactions","activity-log"],
};

const LS_KEY = "poll-city-dashboard-layout";
const MODE_KEY = "poll-city-dashboard-mode";
const DASHBOARD_TABLE_KEY = "dashboard_widgets";

function isWidgetId(value: string): value is WidgetId {
  return ALL_WIDGETS.some((w) => w.id === value);
}

function parseWidgetIds(value: unknown): WidgetId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is WidgetId => typeof entry === "string" && isWidgetId(entry));
}

function loadLayout(campaignId: string, userId: string): { order: WidgetId[]; hidden: WidgetId[]; preset: string } {
  try {
    const raw = localStorage.getItem(`${LS_KEY}-${campaignId}-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    order: PRESETS.Overview,
    hidden: [],
    preset: "Overview",
  };
}

function saveLayout(campaignId: string, userId: string, order: WidgetId[], hidden: WidgetId[], preset: string) {
  try {
    localStorage.setItem(`${LS_KEY}-${campaignId}-${userId}`, JSON.stringify({ order, hidden, preset }));
    localStorage.setItem(`${MODE_KEY}-${campaignId}-${userId}`, preset);
  } catch { /* ignore */ }
}

function actionLabel(action: string, entityType: string, details: unknown): string {
  const d = details as Record<string, string> | null;
  if (action === "logged_interaction") return `Logged ${d?.type?.replace("_", " ") ?? "interaction"} with ${d?.contactName ?? "contact"}`;
  if (action === "updated_support_level") return `Updated support: ${d?.contactName} → ${d?.to?.replace("_", " ")}`;
  if (action === "created") return `Created ${entityType} "${d?.name ?? ""}"`;
  if (action === "created_task") return `Created task: ${d?.title ?? ""}`;
  return `${action} ${entityType}`;
}

const OFFICIAL_MODE_KEY = "poll-city-official-mode";

export default function DashboardClient({ data, campaign, user, official }: DashboardProps) {
  const [order, setOrder] = useState<WidgetId[]>(PRESETS.Overview);
  const [hidden, setHidden] = useState<WidgetId[]>([]);
  const [customising, setCustomising] = useState(false);
  const [activePreset, setActivePreset] = useState("Overview");
  const [extraData, setExtraData] = useState({ donations: 0, signs: 0, doorsToday: 0, gotvPct: 0, callPct: 0 });
  const [postElectionOutcome, setPostElectionOutcome] = useState<"won" | "lost" | null>(null);
  const [officialMode, setOfficialMode] = useState(false);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [weather, setWeather] = useState<{ temp: number; wind: number; code: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ name: string; score: number; doorKnocks: number }>>([]);
  const [signCityLeaderboard, setSignCityLeaderboard] = useState<Array<{ city: string; count: number }>>([]);
  const [tick, setTick] = useState(0);
  const [showTvPanel, setShowTvPanel] = useState(false);
  const [tvToken, setTvToken] = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase());
  const [tvRotationSec, setTvRotationSec] = useState(25);
  const [tvModes, setTvModes] = useState<Record<string, boolean>>({
    "war-room": true,
    "gotv-tracker": true,
    "volunteer-leaderboard": true,
    "results-night": true,
    "social-wall": true,
    "fundraising-thermometer": true,
    "election-day-ops": true,
  });
  const [tvDisplay, setTvDisplay] = useState({ showLogo: true, showNames: true, showTicker: true });
  const dragId = useRef<WidgetId | null>(null);

  const tvSlug = useMemo(
    () => campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    [campaign.name],
  );
  const tvLink = useMemo(
    () => `/tv/${tvSlug}?token=${tvToken}&rotation=${tvRotationSec}`,
    [tvRotationSec, tvSlug, tvToken],
  );
  const maskedTvToken = useMemo(() => {
    if (!tvToken) return "";
    if (tvToken.length <= 4) return "*".repeat(tvToken.length);
    return `${tvToken.slice(0, 2)}${"*".repeat(Math.max(4, tvToken.length - 4))}${tvToken.slice(-2)}`;
  }, [tvToken]);

  async function copyTvLink() {
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${tvLink}` : tvLink;
    try {
      await navigator.clipboard.writeText(absolute);
    } catch {
      // ignore clipboard failures
    }
  }

  // Load official mode preference
  useEffect(() => {
    if (!official) return;
    try {
      const saved = localStorage.getItem(`${OFFICIAL_MODE_KEY}-${user.id}`);
      if (saved === "constituent") setOfficialMode(true);
    } catch { /* ignore */ }
  }, [official, user.id]);

  function toggleOfficialMode() {
    const next = !officialMode;
    setOfficialMode(next);
    try {
      localStorage.setItem(`${OFFICIAL_MODE_KEY}-${user.id}`, next ? "constituent" : "campaign");
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showTvPanel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowTvPanel(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showTvPanel]);

  const supportRate = data.totalContacts > 0
    ? Math.round((data.supporters / data.totalContacts) * 100)
    : 0;

  // Load layout from localStorage
  useEffect(() => {
    const saved = loadLayout(campaign.id, user.id);
    setOrder(saved.order);
    setHidden(saved.hidden);
    setActivePreset(saved.preset ?? "Overview");
  }, [campaign.id, user.id]);

  // Load server-backed layout so widget order/hide state follows user across devices
  useEffect(() => {
    async function loadServerDashboardPreferences() {
      try {
        const res = await fetch(`/api/contacts/column-preferences?campaignId=${campaign.id}&tableKey=${DASHBOARD_TABLE_KEY}`);
        if (!res.ok) return;
        const payload = await res.json();
        const pref = payload?.data;
        if (!pref) return;

        const serverOrder = parseWidgetIds(pref.order);
        const serverHidden = parseWidgetIds(pref.hidden);

        if (serverOrder.length > 0) setOrder(serverOrder);
        if (serverHidden.length >= 0) setHidden(serverHidden);
      } catch {
        // Keep local fallback behavior
      }
    }

    loadServerDashboardPreferences();
  }, [campaign.id, user.id]);

  // Best-effort server sync for dashboard layout persistence
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        await fetch("/api/contacts/column-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaign.id,
            tableKey: DASHBOARD_TABLE_KEY,
            order,
            hidden,
            widths: {},
          }),
        });
      } catch {
        // Local storage remains fallback source of truth when network sync fails
      }
    }, 350);

    return () => clearTimeout(id);
  }, [campaign.id, order, hidden]);

  // Fetch extra widget data
  useEffect(() => {
    async function loadExtra() {
      try {
        const [donRes, signRes, callRes, gotvRes, leaderboardRes] = await Promise.all([
          fetch(`/api/donations?campaignId=${campaign.id}&pageSize=1`),
          fetch(`/api/signs?campaignId=${campaign.id}&pageSize=100`),
          fetch(`/api/call-list?campaignId=${campaign.id}`),
          fetch(`/api/gotv?campaignId=${campaign.id}`),
          fetch(`/api/turf/leaderboard?campaignId=${campaign.id}`),
        ]);
        const [don, sign, call, gotv, board] = await Promise.all([
          donRes.ok ? donRes.json() : { data: { total: 0 } },
          signRes.ok ? signRes.json() : { data: [], total: 0 },
          callRes.ok ? callRes.json() : { data: { total: 0, completed: 0 } },
          gotvRes.ok ? gotvRes.json() : { data: { percentagePulled: 0 } },
          leaderboardRes.ok ? leaderboardRes.json() : { data: [] },
        ]);
        const signsByCity = (sign?.data ?? []).reduce((acc: Record<string, number>, row: { city?: string }) => {
          const city = row.city?.trim() || "Unknown";
          acc[city] = (acc[city] ?? 0) + 1;
          return acc;
        }, {});
        const topCities = Object.entries(signsByCity)
          .map(([city, count]) => ({ city, count: Number(count) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setExtraData({
          donations: don?.total ?? 0,
          signs: sign?.total ?? sign?.data?.length ?? 0,
          doorsToday: 0,
          gotvPct: Math.round(gotv?.data?.percentagePulled ?? 0),
          callPct: call?.data?.total > 0
            ? Math.round((call.data.completed / call.data.total) * 100)
            : 0,
        });
        setLeaderboard((board?.data ?? []).slice(0, 5));
        setSignCityLeaderboard(topCities);
      } catch { /* non-critical — widgets show 0 */ }
    }
    loadExtra();
  }, [campaign.id]);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=temperature_2m,wind_speed_10m,weather_code", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        setWeather({
          temp: Number(payload?.current?.temperature_2m ?? 0),
          wind: Number(payload?.current?.wind_speed_10m ?? 0),
          code: Number(payload?.current?.weather_code ?? 0),
        });
      } catch {
        setWeather(null);
      }
    }
    loadWeather();
  }, []);

  useEffect(() => {
    async function loadVolunteerCount() {
      try {
        const res = await fetch(`/api/volunteers?campaignId=${campaign.id}&pageSize=1`);
        if (!res.ok) return;
        const payload = await res.json();
        setVolunteerCount(payload?.total ?? 0);
      } catch {
        setVolunteerCount(0);
      }
    }
    loadVolunteerCount();
  }, [campaign.id]);

  const electionDate = useMemo(() => {
    return campaign.electionDate ? new Date(campaign.electionDate) : new Date("2026-10-26T20:00:00-04:00");
  }, [campaign.electionDate]);

  const timeToElection = useMemo(() => {
    const diff = Math.max(0, electionDate.getTime() - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
    };
  }, [electionDate, tick]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const countdownTone = timeToElection.days > 100 ? "text-emerald-600" : timeToElection.days > 30 ? "text-amber-600" : "text-red-600";

  const healthChecks = [
    { label: "Contacts imported", done: data.totalContacts >= 100 },
    { label: "Canvassing started", done: data.recentInteractions.length > 0 },
    { label: "Volunteers recruited", done: volunteerCount >= 5 },
    { label: "Signs deployed", done: extraData.signs > 0 },
    { label: "Notifications set up", done: data.recentActivity.some((a) => `${a.action} ${a.entityType}`.toLowerCase().includes("notification")) },
    { label: "Public page live", done: !!campaign.isPublic },
  ];

  const healthScore = Math.round((healthChecks.filter((c) => c.done).length / healthChecks.length) * 100);
  const healthTone = healthScore <= 40 ? "text-red-600" : healthScore <= 70 ? "text-amber-600" : "text-emerald-600";

  const priorities = [
    data.totalContacts < 100 ? `Import your voter list (${100 - data.totalContacts} to go)` : "Refresh and segment your contact universe",
    data.recentInteractions.length === 0 ? `Start canvassing - you have ${Math.max(50, data.totalContacts)} doors to knock` : "Review today's canvassing outcomes",
    volunteerCount < 5 ? `Recruit more volunteers (${5 - volunteerCount} short of baseline)` : "Assign next volunteer shift coverage",
    !data.recentActivity.some((a) => `${a.action} ${a.entityType}`.toLowerCase().includes("notification")) ? "Set up election-day push notifications" : "Schedule your next supporter reminder",
    !campaign.isPublic ? "Make your candidate page public" : "Update your public page hero and endorsements",
  ];

  const gotvReadiness = Math.min(100, data.totalContacts > 0 ? Math.round((data.supporters / data.totalContacts) * 100) : 0);

  // Milestone celebrations — Adoni animates when these thresholds are crossed.
  // Each milestone only fires once ever per campaign (stored in localStorage).
  useMilestone(
    "contacts",
    data.totalContacts,
    [100, 250, 500, 1000, 2500, 5000] as const,
    (v) => `${v.toLocaleString()} contacts in the database — that's a real campaign.`,
    campaign.id,
  );
  useMilestone(
    "supporters",
    data.supporters,
    [25, 50, 100, 250, 500, 1000] as const,
    (v) => `${v} confirmed supporters. Keep stacking.`,
    campaign.id,
  );
  useMilestone(
    "volunteers",
    volunteerCount,
    [5, 10, 25, 50, 100] as const,
    (v) => `${v} volunteers on board. This is how campaigns win.`,
    campaign.id,
  );
  useMilestone(
    "signs",
    extraData.signs,
    [10, 25, 50, 100, 250] as const,
    (v) => `${v} signs up — your name is in the neighbourhood.`,
    campaign.id,
  );
  useMilestone(
    "interactions",
    data.recentInteractions.length > 0 ? data.totalContacts : 0, // proxy for door count
    [100, 500, 1000, 2500, 5000] as const,
    (v) => `${v.toLocaleString()} doors knocked. Doors = votes. Keep going.`,
    campaign.id,
  );

  const ringStyle = {
    background: `conic-gradient(#2563eb ${(healthScore / 100) * 360}deg, #e5e7eb 0deg)`,
  };
  const funnelData = [
    { name: "Universe", value: data.totalContacts, fill: "#1d4ed8" },
    { name: "Supporters", value: data.supporters, fill: "#059669" },
    { name: "GOTV Pulled", value: Math.round((extraData.gotvPct / 100) * Math.max(1, data.supporters)), fill: "#d97706" },
  ];
  const sentimentData = [
    { name: "Support", value: data.supporters, color: "#10b981" },
    { name: "Undecided", value: data.undecided, color: "#f59e0b" },
    { name: "Opposition", value: data.opposition, color: "#ef4444" },
  ];

  const visibleOrder = order.filter((id) => !hidden.includes(id));

  function applyPreset(name: string) {
    const ids = PRESETS[name] ?? PRESETS.Overview;
    setOrder(ids);
    setHidden([]);
    setActivePreset(name);
    saveLayout(campaign.id, user.id, ids, [], name);
  }

  function toggleWidget(id: WidgetId) {
    const newHidden = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(newHidden);
    saveLayout(campaign.id, user.id, order, newHidden, activePreset);
  }

  function onDragStart(id: WidgetId) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, targetId: WidgetId) {
    e.preventDefault();
    if (!dragId.current || dragId.current === targetId) return;
    const from = order.indexOf(dragId.current);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    setOrder(next);
  }

  function onDrop() {
    saveLayout(campaign.id, user.id, order, hidden, activePreset);
    dragId.current = null;
  }

  /* ── Widget renderer ── */
  function renderWidget(id: WidgetId) {
    const def = ALL_WIDGETS.find((w) => w.id === id);
    if (!def) return null;

    const colSpan = def.cols === 3 ? "col-span-full" : def.cols === 2 ? "col-span-1 lg:col-span-2" : "";

    return (
      <div
        key={id}
        draggable
        onDragStart={() => onDragStart(id)}
        onDragOver={(e) => onDragOver(e, id)}
        onDrop={onDrop}
        className={`${colSpan} group relative`}
      >
        {/* Drag handle */}
        {customising && (
          <div className="absolute top-2 left-2 z-10 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {id === "contacts" && <StatCard label="Total Contacts" value={data.totalContacts} icon={<Users className="w-5 h-5" />} color="blue" />}
        {id === "supporters" && <StatCard label="Supporters" value={data.supporters} icon={<ThumbsUp className="w-5 h-5" />} color="green" />}
        {id === "undecided" && <StatCard label="Undecided" value={data.undecided} icon={<HelpCircle className="w-5 h-5" />} color="amber" />}
        {id === "opposition" && <StatCard label="Opposition" value={data.opposition} icon={<ThumbsDown className="w-5 h-5" />} color="red" />}
        {id === "followups" && <StatCard label="Follow-ups Due" value={data.followUpsDue} icon={<Bell className="w-5 h-5" />} color="amber" />}
        {id === "tasks" && <StatCard label="Open Tasks" value={data.pendingTasks} icon={<CheckSquare className="w-5 h-5" />} color="purple" />}
        {id === "donations" && <StatCard label="Donations" value={extraData.donations} icon={<DollarSign className="w-5 h-5" />} color="green" prefix="$" />}
        {id === "signs" && <StatCard label="Sign Requests" value={extraData.signs} icon={<MapPin className="w-5 h-5" />} color="blue" />}
        {id === "doors" && <StatCard label="Doors Today" value={extraData.doorsToday} icon={<UserCheck className="w-5 h-5" />} color="green" />}
        {id === "gotv" && <StatCard label="GOTV Progress" value={`${extraData.gotvPct}%`} icon={<Target className="w-5 h-5" />} color="blue" />}

        {id === "support-rate" && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Support Rate</p>
              <span className="text-sm font-bold text-gray-900">{supportRate}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${data.totalContacts > 0 ? (data.supporters / data.totalContacts) * 100 : 0}%` }} />
              <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${data.totalContacts > 0 ? (data.undecided / data.totalContacts) * 100 : 0}%` }} />
              <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${data.totalContacts > 0 ? (data.opposition / data.totalContacts) * 100 : 0}%` }} />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: "Support", color: "bg-emerald-500", count: data.supporters },
                { label: "Undecided", color: "bg-amber-400", count: data.undecided },
                { label: "Opposition", color: "bg-red-400", count: data.opposition },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-gray-500">{label} {data.totalContacts > 0 ? Math.round((count / data.totalContacts) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {id === "recent-interactions" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Recent Interactions</h3>
                <Link href="/contacts" className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentInteractions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No interactions yet</p>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {data.recentInteractions.map((i) => (
                    <div key={i.id} className="px-6 py-3 flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{fullName(i.contact.firstName, i.contact.lastName)}</p>
                        <p className="text-xs text-gray-500">
                          {INTERACTION_TYPE_LABELS[i.type as keyof typeof INTERACTION_TYPE_LABELS]} · {i.user.name ?? "Unknown"}
                        </p>
                        {i.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{i.notes}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(i.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {id === "activity-log" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900 text-sm">Activity Log</h3>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {data.recentActivity.map((log) => (
                    <div key={log.id} className="px-6 py-3">
                      <p className="text-sm text-gray-800">{actionLabel(log.action, log.entityType, log.details)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{log.user.name ?? log.user.email} · {formatRelative(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {id === "call-progress" && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Call List Progress</p>
              </div>
              <Link href="/call-list" className="text-xs text-blue-600 hover:underline">Open</Link>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${extraData.callPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{extraData.callPct}% complete</p>
          </Card>
        )}
      </div>
    );
  }

  // Constituent dashboard view (for officials in official mode)
  if (official && officialMode) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Official header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Official Mode</div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Constituent Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{official.name} · {official.title} · {official.district}</p>
          </div>
          <button
            onClick={toggleOfficialMode}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
          >
            Switch to Candidate Mode
          </button>
        </div>

        {/* Constituent stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Constituents Reached", value: data.totalContacts, color: "text-blue-600" },
            { label: "Supporter Signals", value: data.supporters, color: "text-emerald-600" },
            { label: "Questions Received", value: data.followUpsDue, color: "text-purple-600" },
            { label: "Open Tasks", value: data.pendingTasks, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Send Update", href: "/notifications/new", icon: Bell },
              { label: "View Questions", href: "/contacts?followUpNeeded=true", icon: HelpCircle },
              { label: "Post Poll", href: "/polls/new", icon: CheckSquare },
              { label: "View Sign Requests", href: "/signs", icon: MapPin },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all text-center"
              >
                <Icon className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent constituent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Interactions</h3>
              <Link href="/contacts" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {data.recentInteractions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No interactions yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentInteractions.slice(0, 5).map(i => (
                  <div key={i.id} className="px-6 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{fullName(i.contact.firstName, i.contact.lastName)}</p>
                      <p className="text-xs text-gray-500">{INTERACTION_TYPE_LABELS[i.type as keyof typeof INTERACTION_TYPE_LABELS]}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatRelative(i.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Sentiment Overview</h3>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Support", pct: data.totalContacts > 0 ? Math.round((data.supporters / data.totalContacts) * 100) : 0, color: "bg-emerald-500" },
                { label: "Undecided", pct: data.totalContacts > 0 ? Math.round((data.undecided / data.totalContacts) * 100) : 0, color: "bg-amber-400" },
                { label: "Opposition", pct: data.totalContacts > 0 ? Math.round((data.opposition / data.totalContacts) * 100) : 0, color: "bg-red-400" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-bold text-gray-900">{s.pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const electionPassed = electionDate.getTime() < Date.now();
  const daysSinceElection = electionPassed
    ? Math.floor((Date.now() - electionDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Post-election banner */}
      {electionPassed && (
        <div
          className="rounded-2xl p-5 md:p-6 text-white shadow-lg"
          style={{ background: postElectionOutcome === "won" ? "linear-gradient(135deg,#059669 0%,#10b981 100%)" : postElectionOutcome === "lost" ? "linear-gradient(135deg,#1E3A8A 0%,#475569 100%)" : "linear-gradient(135deg,#1E3A8A 0%,#7C3AED 100%)" }}
        >
          <div className="flex items-start gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
                {postElectionOutcome === "won" ? "🎉 Congratulations — You won!" : postElectionOutcome === "lost" ? "Election complete — Thank you for running" : `Election complete · ${daysSinceElection} day${daysSinceElection === 1 ? "" : "s"} ago`}
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold mt-1">
                {postElectionOutcome === "won"
                  ? "Switch to Constituent Mode — your community is counting on you."
                  : postElectionOutcome === "lost"
                    ? "You showed up. That matters. Thank your team and keep the relationships."
                    : "How did it go?"}
              </h2>
              {postElectionOutcome === null && (
                <div className="flex gap-2 mt-3">
                  <button
                    className="h-11 px-5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-400 active:scale-95 transition-transform"
                    onClick={() => setPostElectionOutcome("won")}
                  >
                    We won!
                  </button>
                  <button
                    className="h-11 px-5 rounded-lg bg-white/20 text-white font-bold hover:bg-white/30 active:scale-95 transition-transform"
                    onClick={() => setPostElectionOutcome("lost")}
                  >
                    We didn&apos;t win
                  </button>
                </div>
              )}
              {postElectionOutcome && (
                <p className="text-sm text-blue-100 mt-1">
                  {postElectionOutcome === "won"
                    ? "File your financial return within 120 days. Your voter database is now your constituent CRM."
                    : "Export your contacts, send a thank-you, and file your return within 120 days."}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                className="h-11 px-4 rounded-lg bg-white text-blue-900 font-bold hover:bg-blue-50"
                onClick={() => (window.location.href = "/communications/email?template=thank-you")}
              >
                Send thank-you
              </button>
              <button
                className="h-11 px-4 rounded-lg border-2 border-white/40 text-white font-bold hover:bg-white/10"
                onClick={() => (window.location.href = "/import-export")}
              >
                Export contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
          <p className="text-xs text-gray-400 mt-1">Active stock view: {activePreset}</p>
        </div>
        <div className="flex items-center gap-2">
          {official && (
            <button
              onClick={toggleOfficialMode}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Official View
            </button>
          )}
          <button
            onClick={() => setCustomising(!customising)}
            className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              customising
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            {customising ? "Done" : "Customise"}
          </button>
          <button
            onClick={() => setShowTvPanel(true)}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Monitor className="w-4 h-4" />
            TV Mode
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Campaign overview map</h2>
        </CardHeader>
        <CardContent>
          <CampaignMap mode="dashboard" height={320} showControls />
        </CardContent>
      </Card>

      {showTvPanel && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowTvPanel(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-200 p-5 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">TV Mode</h2>
              <button onClick={() => setShowTvPanel(false)} className="rounded-md p-1 hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <a
              href={tvLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open TV Mode in new tab
            </a>

            <p className="mt-3 text-xs text-gray-500">Casting: Chromecast, AirPlay, HDMI, or Smart TV browser.</p>

            <button
              onClick={copyTvLink}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" />
              Copy TV link
            </button>

            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Mode selection</p>
              {Object.keys(tvModes).map((key) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <span>{key.replace(/-/g, " ")}</span>
                  <input
                    type="checkbox"
                    checked={tvModes[key]}
                    onChange={(e) => setTvModes((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-900">Rotation speed: {tvRotationSec}s</p>
              <input
                type="range"
                min={10}
                max={90}
                value={tvRotationSec}
                onChange={(e) => setTvRotationSec(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Display options</p>
              {[
                ["showLogo", "Show logo"],
                ["showNames", "Show names"],
                ["showTicker", "Show activity ticker"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={tvDisplay[key as keyof typeof tvDisplay]}
                    onChange={(e) => setTvDisplay((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-900">Security</p>
              <p className="mt-1 text-xs text-red-700">Token: {maskedTvToken}</p>
              <p className="mt-1 text-[11px] text-red-600">Token value is masked in UI. Use copy link for sharing.</p>
              <button
                onClick={() => setTvToken(Math.random().toString(36).slice(2, 10).toUpperCase())}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Regenerate token
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Industry Standard Views</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Overview",
            "Canvass Mode",
            "GOTV Mode",
            "Finance Mode",
            "Election Day Ops",
            "Advance Vote Snapshot",
          ].map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                activePreset === name
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* War-room overview */}
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-center gap-2 mb-1 text-blue-700 text-xs font-semibold uppercase tracking-wide">
            {hour < 18 ? <Sunrise className="w-4 h-4" /> : <Sunset className="w-4 h-4" />}
            Campaign War Room
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">{greeting} {user.name ? user.name.split(" ")[0] : "George"}.</h2>
          <p className="text-sm text-gray-600 mt-1">Your election is in {timeToElection.days} days. Here is where your campaign stands today.</p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Campaign health score</p>
                <p className={`text-2xl font-black ${healthTone}`}>{healthScore}%</p>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full transition-all duration-700 ${healthScore <= 40 ? "bg-red-500" : healthScore <= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${healthScore}%` }} />
              </div>
              <div className="space-y-1.5">
                {healthChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{check.label}</span>
                    <span className={check.done ? "text-emerald-600 font-semibold" : "text-gray-400"}>{check.done ? "Done" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Election day countdown</p>
              <p className={`text-3xl font-black ${countdownTone}`}>{timeToElection.days}d {timeToElection.hours}h {timeToElection.minutes}m</p>
              <p className="text-xs text-gray-500 mt-1">to October 26, 2026</p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">GOTV readiness</p>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" style={{ width: `${gotvReadiness}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{gotvReadiness}% toward 80% target</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Today's priorities</p>
          <ul className="space-y-2">
            {priorities.map((item) => (
              <li key={item} className="text-sm text-gray-700 rounded-lg bg-gray-50 px-3 py-2">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Health Gauge</p>
          <div className="mt-3 flex items-center justify-center">
            <div className="grid h-36 w-36 place-items-center rounded-full" style={ringStyle}>
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
                <p className="text-2xl font-black text-gray-900">{healthScore}%</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">Weighted on data readiness, field activity, and public presence.</p>
          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
            <p className="font-semibold">Election Clock</p>
            <p>{timeToElection.days}d {timeToElection.hours}h {timeToElection.minutes}m remaining</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-3">
          <div className="mb-2 flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Weather + GOTV</p>
          </div>
          <p className="text-sm font-semibold text-gray-900">Field Conditions</p>
          <p className="mt-1 text-xs text-gray-500">
            {weather ? `${weather.temp.toFixed(1)}C, wind ${weather.wind.toFixed(1)} km/h` : "Weather feed unavailable"}
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>GOTV pull-through</span>
              <span className="font-semibold text-gray-800">{extraData.gotvPct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${extraData.gotvPct}%` }} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Call Progress</p>
              <p className="text-lg font-bold text-gray-900">{extraData.callPct}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Donation Entries</p>
              <p className="text-lg font-bold text-gray-900">{extraData.donations}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conversion Funnel</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#1f2937" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500">Universe to supporter to mobilized-voter trajectory.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sentiment Donut</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62}>
                  {sentimentData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span>{item.name}</span>
                <span className="font-semibold text-gray-900">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-6">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Canvasser Leaderboard</p>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No leaderboard data yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {leaderboard.map((row, idx) => (
                <div key={row.name + idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">#{idx + 1} {row.name}</p>
                    <p className="text-xs text-gray-500">{row.doorKnocks} door knocks</p>
                  </div>
                  <p className="text-lg font-black text-blue-700">{row.score}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sign Map (By City)</p>
          {signCityLeaderboard.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No sign requests geocoded yet.</p>
          ) : (
            <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
              {signCityLeaderboard.map((entry) => (
                <div key={entry.city}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{entry.city}</span>
                    <span className="font-bold text-gray-900">{entry.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (entry.count / Math.max(1, signCityLeaderboard[0].count)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "Add Contact", href: "/contacts", icon: PlusCircle, hotkey: "G C" },
          { label: "Record Door Knock", href: "/canvassing/walk", icon: UserCheck, hotkey: "G W" },
          { label: "Request Sign", href: "/signs", icon: MapPin, hotkey: "S" },
          { label: "Add Volunteer", href: "/volunteers", icon: Users, hotkey: "G V" },
          { label: "Send Notification", href: "/notifications", icon: Send, hotkey: "G N" },
          { label: "View Analytics", href: "/analytics", icon: BarChart2, hotkey: "G D" },
        ].map(({ label, href, icon: Icon, hotkey }) => (
          <Link key={label} href={href} className="rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition-colors p-3">
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-4 h-4 text-blue-700" />
              <span className="text-[10px] text-gray-400 font-semibold">{hotkey}</span>
            </div>
            <p className="text-xs font-semibold text-gray-700">{label}</p>
          </Link>
        ))}
      </div>

      {/* Customise panel */}
      {customising && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
          {/* Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">Layout Presets / Modes</p>
              <button
                onClick={() => applyPreset("Overview")}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                title="Reset to default overview"
              >
                Reset layout
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => applyPreset(name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    activePreset === name
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {/* Widget toggles */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Show / Hide Widgets</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ALL_WIDGETS.map((w) => {
                const isHidden = hidden.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      isHidden
                        ? "bg-white border-gray-200 text-gray-400"
                        : "bg-white border-blue-200 text-gray-800"
                    }`}
                  >
                    <span>{w.label}</span>
                    {isHidden ? (
                      <span className="text-[10px] text-gray-300 font-bold">OFF</span>
                    ) : (
                      <X className="w-3 h-3 text-gray-400 hover:text-red-500 transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500">Drag widgets to reorder. Layout is saved to your browser.</p>
        </div>
      )}

      {/* Follow-up alert */}
      {data.followUpsDue > 0 && !hidden.includes("followups") && (
        <Link href="/contacts?followUpNeeded=true" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
          <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {data.followUpsDue} follow-up{data.followUpsDue !== 1 ? "s" : ""} overdue
          </p>
          <ArrowRight className="w-3.5 h-3.5 text-amber-600 ml-auto" />
        </Link>
      )}

      {/* Widget grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Single-col stats */}
        {visibleOrder
          .filter((id) => ALL_WIDGETS.find((w) => w.id === id)?.cols === 1)
          .map((id) => renderWidget(id))}
      </div>

      {/* Multi-col widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleOrder
          .filter((id) => {
            const cols = ALL_WIDGETS.find((w) => w.id === id)?.cols ?? 1;
            return cols > 1;
          })
          .map((id) => renderWidget(id))}
      </div>
    </div>
  );
}
