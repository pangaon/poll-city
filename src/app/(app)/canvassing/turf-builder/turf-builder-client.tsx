"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Map, Users, Plus, ChevronRight, ChevronDown, CheckCircle,
  Circle, Loader2, X, Zap, Navigation, RefreshCw, AlertTriangle,
  MapPin, User, Clock, Route,
} from "lucide-react";
import { FieldHelp, FeatureGuide } from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MapStop, CanvasserPin } from "@/components/maps/turf-map";

// Dynamic import to prevent SSR issues with Leaflet
const TurfMap = dynamic(() => import("@/components/maps/turf-map"), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface TeamMember { id: string; name: string | null; email: string }
interface VolunteerGroupSummary { id: string; name: string; targetWard: string | null }

interface TurfSummary {
  id: string;
  name: string;
  ward: string | null;
  pollNumber: string | null;
  streets: string[];
  oddEven: string;
  status: string;
  totalStops: number;
  completedStops: number;
  notes: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  assignedGroup: { id: string; name: string; targetWard: string | null } | null;
  _count: { stops: number };
  createdAt: string;
}

interface PreviewContact {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  ward: string | null;
  municipalPoll: string | null;
  supportLevel: string;
  household: { lat: number | null; lng: number | null } | null;
}

interface TurfDetail extends TurfSummary {
  stops: {
    id: string;
    order: number;
    visited: boolean;
    visitedAt: string | null;
    contact: {
      id: string; firstName: string; lastName: string; address1: string | null;
      streetNumber: string | null; streetName: string | null; city: string | null;
      phone: string | null; supportLevel: string; ward: string | null;
      household: { lat: number | null; lng: number | null } | null;
    };
  }[];
}

type Tab = "turfs" | "create" | "map";

const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  draft:       { label: "Draft",       colour: "bg-gray-100 text-gray-700" },
  assigned:    { label: "Assigned",    colour: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", colour: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completed",   colour: "bg-green-100 text-green-700" },
  reassigned:  { label: "Reassigned",  colour: "bg-purple-100 text-purple-700" },
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function TurfBuilderClient({
  campaignId,
  currentUserId,
  teamMembers,
}: {
  campaignId: string;
  currentUserId: string;
  teamMembers: TeamMember[];
}) {
  const [tab, setTab] = useState<Tab>("turfs");
  const [turfs, setTurfs] = useState<TurfSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState<TurfDetail | null>(null);
  const [canvasserLocations, setCanvasserLocations] = useState<CanvasserPin[]>([]);
  const [volunteerGroups, setVolunteerGroups] = useState<VolunteerGroupSummary[]>([]);

  const loadTurfs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/turf?campaignId=${campaignId}`);
      const data = await res.json();
      setTurfs(data.data ?? []);
    } catch { toast.error("Failed to load turfs"); }
    finally { setLoading(false); }
  }, [campaignId]);

  const loadCanvasserLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/canvasser/location?campaignId=${campaignId}`);
      const data = await res.json();
      setCanvasserLocations(
        (data.data ?? []).map((l: { user: { id: string; name: string | null }; lat: number; lng: number; updatedAt: string }) => ({
          userId: l.user.id,
          name: l.user.name ?? "Canvasser",
          lat: l.lat,
          lng: l.lng,
          updatedAt: l.updatedAt,
        }))
      );
    } catch { /* silent */ }
  }, [campaignId]);

  const loadVolunteerGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/volunteers/groups?campaignId=${campaignId}`);
      const data = await res.json();
      setVolunteerGroups((data.data ?? []).map((g: { id: string; name: string; targetWard: string | null }) => ({
        id: g.id,
        name: g.name,
        targetWard: g.targetWard,
      })));
    } catch {
      setVolunteerGroups([]);
    }
  }, [campaignId]);

  useEffect(() => { loadTurfs(); }, [loadTurfs]);
  useEffect(() => { loadVolunteerGroups(); }, [loadVolunteerGroups]);
  useEffect(() => {
    if (tab === "map") {
      loadCanvasserLocations();
      const interval = setInterval(loadCanvasserLocations, 30000);
      return () => clearInterval(interval);
    }
  }, [tab, loadCanvasserLocations]);

  async function openTurfDetail(turf: TurfSummary) {
    try {
      const res = await fetch(`/api/turf/${turf.id}`);
      const data = await res.json();
      setSelectedTurf(data.data);
    } catch { toast.error("Failed to load turf details"); }
  }

  async function autoReassign() {
    const incomplete = turfs.filter(
      (t) => (t.status === "in_progress" || t.status === "assigned") && t.completedStops < t.totalStops
    );
    if (!incomplete.length) { toast("No incomplete turfs to reassign"); return; }

    const unassigned = turfs.filter((t) => t.status === "draft");
    if (unassigned.length === 0) { toast("No draft turfs available"); return; }

    toast.success(`Found ${incomplete.length} incomplete turfs. Click Reassign on each to pick a new canvasser.`);
  }

  const allMapStops: MapStop[] = useMemo(() => {
    if (!selectedTurf) return [];
    return selectedTurf.stops
      .filter((s) => s.contact.household?.lat && s.contact.household?.lng)
      .map((s) => ({
        id: s.id,
        lat: s.contact.household!.lat!,
        lng: s.contact.household!.lng!,
        label: `${s.contact.firstName} ${s.contact.lastName} · ${s.contact.address1 ?? ""}`,
        visited: s.visited,
        order: s.order,
      }));
  }, [selectedTurf]);

  const TABS: { id: Tab; icon: typeof Map; label: string }[] = [
    { id: "turfs", icon: Route, label: "Turfs" },
    { id: "create", icon: Plus, label: "Create" },
    { id: "map", icon: Map, label: "Manager Map" },
  ];

  return (
    <div className="space-y-5">
      <FeatureGuide
        featureKey="canvassing-turf-builder"
        title="Building your canvassing turfs"
        description="The Turf Builder divides your ward into canvassing zones that you assign to volunteers. Each volunteer gets a clear, manageable area so every door gets knocked without overlap or gaps."
        bullets={[
          "Draw boundaries on the map or auto-divide by street range",
          "Assign a volunteer or team to each zone",
          "Canvassers see their exact turf on their phone when they go out",
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Turf Builder</h1>
          <p className="text-sm text-gray-500">Create, optimize, and assign canvassing turfs</p>
        </div>
        <button onClick={autoReassign} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Auto-Reassign
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Turfs list ── */}
      {tab === "turfs" && (
        <TurfsTab
          turfs={turfs}
          loading={loading}
          teamMembers={teamMembers}
          onRefresh={loadTurfs}
          onOpenDetail={openTurfDetail}
          selectedTurf={selectedTurf}
          onCloseDetail={() => setSelectedTurf(null)}
          mapStops={allMapStops}
          campaignId={campaignId}
          volunteerGroups={volunteerGroups}
        />
      )}

      {/* ── Create turf ── */}
      {tab === "create" && (
        <CreateTurfTab
          campaignId={campaignId}
          teamMembers={teamMembers}
          onCreated={() => { loadTurfs(); setTab("turfs"); }}
        />
      )}

      {/* ── Manager map ── */}
      {tab === "map" && (
        <ManagerMapTab
          canvassers={canvasserLocations}
          turfs={turfs}
          onRefresh={loadCanvasserLocations}
        />
      )}

    </div>
  );
}

/* ─── Turfs Tab ──────────────────────────────────────────────────────────────── */

function TurfsTab({
  turfs, loading, teamMembers, onRefresh, onOpenDetail, selectedTurf, onCloseDetail, mapStops, campaignId, volunteerGroups,
}: {
  turfs: TurfSummary[];
  loading: boolean;
  teamMembers: TeamMember[];
  onRefresh: () => void;
  onOpenDetail: (t: TurfSummary) => void;
  selectedTurf: TurfDetail | null;
  onCloseDetail: () => void;
  mapStops: MapStop[];
  campaignId: string;
  volunteerGroups: VolunteerGroupSummary[];
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assigningGroup, setAssigningGroup] = useState<string | null>(null);

  async function assign(turfId: string, userId: string) {
    const res = await fetch(`/api/turf/${turfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedUserId: userId, status: "assigned" }),
    });
    if (res.ok) { toast.success("Turf assigned"); onRefresh(); setAssigning(null); }
    else toast.error("Failed to assign");
  }

  async function assignGroup(turfId: string, groupId: string) {
    const res = await fetch(`/api/turf/${turfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedGroupId: groupId || null, status: "assigned" }),
    });
    if (res.ok) { toast.success("Turf group assigned"); onRefresh(); setAssigningGroup(null); }
    else toast.error("Failed to assign group");
  }

  async function deleteTurf(turfId: string) {
    if (!confirm("Delete this turf?")) return;
    const res = await fetch(`/api/turf/${turfId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Turf deleted"); onRefresh(); }
    else toast.error("Failed to delete");
  }

  if (loading) return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  if (!turfs.length) return (
    <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-2xl">
      <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No turfs yet</p>
      <p className="text-sm mt-1">Create your first turf to assign canvassers</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Turf detail panel */}
      {selectedTurf && (
        <div className="border rounded-2xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50">
            <div>
              <h3 className="font-bold text-gray-900">{selectedTurf.name}</h3>
              <p className="text-sm text-gray-500">{selectedTurf.stops.length} stops · {selectedTurf.completedStops} visited</p>
            </div>
            <button onClick={onCloseDetail} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          {mapStops.length > 0 && (
            <div className="p-4">
              <TurfMap stops={mapStops} showRoute height="280px" />
            </div>
          )}
          <div className="px-5 pb-4 divide-y max-h-60 overflow-y-auto">
            {selectedTurf.stops.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{s.order + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.contact.firstName} {s.contact.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{s.contact.address1}</p>
                </div>
                {s.visited
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {turfs.map((turf) => {
          const pct = turf.totalStops > 0 ? Math.round((turf.completedStops / turf.totalStops) * 100) : 0;
          const s = STATUS_LABELS[turf.status] ?? STATUS_LABELS.draft;
          return (
            <div key={turf.id} className="bg-white border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{turf.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.colour}`}>{s.label}</span>
                    {turf.ward && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Ward {turf.ward}</span>}
                    {turf.pollNumber && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Poll {turf.pollNumber}</span>}
                    {turf.oddEven !== "all" && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 capitalize">{turf.oddEven} side</span>}
                  </div>
                </div>
                <button onClick={() => deleteTurf(turf.id)} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>

              {/* Completion bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{turf.completedStops}/{turf.totalStops} stops</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Assignee */}
              {turf.assignedUser ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{turf.assignedUser.name ?? turf.assignedUser.email}</span>
                </div>
              ) : (
                <p className="text-xs text-amber-600 mb-3 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Unassigned</p>
              )}
              {turf.assignedGroup && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span className="truncate">{turf.assignedGroup.name}</span>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => onOpenDetail(turf)} className="flex-1 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  View stops
                </button>
                <button onClick={() => setAssigning(assigning === turf.id ? null : turf.id)} className="flex-1 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  {turf.assignedUser ? "Reassign" : "Assign"}
                </button>
                <button onClick={() => setAssigningGroup(assigningGroup === turf.id ? null : turf.id)} className="flex-1 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors">
                  Group
                </button>
              </div>

              {/* Assign dropdown */}
              {assigning === turf.id && (
                <div className="mt-2 border rounded-xl bg-white shadow-lg z-10 overflow-hidden">
                  {teamMembers.map((m) => (
                    <button key={m.id} onClick={() => assign(turf.id, m.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {m.name ?? m.email}
                    </button>
                  ))}
                </div>
              )}

              {assigningGroup === turf.id && (
                <div className="mt-2 border rounded-xl bg-white shadow-lg z-10 overflow-hidden">
                  <button onClick={() => assignGroup(turf.id, "")}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-gray-500">
                    Clear group assignment
                  </button>
                  {volunteerGroups.map((g) => (
                    <button key={g.id} onClick={() => assignGroup(turf.id, g.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2">
                      <span>{g.name}</span>
                      {g.targetWard && <span className="text-xs text-gray-400">Ward {g.targetWard}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Create Turf Tab ────────────────────────────────────────────────────────── */

function CreateTurfTab({ campaignId, teamMembers, onCreated }: {
  campaignId: string;
  teamMembers: TeamMember[];
  onCreated: () => void;
}) {
  const MAX_TURF_STOPS = 500;
  const LARGE_TURF_WARNING = 400;
  const RECOMMENDED_MAX_STOPS = 180;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [pollNumber, setPollNumber] = useState("");
  const [selectedStreets, setSelectedStreets] = useState<string[]>([]);
  const [oddEven, setOddEven] = useState<"all" | "odd" | "even">("all");
  const [notes, setNotes] = useState("");

  const [previewContacts, setPreviewContacts] = useState<PreviewContact[]>([]);
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [availablePolls, setAvailablePolls] = useState<string[]>([]);
  const [availableStreets, setAvailableStreets] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [assignTo, setAssignTo] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTurfId, setCreatedTurfId] = useState<string | null>(null);
  const [routeStats, setRouteStats] = useState<{ distanceMetres: number; estimatedMinutes: number } | null>(null);
  const [optimizedStops, setOptimizedStops] = useState<MapStop[]>([]);

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const p = new URLSearchParams({ campaignId, oddEven });
      if (ward) p.set("ward", ward);
      if (pollNumber) p.set("pollNumber", pollNumber);
      selectedStreets.forEach((s) => p.append("streets", s));
      const res = await fetch(`/api/turf/preview?${p}`);
      const data = await res.json();
      setPreviewContacts(data.contacts ?? []);
      setAvailableWards(data.wards ?? []);
      setAvailablePolls(data.polls ?? []);
      setAvailableStreets(data.streets ?? []);
    } catch { toast.error("Failed to load preview"); }
    finally { setLoadingPreview(false); }
  }, [campaignId, ward, pollNumber, selectedStreets, oddEven]);

  // Load available options on mount and on filter change
  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  async function saveAndOptimize() {
    if (!name.trim()) { toast.error("Please enter a turf name"); return; }
    if (!previewContacts.length) { toast.error("No contacts match your filters"); return; }
    if (previewContacts.length > MAX_TURF_STOPS) {
      toast.error(`Turf too large (${previewContacts.length} stops). Reduce filters to ${MAX_TURF_STOPS} stops or fewer.`);
      return;
    }
    setSaving(true);
    try {
      // 1. Create turf
      const res = await fetch("/api/turf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId, name, ward: ward || undefined, pollNumber: pollNumber || undefined,
          streets: selectedStreets, oddEven, notes: notes || undefined,
          contactIds: previewContacts.map((c) => c.id),
        }),
      });
      if (!res.ok) throw new Error("Failed to create turf");
      const data = await res.json();
      const turfId = data.data.id;
      setCreatedTurfId(turfId);

      // 2. Run route optimization
      setOptimizing(true);
      const optRes = await fetch(`/api/turf/${turfId}/optimize`, { method: "POST" });
      const optData = await optRes.json();
      setRouteStats(optData.data);

      // 3. Assign if selected
      if (assignTo) {
        await fetch(`/api/turf/${turfId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedUserId: assignTo, status: "assigned" }),
        });
      }

      // 4. Build optimized stops for map preview
      const detailRes = await fetch(`/api/turf/${turfId}`);
      const detailData = await detailRes.json();
      const stops: MapStop[] = (detailData.data.stops ?? [])
        .filter((s: { contact: { household: { lat: number | null; lng: number | null } | null } }) => s.contact.household?.lat)
        .map((s: {
          id: string; order: number; visited: boolean;
          contact: { firstName: string; lastName: string; address1: string | null; household: { lat: number; lng: number } };
        }) => ({
          id: s.id,
          lat: s.contact.household!.lat,
          lng: s.contact.household!.lng,
          label: `${s.contact.firstName} ${s.contact.lastName} · ${s.contact.address1 ?? ""}`,
          visited: s.visited,
          order: s.order,
        }));
      setOptimizedStops(stops);
      setStep(3);
      toast.success("Turf created and route optimized!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
      setOptimizing(false);
    }
  }

  const toggleStreet = (street: string) => {
    setSelectedStreets((prev) =>
      prev.includes(street) ? prev.filter((s) => s !== street) : [...prev, street]
    );
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500")}>
              {s}
            </div>
            {s < 3 && <div className={cn("w-12 h-0.5 transition-colors", step > s ? "bg-blue-600" : "bg-gray-200")} />}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {step === 1 ? "Filters" : step === 2 ? "Preview & Optimize" : "Done"}
        </span>
      </div>

      {/* Step 1: Filters */}
      {step === 1 && (
        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-gray-900">Define your turf</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Turf name <span className="text-red-500">*</span>
              <FieldHelp content="A short name for this canvassing zone. Used when assigning canvassers and on the printed walk list." example="Ward 4 North — Odd side" />
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward 4 North — Odd side"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Ward
                <FieldHelp content="Filter contacts by electoral ward. Leave blank to include all wards in your contact list." example="Ward 4" />
              </label>
              <select value={ward} onChange={(e) => setWard(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All wards</option>
                {availableWards.map((w) => <option key={w} value={w ?? ""}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Poll number
                <FieldHelp content="Filter contacts to a specific polling division. Useful for targeted canvassing of a single poll." example="Poll 023" tip="Poll numbers come from your voter file import." />
              </label>
              <select value={pollNumber} onChange={(e) => setPollNumber(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All polls</option>
                {availablePolls.map((p) => <option key={p} value={p ?? ""}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              Street side
              <FieldHelp content="Canvass only odd-numbered addresses, only even, or both sides of the street. Splitting a street by side is a common technique to divide a turf between two canvassers." />
            </label>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
              {(["all", "odd", "even"] as const).map((v) => (
                <button key={v} onClick={() => setOddEven(v)}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                    oddEven === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
                  {v === "all" ? "Both sides" : `${v} numbers`}
                </button>
              ))}
            </div>
          </div>

          {availableStreets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                Streets ({selectedStreets.length === 0 ? "all" : selectedStreets.length + " selected"})
                <FieldHelp content="Select specific streets to include in this turf. Leave all unchecked to include every street in the selected ward/poll." tip="Picking 2–3 streets makes a manageable 2-hour turf." />
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-0.5">
                {availableStreets.map((street) => (
                  <label key={street} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedStreets.includes(street ?? "")} onChange={() => toggleStreet(street ?? "")}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">{street}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Assign to
              <FieldHelp content="The volunteer responsible for this turf. They will see it in their walk list app and receive the optimised route. You can change this at any time." tip="Leave blank to assign later from the Turfs list." />
            </label>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Assign later</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Notes
              <FieldHelp content="Route instructions or context for the canvasser — parking spots, locked buildings, or anything worth knowing before they start." example="Park on Oak Ave. Building at 42 has intercom code 1234." />
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Parking tips, building codes, or anything the canvasser should know…"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <button onClick={() => setStep(2)} disabled={!name.trim()}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            Preview contacts ({loadingPreview ? "..." : previewContacts.length}) <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Preview + Optimize */}
      {step === 2 && (
        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Preview — {previewContacts.length} contacts</h2>
            <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:text-blue-800">← Edit filters</button>
          </div>

          {loadingPreview ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : !previewContacts.length ? (
            <div className="text-center py-8 text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contacts match these filters</p>
            </div>
          ) : (
            <>
              {previewContacts.length > RECOMMENDED_MAX_STOPS && previewContacts.length <= LARGE_TURF_WARNING && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Large turf</p>
                      <p className="text-xs mt-0.5">
                        This turf has {previewContacts.length} stops. Recommended max is {RECOMMENDED_MAX_STOPS} for a manageable shift.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {previewContacts.length > LARGE_TURF_WARNING && previewContacts.length <= MAX_TURF_STOPS && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold">Very large turf warning</p>
                      <p className="text-xs mt-0.5">
                        This turf has {previewContacts.length} stops, exceeding the recommended {LARGE_TURF_WARNING} stop limit. Consider splitting into smaller turfs for better canvasser efficiency. Hard cap is {MAX_TURF_STOPS}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {previewContacts.length > MAX_TURF_STOPS && (
                <div className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-semibold">Turf exceeds maximum</p>
                      <p className="text-xs mt-0.5">
                        {previewContacts.length} stops exceeds the hard cap of {MAX_TURF_STOPS}. Narrow your filters to reduce the turf size.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total", val: previewContacts.length },
                  { label: "With GPS", val: previewContacts.filter((c) => c.household?.lat).length },
                  { label: "No GPS", val: previewContacts.filter((c) => !c.household?.lat).length },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-gray-900">{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Contact list preview */}
              <div className="max-h-48 overflow-y-auto divide-y border rounded-xl">
                {previewContacts.slice(0, 50).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", c.household?.lat ? "bg-green-400" : "bg-gray-300")} />
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">{c.firstName} {c.lastName}</span>
                    <span className="text-xs text-gray-500 truncate">{c.address1}</span>
                  </div>
                ))}
                {previewContacts.length > 50 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">+ {previewContacts.length - 50} more</div>
                )}
              </div>
            </>
          )}

          <button onClick={saveAndOptimize} disabled={saving || !previewContacts.length}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{optimizing ? "Optimizing route…" : "Creating turf…"}</>
            ) : (
              <><Zap className="w-4 h-4" />Create & Optimize Route</>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Done — show map */}
      {step === 3 && createdTurfId && (
        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Turf created!</h2>
              <p className="text-sm text-gray-500">{previewContacts.length} stops · route optimized</p>
            </div>
          </div>

          {routeStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{(routeStats.distanceMetres / 1000).toFixed(1)} km</div>
                <div className="text-xs text-blue-600">Walking distance</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-purple-700">{routeStats.estimatedMinutes} min</div>
                <div className="text-xs text-purple-600">Est. time (incl. doors)</div>
              </div>
            </div>
          )}

          {optimizedStops.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Optimized walking route</p>
              <TurfMap stops={optimizedStops} showRoute height="280px" />
            </div>
          )}

          <button onClick={onCreated} className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
            View all turfs →
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Manager Map Tab ────────────────────────────────────────────────────────── */

function ManagerMapTab({ canvassers, turfs, onRefresh }: {
  canvassers: CanvasserPin[];
  turfs: TurfSummary[];
  onRefresh: () => void;
}) {
  const completedTurfs = turfs.filter((t) => t.status === "completed").length;
  const inProgressTurfs = turfs.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />{canvassers.length} active canvassers</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{completedTurfs} completed</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{inProgressTurfs} in progress</span>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <TurfMap canvassers={canvassers} height="480px" zoom={12} />
      </div>

      {canvassers.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No active canvassers in the last 2 hours</p>
          <p className="mt-1 text-xs">Canvassers share their GPS location automatically while using the walk list app</p>
        </div>
      )}

      {/* Active canvasser list */}
      {canvassers.length > 0 && (
        <div className="bg-white border rounded-2xl divide-y">
          {canvassers.map((c) => {
            const mins = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 60000);
            return (
              <div key={c.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</p>
                </div>
                <span className="text-xs text-gray-400">{mins < 1 ? "just now" : `${mins}m ago`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
