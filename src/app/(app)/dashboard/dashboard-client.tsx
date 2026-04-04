"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, ThumbsUp, HelpCircle, ThumbsDown, Bell, CheckSquare,
  Clock, ArrowRight, Settings, GripVertical, X, DollarSign,
  MapPin, UserCheck, Target, Phone,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { formatRelative, fullName } from "@/lib/utils";
import { INTERACTION_TYPE_LABELS } from "@/types";

/* ── Types ── */
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
  campaign: { name: string; candidateName: string | null; electionDate: Date | null };
  user: { id: string; name?: string | null; role: string };
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
  "Field View": ["contacts","supporters","doors","followups","tasks","gotv","support-rate","recent-interactions"],
  "Finance View": ["contacts","donations","signs","tasks","activity-log"],
  "GOTV View": ["contacts","supporters","undecided","doors","gotv","support-rate","recent-interactions"],
};

const LS_KEY = "poll-city-dashboard-layout";

function loadLayout(userId: string): { order: WidgetId[]; hidden: WidgetId[] } {
  try {
    const raw = localStorage.getItem(`${LS_KEY}-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    order: PRESETS.Overview,
    hidden: [],
  };
}

function saveLayout(userId: string, order: WidgetId[], hidden: WidgetId[]) {
  try {
    localStorage.setItem(`${LS_KEY}-${userId}`, JSON.stringify({ order, hidden }));
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

export default function DashboardClient({ data, campaign, user }: DashboardProps) {
  const [order, setOrder] = useState<WidgetId[]>(PRESETS.Overview);
  const [hidden, setHidden] = useState<WidgetId[]>([]);
  const [customising, setCustomising] = useState(false);
  const [activePreset, setActivePreset] = useState("Overview");
  const [extraData, setExtraData] = useState({ donations: 0, signs: 0, doorsToday: 0, gotvPct: 0, callPct: 0 });
  const dragId = useRef<WidgetId | null>(null);

  const supportRate = data.totalContacts > 0
    ? Math.round((data.supporters / data.totalContacts) * 100)
    : 0;

  // Load layout from localStorage
  useEffect(() => {
    const saved = loadLayout(user.id);
    setOrder(saved.order);
    setHidden(saved.hidden);
  }, [user.id]);

  // Fetch extra widget data
  useEffect(() => {
    async function loadExtra() {
      try {
        const [donRes, signRes, callRes] = await Promise.all([
          fetch("/api/donations?limit=1"),
          fetch("/api/signs?limit=1"),
          fetch("/api/call-list?limit=1"),
        ]);
        const [don, sign, call] = await Promise.all([
          donRes.ok ? donRes.json() : { data: { total: 0 } },
          signRes.ok ? signRes.json() : { data: { total: 0, pending: 0 } },
          callRes.ok ? callRes.json() : { data: { total: 0, completed: 0 } },
        ]);
        setExtraData({
          donations: don?.data?.total ?? 0,
          signs: sign?.data?.total ?? sign?.data?.length ?? 0,
          doorsToday: 0,
          gotvPct: 0,
          callPct: call?.data?.total > 0
            ? Math.round((call.data.completed / call.data.total) * 100)
            : 0,
        });
      } catch { /* non-critical — widgets show 0 */ }
    }
    loadExtra();
  }, []);

  const visibleOrder = order.filter((id) => !hidden.includes(id));

  function applyPreset(name: string) {
    const ids = PRESETS[name] ?? PRESETS.Overview;
    setOrder(ids);
    setHidden([]);
    setActivePreset(name);
    saveLayout(user.id, ids, []);
  }

  function toggleWidget(id: WidgetId) {
    const newHidden = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(newHidden);
    saveLayout(user.id, order, newHidden);
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
    saveLayout(user.id, order, hidden);
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
                <div className="divide-y divide-gray-50">
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
                <div className="divide-y divide-gray-50">
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
        </div>
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
      </div>

      {/* Customise panel */}
      {customising && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Layout Presets</p>
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
