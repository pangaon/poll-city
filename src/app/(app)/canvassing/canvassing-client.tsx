"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MapPin, Users, BookOpen, RefreshCw, Printer,
  CheckCircle2, Navigation, ClipboardList, ChevronRight,
  ChevronLeft, X, Activity, ChevronUp, ChevronDown,
  Layers, Radio,
} from "lucide-react";
import {
  Button, Card, CardContent, Modal,
  FormField, Input, Textarea, MultiSelect,
  AddressAutocomplete, EmptyState,
} from "@/components/ui";
import type { AddressResult } from "@/components/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { MapTurfSelection } from "@/components/maps/campaign-map";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

/* ─── Brand colours ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";

/* ─── 7-state turf colour (mirrors campaign-map logic) ─────────────────────── */
function turfColor(status: string | undefined, pct: number): string {
  switch (status) {
    case "completed":   return "#22c55e";
    case "reassigned":  return "#a855f7";
    case "in_progress": return pct >= 75 ? "#84cc16" : pct >= 40 ? "#f97316" : "#f59e0b";
    case "assigned":    return "#3b82f6";
    default:            return "#9ca3af";
  }
}

/* ─── Relative time ─────────────────────────────────────────────────────────── */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface AreaStats {
  doors: number;
  knocked: number;
  supporters: number;
  estimatedHours: number;
  volunteersNeeded: number;
}

interface TurfSummary {
  id: string;
  name: string;
  status: string;
  totalStops: number;
  completedStops: number;
  completionPercent?: number;
  doorsKnocked?: number;
  totalDoors?: number;
  supporters?: number;
  undecided?: number;
  ward?: string | null;
  notes?: string | null;
  assignedUser: { id: string; name: string | null } | null;
  assignedGroup?: { id: string; name: string } | null;
}

interface CanvassList {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  assignments: { id: string; status: string; user: { id: string; name: string | null } }[];
}

interface CanvasserLocation {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

interface ActivityEvent {
  id: string;
  type: "door_knocked";
  turfId: string;
  turfName: string;
  userId: string | null;
  userName: string | null;
  address: string;
  notes: string | null;
  createdAt: string;
}

interface SelectedTurf extends MapTurfSelection {
  id: string;
}

interface SavedTurfResult {
  id: string;
  name: string;
  contactCount: number;
}

interface Props {
  campaignId: string;
  currentUserId: string;
  teamMembers: { id: string; name: string | null; email: string | null; role?: string }[];
  /** When true, suppresses the built-in control bar (Field Ops hub provides its own) */
  embedded?: boolean;
}

/* ─── Shimmer ───────────────────────────────────────────────────────────────── */
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gray-200", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

/* ─── Turf Status Badge ─────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", assigned: "Assigned", in_progress: "In Progress",
  completed: "Completed", reassigned: "Reassigned",
  not_started: "Not Started", paused: "Paused",
};
const STATUS_BG: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  reassigned: "bg-purple-100 text-purple-700",
  not_started: "bg-gray-100 text-gray-500",
  paused: "bg-orange-100 text-orange-700",
};

function TurfStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0", STATUS_BG[status] ?? STATUS_BG.draft)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ─── Turf Drilldown Panel ──────────────────────────────────────────────────── */
function TurfDrilldownPanel({
  turf, onBack, campaignId, teamMembers, onReassignDone,
}: {
  turf: SelectedTurf;
  onBack: () => void;
  campaignId: string;
  teamMembers: Props["teamMembers"];
  onReassignDone: () => void;
}) {
  const [reassigning, setReassigning] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState<string[]>(
    turf.assignedVolunteer ? [] : [],
  );
  const [saving, setSaving] = useState(false);

  const pct = Math.round(turf.completionPercent ?? 0);
  const color = turfColor(turf.status, pct);

  async function handleReassign() {
    if (!newAssigneeId.length) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/turf/${turf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: newAssigneeId[0],
          status: "assigned",
        }),
      });
      if (!res.ok) { toast.error("Failed to reassign"); return; }
      toast.success("Turf reassigned");
      setReassigning(false);
      onReassignDone();
    } finally {
      setSaving(false);
    }
  }

  const teamOptions = teamMembers.map((m) => ({
    label: m.name ?? m.email ?? "Team member",
    value: m.id,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-gray-900 flex-1 truncate text-sm">{turf.name}</h3>
        <TurfStatusBadge status={turf.status ?? "draft"} />
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Completion</span>
          <span className="font-semibold" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center bg-gray-50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-gray-900">{turf.totalDoors ?? turf.stats?.doors ?? 0}</p>
            <p className="text-[10px] text-gray-500 font-medium">Total</p>
          </div>
          <div className="text-center bg-emerald-50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-emerald-700">{turf.doorsKnocked ?? 0}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Knocked</p>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-2.5">
            <p className="text-lg font-bold text-blue-700">{turf.supporters ?? 0}</p>
            <p className="text-[10px] text-blue-600 font-medium">Supporters</p>
          </div>
        </div>
      </div>

      {/* Assignee */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        {turf.assignedVolunteer ? (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ backgroundColor: NAVY }}
            >
              {turf.assignedVolunteer.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{turf.assignedVolunteer}</p>
              <p className="text-[11px] text-gray-500">Assigned canvasser</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No volunteer assigned</p>
        )}
      </div>

      {/* Reassign */}
      {reassigning ? (
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          <p className="text-xs font-medium text-gray-700">Select new assignee</p>
          <MultiSelect
            value={newAssigneeId}
            onChange={(ids) => setNewAssigneeId(ids.slice(-1))}
            options={teamOptions}
            placeholder="Choose volunteer…"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setReassigning(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" loading={saving} disabled={!newAssigneeId.length} onClick={handleReassign}>
              Reassign
            </Button>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="px-4 py-3 space-y-2 mt-auto flex-shrink-0">
        <Link href={`/canvassing/walk?turfId=${turf.id}&campaignId=${campaignId}`} className="block">
          <Button className="w-full" size="sm">
            <Navigation className="w-3.5 h-3.5" /> Start Walk List
          </Button>
        </Link>
        {!reassigning && (
          <Button variant="outline" className="w-full" size="sm" onClick={() => setReassigning(true)}>
            <Users className="w-3.5 h-3.5" /> Reassign Volunteer
          </Button>
        )}
        <Link href={`/canvassing/print-walk-list?campaignId=${campaignId}&turfId=${turf.id}`} target="_blank" className="block">
          <Button variant="ghost" className="w-full" size="sm">
            <Printer className="w-3.5 h-3.5" /> Print Walk List
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Turfs Tab ─────────────────────────────────────────────────────────────── */
function TurfsTab({
  turfs, loading, statusFilter, setStatusFilter, onSelect,
}: {
  turfs: TurfSummary[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onSelect: (id: string) => void;
}) {
  const filtered = statusFilter ? turfs.filter((t) => t.status === statusFilter) : turfs;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All turfs ({turfs.length})</option>
          <option value="draft">Draft</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="reassigned">Reassigned</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => <ShimmerSkeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-1.5 px-4 text-center">
            <p className="text-xs text-gray-400">
              {statusFilter
                ? `No turfs with status "${STATUS_LABELS[statusFilter]}"`
                : "No turfs yet — draw a boundary on the map to create your first turf."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((turf) => {
              const pct = turf.completionPercent ?? (turf.totalStops > 0 ? Math.round((turf.completedStops / turf.totalStops) * 100) : 0);
              const color = turfColor(turf.status, pct);
              return (
                <button
                  key={turf.id}
                  onClick={() => onSelect(turf.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{turf.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[11px] text-gray-500 flex-shrink-0 tabular-nums">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TurfStatusBadge status={turf.status} />
                    {turf.assignedUser && (
                      <span className="text-[11px] text-gray-400 truncate">{turf.assignedUser.name}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Canvassers Tab ────────────────────────────────────────────────────────── */
function CanvassersTab({ canvassers }: { canvassers: CanvasserLocation[] }) {
  if (!canvassers.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <Radio className="w-8 h-8 text-gray-200" />
        <p className="text-xs text-gray-400">No active canvassers right now</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-50">
      {canvassers.map((c) => {
        const mins = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 60000);
        const isLive = mins < 5;
        return (
          <div key={c.userId} className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
                style={{ backgroundColor: NAVY }}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
              {isLive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
              <p className="text-[11px] text-gray-400">
                {isLive ? (
                  <span className="text-green-600 font-medium">Active now</span>
                ) : (
                  `${mins}m ago`
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Lists Tab ─────────────────────────────────────────────────────────────── */
function ListsTab({
  lists, loading, onAssign, onNewList,
}: {
  lists: CanvassList[];
  loading: boolean;
  onAssign: (id: string) => void;
  onNewList: () => void;
}) {
  const STATUS_COLORS: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <Button size="sm" className="w-full" onClick={onNewList}>
          <Plus className="w-3.5 h-3.5" /> New Walk List
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">{Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="h-16" />)}</div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-1.5 px-4 text-center">
            <p className="text-xs text-gray-400">No walk lists yet</p>
            <p className="text-[10px] text-gray-300">Use <strong className="text-gray-400">+ New Walk List</strong> above to assign contacts to a volunteer.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lists.map((list) => (
              <div key={list.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", STATUS_COLORS[list.status])}>
                    {STATUS_LABELS[list.status] ?? list.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">{list.assignments.length} assigned</p>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onAssign(list.id)}>
                    <Users className="w-3 h-3" /> Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Right Panel ───────────────────────────────────────────────────────────── */
function RightPanel({
  selectedTurf, onBack,
  turfs, canvassers, lists,
  activeTab, setActiveTab,
  statusFilter, setStatusFilter,
  campaignId, teamMembers,
  loading,
  onListAssign, onTurfSelect, onNewList, onReassignDone,
}: {
  selectedTurf: SelectedTurf | null;
  onBack: () => void;
  turfs: TurfSummary[];
  canvassers: CanvasserLocation[];
  lists: CanvassList[];
  activeTab: string;
  setActiveTab: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  campaignId: string;
  teamMembers: Props["teamMembers"];
  loading: boolean;
  onListAssign: (id: string) => void;
  onTurfSelect: (id: string) => void;
  onNewList: () => void;
  onReassignDone: () => void;
}) {
  if (selectedTurf) {
    return (
      <TurfDrilldownPanel
        turf={selectedTurf}
        onBack={onBack}
        campaignId={campaignId}
        teamMembers={teamMembers}
        onReassignDone={onReassignDone}
      />
    );
  }

  // Live count badges
  const activeCounts: Record<string, number> = {
    turfs: turfs.length,
    canvassers: canvassers.length,
    lists: lists.length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(
          [
            ["turfs", "Turfs", Layers],
            ["canvassers", "Live", Radio],
            ["lists", "Lists", ClipboardList],
          ] as [string, string, React.ComponentType<{ className?: string }>][]
        ).map(([val, label, Ic]) => {
          const count = activeCounts[val] ?? 0;
          return (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 text-xs font-medium py-3 border-b-2 transition-colors",
                activeTab === val
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              <Ic className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1 rounded-full leading-tight",
                  activeTab === val ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "turfs" && (
          <TurfsTab
            turfs={turfs}
            loading={loading}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelect={onTurfSelect}
          />
        )}
        {activeTab === "canvassers" && <CanvassersTab canvassers={canvassers} />}
        {activeTab === "lists" && (
          <ListsTab lists={lists} loading={loading} onAssign={onListAssign} onNewList={onNewList} />
        )}
      </div>
    </div>
  );
}

/* ─── Activity Log Panel ────────────────────────────────────────────────────── */
function ActivityLogPanel({
  events, expanded, onToggle, loading,
}: {
  events: ActivityEvent[];
  expanded: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 border-t border-gray-200 bg-white overflow-hidden transition-all duration-200",
        expanded ? "h-52" : "h-10",
      )}
    >
      {/* Toggle strip */}
      <button
        onClick={onToggle}
        className="h-10 w-full flex items-center justify-between px-4 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-gray-400" />
          <span>Field Activity</span>
          {events.length > 0 && (
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
              {events.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>

      {/* Log content */}
      {expanded && (
        <div className="h-[calc(100%-2.5rem)] overflow-y-auto">
          {loading ? (
            <div className="space-y-1.5 p-3">
              {Array.from({ length: 4 }).map((_, i) => <ShimmerSkeleton key={i} className="h-8" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-400">No field activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.map((ev) => (
                <div key={ev.id} className="px-4 py-2 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="font-medium">{ev.userName ?? "A canvasser"}</span>
                      {" knocked "}
                      <span className="font-medium">{ev.address}</span>
                      {ev.turfName && (
                        <span className="text-gray-400"> · {ev.turfName}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{relTime(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Live Legend ────────────────────────────────────────────────────────────── */
function LiveLegend({ turfs }: { turfs: TurfSummary[] }) {
  const counts = {
    draft: turfs.filter((t) => t.status === "draft").length,
    assigned: turfs.filter((t) => t.status === "assigned").length,
    in_progress: turfs.filter((t) => t.status === "in_progress").length,
    completed: turfs.filter((t) => t.status === "completed").length,
    reassigned: turfs.filter((t) => t.status === "reassigned").length,
  };
  const total = turfs.length;
  if (total === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-[500] rounded-xl bg-white/95 border border-gray-200 p-2.5 shadow-lg text-[11px] text-gray-700 min-w-[130px]">
      <p className="font-semibold text-gray-900 mb-1.5 text-xs">Turf Status</p>
      <div className="space-y-1">
        {(
          [
            ["#9ca3af", "Draft", counts.draft],
            ["#3b82f6", "Assigned", counts.assigned],
            ["#f59e0b", "In progress", counts.in_progress],
            ["#22c55e", "Completed", counts.completed],
            ["#a855f7", "Reassigned", counts.reassigned],
          ] as [string, string, number][]
        ).map(([color, label, count]) =>
          count > 0 ? (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="flex-1">{label}</span>
              <span className="font-semibold tabular-nums text-gray-500">{count}</span>
            </div>
          ) : null,
        )}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between">
        <span className="text-gray-400">Total</span>
        <span className="font-semibold text-gray-700">{total}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CanvassingClient({ campaignId, currentUserId, teamMembers, embedded = false }: Props) {
  const [turfs, setTurfs] = useState<TurfSummary[]>([]);
  const [lists, setLists] = useState<CanvassList[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserLocation[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("turfs");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTurf, setSelectedTurf] = useState<SelectedTurf | null>(null);
  const [litDropMode, setLitDropMode] = useState(false);

  // Turf draw / create panel
  const [turfPanelOpen, setTurfPanelOpen] = useState(false);
  const [savingTurf, setSavingTurf] = useState(false);
  const [activeTurfId, setActiveTurfId] = useState<string | null>(null);
  const [activeTurfName, setActiveTurfName] = useState("");
  const [draftCoordinates, setDraftCoordinates] = useState<Array<[number, number]>>([]);
  const [draftStats, setDraftStats] = useState<AreaStats | null>(null);
  const [turfAssigneeIds, setTurfAssigneeIds] = useState<string[]>([]);
  const [turfCanvassDate, setTurfCanvassDate] = useState("");
  const [turfNotes, setTurfNotes] = useState("");
  const [savedTurf, setSavedTurf] = useState<SavedTurfResult | null>(null);

  // Lists modal
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Mobile panel tab
  const [mobilePanelTab, setMobilePanelTab] = useState<"turfs" | "canvassers" | "lists">("turfs");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [turfsRes, listsRes, locRes] = await Promise.all([
        fetch(`/api/turf?campaignId=${campaignId}`),
        fetch(`/api/canvass?campaignId=${campaignId}`),
        fetch(`/api/canvasser/location?campaignId=${campaignId}`),
      ]);
      const [turfsData, listsData, locData] = await Promise.all([
        turfsRes.json(),
        listsRes.json(),
        locRes.json(),
      ]);
      setTurfs(turfsData.data ?? []);
      setLists(listsData.data ?? []);
      setCanvassers(
        (locData.data ?? []).map((l: { user: { id: string; name: string | null }; lat: number; lng: number; updatedAt: string }) => ({
          userId: l.user.id,
          name: l.user.name ?? "Canvasser",
          lat: l.lat, lng: l.lng, updatedAt: l.updatedAt,
        })),
      );
    } catch {
      toast.error("Failed to load field data");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadActivity = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch(`/api/canvassing/activity-log?campaignId=${campaignId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setActivityLog(data.events ?? []);
      }
    } catch { /* silent */ } finally {
      setLogLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); loadActivity(); }, [load, loadActivity]);

  // GPS polling every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/canvasser/location?campaignId=${campaignId}`);
        const data = await res.json();
        setCanvassers(
          (data.data ?? []).map((l: { user: { id: string; name: string | null }; lat: number; lng: number; updatedAt: string }) => ({
            userId: l.user.id, name: l.user.name ?? "Canvasser",
            lat: l.lat, lng: l.lng, updatedAt: l.updatedAt,
          })),
        );
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [campaignId]);

  // Expand log on first load if events present
  useEffect(() => {
    if (activityLog.length > 0 && !logExpanded) setLogExpanded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog.length]);

  /* ── Turf selection ── */
  async function handleTurfSelect(id: string) {
    // Find in local turfs
    const local = turfs.find((t) => t.id === id);
    if (local) {
      setSelectedTurf({
        id: local.id,
        name: local.name,
        coordinates: [],
        stats: { doors: local.totalDoors ?? 0, knocked: local.doorsKnocked ?? 0, supporters: local.supporters ?? 0, estimatedHours: 0, volunteersNeeded: 0 },
        status: local.status,
        completionPercent: local.completionPercent ?? 0,
        assignedVolunteer: local.assignedUser?.name ?? null,
        totalDoors: local.totalDoors ?? 0,
        doorsKnocked: local.doorsKnocked ?? 0,
        supporters: local.supporters ?? 0,
        undecided: local.undecided ?? 0,
      });
    }
  }

  function handleMapTurfClick(sel: MapTurfSelection) {
    if (!sel.id) {
      // New turf draw
      openTurfPanel(sel, null);
      setTurfAssigneeIds([]); setTurfCanvassDate(""); setTurfNotes("");
      return;
    }
    setSelectedTurf({ ...sel, id: sel.id });
  }

  /* ── Turf draw / save ── */
  function openTurfPanel(selection: MapTurfSelection, stats: AreaStats | null = null) {
    setActiveTurfId(selection.id);
    setActiveTurfName(selection.name ?? (selection.id ? "Selected Turf" : `New Turf ${new Date().toLocaleDateString()}`));
    setDraftCoordinates(selection.coordinates);
    setDraftStats(stats);
    setSavedTurf(null);
    setTurfPanelOpen(true);
  }

  async function loadExistingTurf(id: string) {
    try {
      const res = await fetch(`/api/turf/${id}`);
      if (!res.ok) return;
      const payload = await res.json();
      const turf = payload?.data;
      if (!turf) return;
      setTurfAssigneeIds(turf.assignedUserId ? [turf.assignedUserId] : []);
      const notesText = String(turf.notes ?? "");
      const dateMatch = notesText.match(/Canvass date:\s*(\d{4}-\d{2}-\d{2})/i);
      setTurfCanvassDate(dateMatch?.[1] ?? "");
      setTurfNotes(notesText.replace(/Canvass date:\s*\d{4}-\d{2}-\d{2}\s*/i, "").trim());
      setActiveTurfName(turf.name ?? "Selected Turf");
    } catch { /* silent */ }
  }

  function serializeNotes(canvassDate: string, notes: string) {
    const parts: string[] = [];
    if (canvassDate) parts.push(`Canvass date: ${canvassDate}`);
    if (notes.trim()) parts.push(notes.trim());
    return parts.join("\n\n");
  }

  function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || 1e-9) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function centroidForPolygon(points: Array<[number, number]>) {
    if (!points.length) return null;
    const sum = points.reduce((acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), { lat: 0, lng: 0 });
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
  }

  async function saveTurfFlow() {
    if (!turfPanelOpen) return;
    setSavingTurf(true);
    try {
      if (activeTurfId) {
        const primaryAssignee = turfAssigneeIds[0] ?? null;
        const patchRes = await fetch(`/api/turf/${activeTurfId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedUserId: primaryAssignee,
            status: primaryAssignee ? "assigned" : "draft",
            notes: serializeNotes(turfCanvassDate, turfNotes),
            name: activeTurfName || "Selected Turf",
          }),
        });
        if (!patchRes.ok) { toast.error("Failed to save turf details"); return; }
        toast.success("Turf saved");
        setTurfPanelOpen(false);
        load();
        return;
      }

      if (draftCoordinates.length < 3) { toast.error("Draw at least 3 points"); return; }
      const contactsRes = await fetch(`/api/maps/contacts-geojson?campaignId=${campaignId}&take=10000`);
      if (!contactsRes.ok) { toast.error("Could not load contacts for turf"); return; }
      const contactsGeo = await contactsRes.json();
      const contactIds: string[] = (contactsGeo?.features ?? [])
        .filter((f: { geometry?: { coordinates?: [number, number] }; properties?: { id?: string } }) => {
          const coords = f.geometry?.coordinates;
          if (!coords || coords.length < 2) return false;
          return pointInPolygon([coords[1], coords[0]], draftCoordinates);
        })
        .map((f: { properties?: { id?: string } }) => f.properties?.id)
        .filter((id: string | undefined): id is string => Boolean(id));

      if (!contactIds.length) { toast.error("No contacts in selected area"); return; }

      const boundary = {
        type: "Polygon",
        coordinates: [[...draftCoordinates.map(([lat, lng]) => [lng, lat]), [draftCoordinates[0][1], draftCoordinates[0][0]]]],
      };
      const primaryAssignee = turfAssigneeIds[0] ?? null;
      const createRes = await fetch("/api/turf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId, name: activeTurfName || `Turf ${new Date().toLocaleDateString()}`,
          contactIds, notes: serializeNotes(turfCanvassDate, turfNotes),
          assignedUserId: primaryAssignee, boundary,
          centroid: centroidForPolygon(draftCoordinates),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        toast.error(err?.error ?? "Failed to save turf");
        return;
      }
      const turfData = await createRes.json();
      setSavedTurf({ id: turfData?.data?.id ?? "", name: activeTurfName || "New Turf", contactCount: contactIds.length });
      load();
    } finally {
      setSavingTurf(false);
    }
  }

  /* ── Bulk assign ── */
  async function bulkAssign() {
    if (!assignUserIds.length || !showAssign) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/canvass/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvassListId: showAssign, userIds: assignUserIds }),
      });
      if (res.ok) {
        toast.success(`${assignUserIds.length} volunteer${assignUserIds.length !== 1 ? "s" : ""} assigned`);
        setShowAssign(null); setAssignUserIds([]); load();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to assign");
      }
    } finally {
      setAssigning(false);
    }
  }

  const teamOptions = teamMembers.map((m) => ({
    label: m.name ?? m.email ?? "Team member", value: m.id,
  }));

  /* ═════════════════════════════════════════════════════════════════════════════
     RENDER — 4-zone command surface
     ═════════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Command Surface Container ── */}
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-gray-50",
          embedded
            ? "w-full h-full"
            : "-mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6",
        )}
        style={embedded ? undefined : { height: "calc(100dvh - 116px)" }}
      >
        {/* ── Zone 1: Control Bar — hidden when embedded (Field Ops hub provides its own) ── */}
        <div className={cn("h-14 flex-shrink-0 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shadow-sm", embedded && "hidden")}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 whitespace-nowrap hidden sm:block">Field Operations</h1>
            {canvassers.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {canvassers.length} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setLitDropMode((v) => !v); toast(litDropMode ? "Lit drop off" : "Lit drop mode on"); }}
              className={cn(
                "hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors",
                litDropMode
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lit Drop</span>
            </button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => { load(); loadActivity(); }}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>

            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New List</span>
            </Button>
          </div>
        </div>

        {/* ── Zone 2+3: Map + Right Panel ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Map section */}
          <div className="flex-1 min-w-0 min-h-0 relative">
            <CampaignMap
              mode="canvassing"
              height="100%"
              campaignId={campaignId}
              showControls
              showCalculator={false}
              hideLegend
              selectedTurfId={selectedTurf?.id ?? null}
              onTurfDraw={(coordinates, stats) => {
                setTurfAssigneeIds([]); setTurfCanvassDate(""); setTurfNotes("");
                openTurfPanel({ id: null, name: `New Turf ${new Date().toLocaleDateString()}`, coordinates, stats }, stats);
              }}
              onTurfClick={(sel) => {
                handleMapTurfClick(sel);
                if (sel.id) void loadExistingTurf(sel.id);
              }}
            />

            {/* Live legend overlay */}
            <LiveLegend turfs={turfs} />
          </div>

          {/* Right panel — desktop only */}
          <div className="hidden lg:flex w-80 flex-col border-l border-gray-200 bg-white overflow-hidden flex-shrink-0">
            <RightPanel
              selectedTurf={selectedTurf}
              onBack={() => setSelectedTurf(null)}
              turfs={turfs}
              canvassers={canvassers}
              lists={lists}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              campaignId={campaignId}
              teamMembers={teamMembers}
              loading={loading}
              onListAssign={(id) => { setShowAssign(id); setAssignUserIds([]); }}
              onTurfSelect={handleTurfSelect}
              onNewList={() => setShowCreate(true)}
              onReassignDone={() => { load(); setSelectedTurf(null); }}
            />
          </div>
        </div>

        {/* ── Zone 4: Activity Log (desktop) ── */}
        <div className="hidden lg:block">
          <ActivityLogPanel
            events={activityLog}
            expanded={logExpanded}
            onToggle={() => setLogExpanded((v) => !v)}
            loading={logLoading}
          />
        </div>
      </div>

      {/* ── Mobile bottom panel (below scroll container) ── */}
      <div className="lg:hidden mt-3 space-y-3">
        {/* Mobile tab strip */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[["turfs", "Turfs"], ["canvassers", "Live"], ["lists", "Lists"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setMobilePanelTab(val as typeof mobilePanelTab)}
                className={cn(
                  "flex-1 text-xs font-medium py-3 border-b-2 transition-colors",
                  mobilePanelTab === val ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {mobilePanelTab === "turfs" && (
              <TurfsTab
                turfs={turfs} loading={loading}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                onSelect={handleTurfSelect}
              />
            )}
            {mobilePanelTab === "canvassers" && <CanvassersTab canvassers={canvassers} />}
            {mobilePanelTab === "lists" && (
              <ListsTab lists={lists} loading={loading}
                onAssign={(id) => { setShowAssign(id); setAssignUserIds([]); }}
                onNewList={() => setShowCreate(true)}
              />
            )}
          </div>
        </div>

        {/* Mobile activity log */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <ActivityLogPanel
            events={activityLog}
            expanded={logExpanded}
            onToggle={() => setLogExpanded((v) => !v)}
            loading={logLoading}
          />
        </div>
      </div>

      {/* ── Turf Draw Panel (slide-over) ── */}
      <AnimatePresence>
        {turfPanelOpen && (
          <div
            className="fixed inset-0 z-[1400] bg-black/35"
            onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {savedTurf ? "Turf Saved" : activeTurfId ? "Edit Turf" : "Save This Turf"}
                  </h3>
                  <button
                    onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {savedTurf ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900">{savedTurf.name}</h4>
                      <p className="text-gray-500 mt-1">{savedTurf.contactCount} door{savedTurf.contactCount !== 1 ? "s" : ""} ready to knock</p>
                    </div>
                    <div className="w-full space-y-3">
                      <Link href={`/canvassing/walk?turfId=${savedTurf.id}&campaignId=${campaignId}`} className="block">
                        <Button className="w-full" size="lg"><Navigation className="w-4 h-4" /> Start Walk List</Button>
                      </Link>
                      <Link href={`/canvassing/print-walk-list?campaignId=${campaignId}&turfId=${savedTurf.id}`} target="_blank" className="block">
                        <Button variant="outline" className="w-full" size="lg"><Printer className="w-4 h-4" /> Print Walk List</Button>
                      </Link>
                      <Button variant="ghost" className="w-full" onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}>
                        <ClipboardList className="w-4 h-4" /> Back to Map
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4">
                    {!activeTurfId && draftStats && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-blue-700">{draftStats.doors}</p>
                          <p className="text-xs text-blue-600">Doors</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-emerald-700">{draftStats.supporters}</p>
                          <p className="text-xs text-emerald-600">Supporters</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-amber-700">{draftStats.estimatedHours.toFixed(1)}h</p>
                          <p className="text-xs text-amber-600">Est. time</p>
                        </div>
                      </div>
                    )}
                    <FormField
                      label="Turf name"
                      help={{ content: "A short name for this canvassing zone. Used when assigning canvassers to routes and shown on the walk list.", example: "North Grid — Streets 10–25" }}
                    >
                      <Input value={activeTurfName} onChange={(e) => setActiveTurfName(e.target.value)} placeholder="North Grid — Streets 10–25" />
                    </FormField>
                    <FormField
                      label="Assign volunteer"
                      help={{ content: "The canvasser responsible for this turf. They will see it in their walk list app and receive GPS routing.", tip: "You can reassign at any time from the turf detail panel." }}
                    >
                      <MultiSelect value={turfAssigneeIds} onChange={setTurfAssigneeIds} options={teamOptions} placeholder="Select volunteer…" />
                    </FormField>
                    <FormField
                      label="Canvass date"
                      help={{ content: "The scheduled date for canvassing this turf. Helps your team plan shifts and track whether a turf has been worked recently." }}
                    >
                      <Input type="date" value={turfCanvassDate} onChange={(e) => setTurfCanvassDate(e.target.value)} />
                    </FormField>
                    <FormField
                      label="Notes"
                      help={{ content: "Route notes or instructions for the canvasser — parking spots, locked buildings, dogs to watch out for.", example: "Park on Oak Ave. Building at 42 has a code: 1234." }}
                      hint="Only visible to the assigned volunteer and campaign managers."
                    >
                      <Textarea rows={3} value={turfNotes} onChange={(e) => setTurfNotes(e.target.value)} placeholder="Parking tips, building codes, or anything the canvasser should know…" />
                    </FormField>
                    <div className="flex gap-3 pt-2 mt-auto border-t border-gray-100">
                      <Button variant="outline" onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }} className="flex-1">Cancel</Button>
                      <Button onClick={saveTurfFlow} loading={savingTurf} className="flex-1">{activeTurfId ? "Save Changes" : "Save Turf"}</Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Selected turf mobile panel ── */}
      <AnimatePresence>
        {selectedTurf && (
          <div className="lg:hidden fixed inset-0 z-[1300] bg-black/30" onClick={() => setSelectedTurf(null)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
              style={{ maxHeight: "70vh", overflow: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 pb-1">
                <span className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <TurfDrilldownPanel
                turf={selectedTurf}
                onBack={() => setSelectedTurf(null)}
                campaignId={campaignId}
                teamMembers={teamMembers}
                onReassignDone={() => { load(); setSelectedTurf(null); }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create List Modal ── */}
      <CreateCanvassWizard
        open={showCreate}
        onClose={() => setShowCreate(false)}
        campaignId={campaignId}
        teamMembers={teamMembers}
        onCreated={() => { setShowCreate(false); load(); }}
      />

      {/* ── Bulk Assign Modal ── */}
      <Modal open={!!showAssign} onClose={() => { setShowAssign(null); setAssignUserIds([]); }} title="Assign Volunteers" size="sm">
        <div className="space-y-4">
          <FormField
            label="Select volunteers"
            help={{ content: "Choose one or more team members to assign to this walk list. Each assigned volunteer will see it in their walk list app.", tip: "You can assign the entire team at once using the link below." }}
          >
            <MultiSelect value={assignUserIds} onChange={setAssignUserIds} options={teamOptions} placeholder="Choose team members…" />
          </FormField>
          {teamOptions.length > 0 && (
            <button type="button" className="text-xs text-blue-600 hover:underline"
              onClick={() => setAssignUserIds(teamOptions.map((o) => o.value))}>
              Assign entire team ({teamOptions.length})
            </button>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowAssign(null); setAssignUserIds([]); }} className="flex-1">Cancel</Button>
            <Button onClick={bulkAssign} loading={assigning} disabled={assignUserIds.length === 0} className="flex-1">
              Assign{assignUserIds.length > 0 ? ` (${assignUserIds.length})` : ""}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ─── Create Canvass Wizard ─────────────────────────────────────────────────── */
interface WizardProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  onCreated: () => void;
}

const SUPPORT_LEVEL_OPTIONS = [
  { value: "strong_support", label: "Strong Support" },
  { value: "leaning_support", label: "Leaning Support" },
  { value: "undecided", label: "Undecided" },
  { value: "leaning_opposition", label: "Leaning Opposition" },
];

function CreateCanvassWizard({ open, onClose, campaignId, teamMembers, onCreated }: WizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ward, setWard] = useState("");
  const [targetArea, setTargetArea] = useState("");
  const [targetSupportLevels, setTargetSupportLevels] = useState<string[]>(["strong_support", "leaning_support", "undecided"]);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);

  const teamOptions = teamMembers.map((m) => ({
    label: m.name ?? m.email ?? "Team member", value: m.id,
  }));

  function handleClose() {
    setStep(1); setName(""); setDescription(""); setWard(""); setTargetArea("");
    setTargetSupportLevels(["strong_support", "leaning_support", "undecided"]);
    setAssignUserIds([]);
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/canvass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: name.trim(), description: description.trim() || null, ward: ward.trim() || null, targetArea: targetArea.trim() || null, targetSupportLevels, assignUserIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to create walk list");
        return;
      }
      toast.success("Walk list created");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = ["List Details", "Target Contacts", "Assign Team"];

  return (
    <Modal open={open} onClose={handleClose} title={`New Walk List — ${stepTitles[step - 1]}`} size="md">
      {step === 1 && (
        <div className="space-y-4">
          <FormField
            label="List name"
            required
            help={{ content: "A clear name your volunteers will recognise when they open the walk list app. Include the ward and date if running multiple lists.", example: "Ward 3 Saturday Canvass — Oct 11" }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ward 3 Saturday Canvass — Oct 11" autoFocus />
          </FormField>
          <FormField
            label="Description"
            help={{ content: "Optional notes for volunteers assigned to this list — what to focus on, what to avoid, any special instructions.", example: "Focus on the apartment buildings on Bloor. Avoid the north end — already worked." }}
            hint="Only visible to assigned volunteers and campaign managers."
          >
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Focus areas, special instructions, or notes for volunteers…" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Ward"
              help={{ content: "The electoral ward this list covers. Used to group and filter lists by area in your reports.", example: "Ward 3" }}
            >
              <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Ward 3" />
            </FormField>
            <FormField
              label="Target area"
              help={{ content: "A more specific description of the area within the ward. Helps volunteers understand the geography at a glance.", example: "Bloor St – Ossington to Bathurst" }}
            >
              <Input value={targetArea} onChange={(e) => setTargetArea(e.target.value)} placeholder="Bloor St — Ossington to Bathurst" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!name.trim()}>Next <ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Which contacts should this list target?</p>
          <div className="space-y-2">
            {SUPPORT_LEVEL_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 border border-transparent has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50">
                <input
                  type="checkbox"
                  checked={targetSupportLevels.includes(opt.value)}
                  onChange={(e) => setTargetSupportLevels((prev) =>
                    e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                  )}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={() => setStep(3)}>Next <ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Assign volunteers to this walk list (optional).</p>
          <FormField
            label="Assign volunteers"
            help={{ content: "Choose the team members who will work this list. Each person receives a notification and sees the walk list in their app.", tip: "You can add or remove volunteers after the list is created." }}
          >
            <MultiSelect value={assignUserIds} onChange={setAssignUserIds} options={teamOptions} placeholder="Select team members…" />
          </FormField>
          {teamOptions.length > 0 && (
            <button type="button" className="text-xs text-blue-600 hover:underline"
              onClick={() => setAssignUserIds(teamOptions.map((o) => o.value))}>
              Assign entire team ({teamOptions.length})
            </button>
          )}
          <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={handleSubmit} loading={submitting}>
              <CheckCircle2 className="w-4 h-4" /> Create List
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
