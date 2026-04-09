"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MapPin, Users, BookOpen, RefreshCw, Printer,
  CheckCircle2, Navigation, ClipboardList, ChevronRight,
  ChevronLeft, X,
} from "lucide-react";
import {
  Button, Card, CardHeader, CardContent, PageHeader, Modal,
  FormField, Input, Textarea, Select, EmptyState, MultiSelect,
  AddressAutocomplete,
} from "@/components/ui";
import type { AddressResult } from "@/components/ui";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { MapTurfSelection } from "@/components/maps/campaign-map";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

/* ─── Brand colours ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface AreaStats {
  doors: number;
  knocked: number;
  supporters: number;
  estimatedHours: number;
  volunteersNeeded: number;
}

interface CanvassList {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  assignments: { id: string; status: string; user: { id: string; name: string | null } }[];
}

interface TurfSummary {
  id: string;
  name: string;
  status: string;
  totalStops: number;
  completedStops: number;
  assignedUser: { id: string; name: string | null } | null;
}

interface CanvasserLocation {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
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
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-600",
  assigned: "bg-blue-100 text-blue-700",
};
const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  paused: "Paused",
  draft: "Draft",
  assigned: "Assigned",
};

/* ─── Shimmer Skeleton ──────────────────────────────────────────────────────── */

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gray-200", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function CanvassingClient({ campaignId, currentUserId, teamMembers }: Props) {
  const [lists, setLists] = useState<CanvassList[]>([]);
  const [turfs, setTurfs] = useState<TurfSummary[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [litDropMode, setLitDropMode] = useState(false);

  // Turf draw panel
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listsRes, turfsRes, locRes] = await Promise.all([
        fetch(`/api/canvass?campaignId=${campaignId}`),
        fetch(`/api/turf?campaignId=${campaignId}`),
        fetch(`/api/canvasser/location?campaignId=${campaignId}`),
      ]);
      const [listsData, turfsData, locData] = await Promise.all([
        listsRes.json(),
        turfsRes.json(),
        locRes.json(),
      ]);
      setLists(listsData.data ?? []);
      setTurfs(turfsData.data ?? []);
      setCanvassers(
        (locData.data ?? []).map((l: { user: { id: string; name: string | null }; lat: number; lng: number; updatedAt: string }) => ({
          userId: l.user.id,
          name: l.user.name ?? "Canvasser",
          lat: l.lat,
          lng: l.lng,
          updatedAt: l.updatedAt,
        })),
      );
    } catch {
      toast.error("Failed to load canvassing data");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/canvasser/location?campaignId=${campaignId}`);
        const data = await res.json();
        setCanvassers(
          (data.data ?? []).map((l: { user: { id: string; name: string | null }; lat: number; lng: number; updatedAt: string }) => ({
            userId: l.user.id,
            name: l.user.name ?? "Canvasser",
            lat: l.lat,
            lng: l.lng,
            updatedAt: l.updatedAt,
          })),
        );
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [campaignId]);

  function centroidForPolygon(points: Array<[number, number]>) {
    if (!points.length) return null;
    const sum = points.reduce((acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), { lat: 0, lng: 0 });
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
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

  function serializeNotes(canvassDate: string, notes: string) {
    const parts = [] as string[];
    if (canvassDate) parts.push(`Canvass date: ${canvassDate}`);
    if (notes.trim()) parts.push(notes.trim());
    return parts.join("\n\n");
  }

  function openTurfPanel(selection: MapTurfSelection, stats: AreaStats | null = null) {
    setActiveTurfId(selection.id);
    setActiveTurfName(
      selection.name ?? (selection.id ? "Selected Turf" : `New Turf ${new Date().toLocaleDateString()}`),
    );
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
    } catch {}
  }

  async function saveTurfFlow() {
    if (!turfPanelOpen) return;
    setSavingTurf(true);
    try {
      if (activeTurfId) {
        // Update existing turf
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
        if (!patchRes.ok) {
          toast.error("Failed to save turf details");
          return;
        }
        toast.success("Turf details saved");
        setTurfPanelOpen(false);
        load();
        return;
      }

      // Create new turf
      if (draftCoordinates.length < 3) {
        toast.error("Draw a turf area with at least 3 points");
        return;
      }

      const contactsRes = await fetch(`/api/maps/contacts-geojson?campaignId=${campaignId}&take=10000`);
      if (!contactsRes.ok) {
        toast.error("Could not load map contacts for this turf");
        return;
      }
      const contactsGeo = await contactsRes.json();
      const contactIds: string[] = (contactsGeo?.features ?? [])
        .filter((feature: { geometry?: { coordinates?: [number, number] }; properties?: { id?: string } }) => {
          const coordinates = feature.geometry?.coordinates;
          if (!coordinates || coordinates.length < 2) return false;
          return pointInPolygon([coordinates[1], coordinates[0]], draftCoordinates);
        })
        .map((feature: { properties?: { id?: string } }) => feature.properties?.id)
        .filter((id: string | undefined): id is string => Boolean(id));

      if (!contactIds.length) {
        toast.error("No contacts found in the selected turf area");
        return;
      }

      const boundary = {
        type: "Polygon",
        coordinates: [[...draftCoordinates.map(([lat, lng]) => [lng, lat]), [draftCoordinates[0][1], draftCoordinates[0][0]]]],
      };

      const primaryAssignee = turfAssigneeIds[0] ?? null;
      const createRes = await fetch("/api/turf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: activeTurfName || `Turf ${new Date().toLocaleDateString()}`,
          contactIds,
          notes: serializeNotes(turfCanvassDate, turfNotes),
          assignedUserId: primaryAssignee,
          boundary,
          centroid: centroidForPolygon(draftCoordinates),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        toast.error(err?.error ?? "Failed to save turf");
        return;
      }

      const turfData = await createRes.json();
      const newTurfId = turfData?.data?.id as string | undefined;

      // Show success in-panel with CTAs
      setSavedTurf({
        id: newTurfId ?? "",
        name: activeTurfName || "New Turf",
        contactCount: contactIds.length,
      });
      load();
    } finally {
      setSavingTurf(false);
    }
  }

  // Bulk assign: sends all selectedIds to the canvass list
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
        setShowAssign(null);
        setAssignUserIds([]);
        load();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to assign");
      }
    } finally {
      setAssigning(false);
    }
  }

  const teamOptions = teamMembers.map((m) => ({
    label: m.name ?? m.email ?? "Team member",
    value: m.id,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Canvassing"
        description="Manage walk lists, turfs, and track door-knock progress"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => load()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Link href={`/canvassing/print-walk-list?campaignId=${campaignId}`}>
              <Button size="sm" variant="outline">
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Walk List
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> New List
            </Button>
          </div>
        }
      />

      {/* ── Turf Overview ── */}
      {turfs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Turfs Overview</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {turfs.slice(0, 10).map((turf) => {
                const pct = turf.totalStops > 0 ? Math.round((turf.completedStops / turf.totalStops) * 100) : 0;
                return (
                  <div key={turf.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{turf.name}</p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusColors[turf.status])}>
                          {statusLabels[turf.status] ?? turf.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? GREEN : NAVY }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                        <span className="text-xs text-gray-400">{turf.completedStops}/{turf.totalStops}</span>
                      </div>
                    </div>
                    {turf.assignedUser && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{turf.assignedUser.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Active Canvassers ── */}
      {canvassers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-900">Active Canvassers ({canvassers.length})</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {canvassers.map((c) => {
                const mins = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 60000);
                return (
                  <div key={c.userId} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                      style={{ backgroundColor: NAVY }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{mins < 1 ? "active now" : `${mins}m ago`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Literature Drop Mode ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", litDropMode ? "bg-green-100" : "bg-gray-100")}>
                <BookOpen className={cn("w-4 h-4", litDropMode ? "text-green-600" : "text-gray-400")} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Literature Drop Mode</h3>
                <p className="text-sm text-gray-500">
                  {litDropMode ? "Drop mode active — tap each house as you deliver flyers" : "Switch to literature drop mode for flyer delivery"}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setLitDropMode(!litDropMode); toast(litDropMode ? "Literature drop mode off" : "Literature drop mode on"); }}
              className={cn("relative w-12 h-7 rounded-full transition-colors", litDropMode ? "bg-green-500" : "bg-gray-300")}
            >
              <motion.div
                animate={{ x: litDropMode ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
              />
            </motion.button>
          </div>
        </CardContent>
      </Card>

      {/* ── Campaign Map ── */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Campaign Map</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click <strong>Draw Turf</strong> to select an area, then <strong>Create Turf</strong> to save it as a walk list.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <CampaignMap
            mode="canvassing"
            height={460}
            showControls
            showCalculator
            onTurfDraw={(coordinates, stats) => {
              setTurfAssigneeIds([]);
              setTurfCanvassDate("");
              setTurfNotes("");
              openTurfPanel(
                {
                  id: null,
                  name: `New Turf ${new Date().toLocaleDateString()}`,
                  coordinates,
                  stats,
                },
                stats,
              );
            }}
            onTurfClick={(selection) => {
              openTurfPanel(selection, null);
              if (selection.id) {
                void loadExistingTurf(selection.id);
              } else {
                setTurfAssigneeIds([]);
                setTurfCanvassDate("");
                setTurfNotes("");
              }
            }}
          />
        </CardContent>
      </Card>

      {/* ── Turf panel (slide-over) ── */}
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
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {savedTurf ? "Turf Saved" : activeTurfId ? "Edit Turf" : "Save This Turf"}
                  </h3>
                  <button
                    onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}
                    className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ── Success state after save ── */}
                {savedTurf ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900">{savedTurf.name}</h4>
                      <p className="text-gray-500 mt-1">
                        {savedTurf.contactCount} door{savedTurf.contactCount !== 1 ? "s" : ""} ready to knock
                      </p>
                    </div>
                    <div className="w-full space-y-3">
                      <Link
                        href={`/canvassing/walk?turfId=${savedTurf.id}&campaignId=${campaignId}`}
                        className="w-full"
                      >
                        <Button className="w-full" size="lg">
                          <Navigation className="w-4 h-4 mr-1" /> Start Walk List
                        </Button>
                      </Link>
                      <Link
                        href={`/canvassing/print-walk-list?campaignId=${campaignId}&turfId=${savedTurf.id}`}
                        target="_blank"
                        className="w-full"
                      >
                        <Button variant="outline" className="w-full" size="lg">
                          <Printer className="w-4 h-4 mr-1" /> Print Walk List
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}
                      >
                        <ClipboardList className="w-4 h-4 mr-1" /> Back to Map
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── Save form ── */
                  <div className="flex-1 flex flex-col">
                    {/* Area stats (shown when drawing a new turf) */}
                    {!activeTurfId && draftStats && (
                      <div className="mb-5 grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-blue-700">{draftStats.doors}</p>
                          <p className="text-xs text-blue-600 mt-0.5">Doors</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-emerald-700">{draftStats.supporters}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Supporters</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-amber-700">{draftStats.estimatedHours.toFixed(1)}h</p>
                          <p className="text-xs text-amber-600 mt-0.5">Est. time</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 flex-1">
                      <FormField label="Turf name">
                        <Input
                          value={activeTurfName}
                          onChange={(e) => setActiveTurfName(e.target.value)}
                          placeholder="Ward 3 North, Bloor Street Block…"
                        />
                      </FormField>

                      <FormField
                        label={`Assign volunteer${turfAssigneeIds.length > 1 ? "s" : ""}`}
                      >
                        <MultiSelect
                          value={turfAssigneeIds}
                          onChange={setTurfAssigneeIds}
                          options={teamOptions}
                          placeholder="Select one or more volunteers…"
                        />
                        {teamOptions.length === 0 && (
                          <p className="text-xs text-gray-400 mt-1">No team members available</p>
                        )}
                      </FormField>

                      <FormField label="Canvass date">
                        <Input
                          type="date"
                          value={turfCanvassDate}
                          onChange={(e) => setTurfCanvassDate(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Notes">
                        <Textarea
                          rows={3}
                          value={turfNotes}
                          onChange={(e) => setTurfNotes(e.target.value)}
                          placeholder="Route notes, talking points, or instructions for the volunteer…"
                        />
                      </FormField>
                    </div>

                    <div className="flex gap-3 pt-4 mt-auto border-t border-gray-100">
                      <Button
                        variant="outline"
                        onClick={() => { setTurfPanelOpen(false); setSavedTurf(null); }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button onClick={saveTurfFlow} loading={savingTurf} className="flex-1">
                        {activeTurfId ? "Save Changes" : "Save Turf"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Walk lists ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="h-24" />)}
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="w-10 h-10" />}
            title="No canvass lists"
            description="Create a walk list and assign it to volunteers to start tracking door-knock activity."
            action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create List</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="hover:shadow-md transition-shadow"
              draggable
              onDragStart={(event) => {
                const payload = JSON.stringify({
                  type: "canvass-list",
                  id: list.id,
                  name: list.name,
                  status: list.status,
                  assigned: list.assignments.length,
                });
                event.dataTransfer.setData("application/json", payload);
                event.dataTransfer.setData("text/plain", `Canvass list ${list.name}`);
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{list.description}</p>
                    )}
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", statusColors[list.status])}>
                    {statusLabels[list.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />{list.assignments.length} assigned
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />Created {formatDate(list.createdAt)}
                  </div>
                </div>
                {list.assignments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Assigned to</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.assignments.map((a) => (
                        <span key={a.id} className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[a.status])}>
                          {a.user.name ?? "Unknown"} — {statusLabels[a.status]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setShowAssign(list.id); setAssignUserIds([]); }}
                    className="flex-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create list modal (wizard) ── */}
      <CreateCanvassWizard
        open={showCreate}
        onClose={() => setShowCreate(false)}
        campaignId={campaignId}
        teamMembers={teamMembers}
        onCreated={() => { setShowCreate(false); load(); }}
      />

      {/* ── Bulk assign modal ── */}
      <Modal open={!!showAssign} onClose={() => { setShowAssign(null); setAssignUserIds([]); }} title="Assign Volunteers" size="sm">
        <div className="space-y-4">
          <FormField label="Select volunteers">
            <MultiSelect
              value={assignUserIds}
              onChange={setAssignUserIds}
              options={teamOptions}
              placeholder="Choose team members…"
            />
          </FormField>
          {teamOptions.length > 0 && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setAssignUserIds(teamOptions.map((o) => o.value))}
            >
              Assign entire team ({teamOptions.length})
            </button>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowAssign(null); setAssignUserIds([]); }} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={bulkAssign}
              loading={assigning}
              disabled={assignUserIds.length === 0}
              className="flex-1"
            >
              Assign{assignUserIds.length > 0 ? ` (${assignUserIds.length})` : ""}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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

  // Step 1 fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ward, setWard] = useState("");
  const [targetArea, setTargetArea] = useState("");

  // Step 2 fields
  const [targetSupportLevels, setTargetSupportLevels] = useState<string[]>(
    ["strong_support", "leaning_support", "undecided"],
  );

  // Step 3 fields
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);

  const teamOptions = teamMembers.map((m) => ({
    label: m.name ?? m.email ?? "Team member",
    value: m.id,
  }));

  function handleClose() {
    setStep(1);
    setName("");
    setDescription("");
    setWard("");
    setTargetArea("");
    setTargetSupportLevels(["strong_support", "leaning_support", "undecided"]);
    setAssignUserIds([]);
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      // Create the canvass list
      const res = await fetch("/api/canvass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: name.trim(),
          description: description.trim() || undefined,
          ward: ward.trim() || undefined,
          targetArea: targetArea.trim() || undefined,
          targetSupportLevels: targetSupportLevels.length > 0 ? targetSupportLevels : undefined,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error ?? "Failed to create list");
        return;
      }

      const data = await res.json();
      const listId = data?.data?.id as string | undefined;

      // Bulk-assign selected volunteers
      if (listId && assignUserIds.length > 0) {
        await fetch("/api/canvass/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvassListId: listId, userIds: assignUserIds }),
        });
      }

      toast.success("Canvass list created");
      handleClose();
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = ["List Details", "Target Voters", "Assign Volunteers"];
  const totalSteps = 3;

  return (
    <Modal open={open} onClose={handleClose} title="New Canvass List" size="sm">
      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-5">
        {stepTitles.map((title, i) => (
          <div key={title} className="flex items-center flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0",
                  i + 1 < step
                    ? "bg-emerald-500 text-white"
                    : i + 1 === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-400",
                )}
              >
                {i + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium hidden sm:inline", i + 1 === step ? "text-gray-900" : "text-gray-400")}>
                {title}
              </span>
            </div>
            {i < totalSteps - 1 && <div className="h-px bg-gray-200 flex-1 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: List details */}
      {step === 1 && (
        <div className="space-y-4">
          <FormField label="List name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="East Ward 12 — April Blitz"
              autoFocus
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Focus area, priority doors, or instructions for volunteers…"
            />
          </FormField>
          <FormField label="Ward / Poll number">
            <Input
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Ward 3, Poll 12A…"
            />
          </FormField>
          <FormField label="Target street or area">
            <AddressAutocomplete
              value={targetArea}
              onChange={setTargetArea}
              onSelect={(result: AddressResult) => {
                if (result.city) setTargetArea(result.city);
              }}
              placeholder="Search a street, neighbourhood, or postal code…"
            />
            <p className="text-xs text-gray-400 mt-1">
              Used to focus this list on a specific area — or type any description.
            </p>
          </FormField>
        </div>
      )}

      {/* Step 2: Target voters */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Which support levels should this walk list include?
            </p>
            <div className="space-y-2">
              {SUPPORT_LEVEL_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={targetSupportLevels.includes(opt.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetSupportLevels([...targetSupportLevels, opt.value]);
                      } else {
                        setTargetSupportLevels(targetSupportLevels.filter((l) => l !== opt.value));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            Tip: include <strong>Undecided</strong> and <strong>Leaning Support</strong> for persuasion canvassing. Focus on <strong>Strong Support</strong> for GOTV.
          </div>
        </div>
      )}

      {/* Step 3: Assign volunteers */}
      {step === 3 && (
        <div className="space-y-4">
          <FormField label="Assign to volunteers">
            <MultiSelect
              value={assignUserIds}
              onChange={setAssignUserIds}
              options={teamOptions}
              placeholder="Select one or more team members…"
            />
          </FormField>
          {teamOptions.length > 0 && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setAssignUserIds(teamOptions.map((o) => o.value))}
            >
              Assign entire team ({teamOptions.length})
            </button>
          )}
          <p className="text-xs text-gray-400">
            You can also assign later from the canvass list card.
          </p>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Summary</p>
            <p className="text-sm text-gray-700"><span className="font-medium">List:</span> {name}</p>
            {ward && <p className="text-sm text-gray-700"><span className="font-medium">Ward:</span> {ward}</p>}
            <p className="text-sm text-gray-700">
              <span className="font-medium">Targeting:</span>{" "}
              {targetSupportLevels.length === 0 ? "All support levels" : `${targetSupportLevels.length} support level${targetSupportLevels.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        )}
        {step < totalSteps ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !name.trim()}
            className="flex-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleCreate}
            loading={submitting}
            disabled={!name.trim()}
            className="flex-1"
          >
            Create List
          </Button>
        )}
      </div>
    </Modal>
  );
}
