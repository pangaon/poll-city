"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, MapPin, Users, BookOpen, RefreshCw,
} from "lucide-react";
import {
  Button, Card, CardHeader, CardContent, PageHeader, Modal,
  FormField, Input, Textarea, Select, EmptyState,
} from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCanvassListSchema, CreateCanvassListInput } from "@/lib/validators";
import dynamic from "next/dynamic";
import type { MapTurfSelection } from "@/components/maps/campaign-map";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

/* ─── Brand colours ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

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

interface Props {
  campaignId: string;
  currentUserId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
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
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [litDropMode, setLitDropMode] = useState(false);
  const [turfPanelOpen, setTurfPanelOpen] = useState(false);
  const [savingTurf, setSavingTurf] = useState(false);
  const [activeTurfId, setActiveTurfId] = useState<string | null>(null);
  const [activeTurfName, setActiveTurfName] = useState("");
  const [draftCoordinates, setDraftCoordinates] = useState<Array<[number, number]>>([]);
  const [turfAssigneeId, setTurfAssigneeId] = useState("");
  const [turfCanvassDate, setTurfCanvassDate] = useState("");
  const [turfNotes, setTurfNotes] = useState("");

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

  // Refresh canvasser locations every 30s
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

  function hydratePanelFromSelection(selection: MapTurfSelection) {
    setActiveTurfId(selection.id);
    setActiveTurfName(selection.name ?? (selection.id ? "Selected Turf" : `New Turf ${new Date().toLocaleDateString()}`));
    setDraftCoordinates(selection.coordinates);
    setTurfPanelOpen(true);
  }

  async function loadExistingTurf(id: string) {
    try {
      const res = await fetch(`/api/turf/${id}`);
      if (!res.ok) return;
      const payload = await res.json();
      const turf = payload?.data;
      if (!turf) return;
      setTurfAssigneeId(turf.assignedUserId ?? "");
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
        const patchRes = await fetch(`/api/turf/${activeTurfId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedUserId: turfAssigneeId || null,
            status: turfAssigneeId ? "assigned" : "draft",
            notes: serializeNotes(turfCanvassDate, turfNotes),
            name: activeTurfName || "Selected Turf",
          }),
        });
        if (!patchRes.ok) { toast.error("Failed to save turf details"); return; }
        toast.success("Turf details saved");
        setTurfPanelOpen(false);
        load();
        return;
      }
      if (draftCoordinates.length < 3) { toast.error("Draw a turf area with at least 3 points"); return; }
      const contactsRes = await fetch(`/api/maps/contacts-geojson?campaignId=${campaignId}&take=10000`);
      if (!contactsRes.ok) { toast.error("Could not load map contacts for this turf"); return; }
      const contactsGeo = await contactsRes.json();
      const contactIds: string[] = (contactsGeo?.features ?? [])
        .filter((feature: { geometry?: { coordinates?: [number, number] }; properties?: { id?: string } }) => {
          const coordinates = feature.geometry?.coordinates;
          if (!coordinates || coordinates.length < 2) return false;
          return pointInPolygon([coordinates[1], coordinates[0]], draftCoordinates);
        })
        .map((feature: { properties?: { id?: string } }) => feature.properties?.id)
        .filter((id: string | undefined): id is string => Boolean(id));
      if (!contactIds.length) { toast.error("No contacts found in the selected turf area"); return; }
      const boundary = {
        type: "Polygon",
        coordinates: [[...draftCoordinates.map(([lat, lng]) => [lng, lat]), [draftCoordinates[0][1], draftCoordinates[0][0]]]],
      };
      const createRes = await fetch("/api/turf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: activeTurfName || `Turf ${new Date().toLocaleDateString()}`,
          contactIds,
          notes: serializeNotes(turfCanvassDate, turfNotes),
          assignedUserId: turfAssigneeId || null,
          boundary,
          centroid: centroidForPolygon(draftCoordinates),
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        toast.error(err?.error ?? "Failed to save turf");
        return;
      }
      toast.success("Turf created and saved");
      setTurfPanelOpen(false);
      load();
    } finally {
      setSavingTurf(false);
    }
  }

  async function assign() {
    if (!assignUserId || !showAssign) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/canvass/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvassListId: showAssign, userId: assignUserId }),
      });
      if (res.ok) { toast.success("Volunteer assigned"); setShowAssign(null); load(); } else toast.error("Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

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
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> New List
            </Button>
          </div>
        }
      />

      {/* ── Turf Overview with Completion Percentages ── */}
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

      {/* ── Active Canvassers List ── */}
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

      {/* ── Literature Drop Mode Toggle ── */}
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
                  {litDropMode ? "Drop mode active -- tap each house as you deliver flyers" : "Switch to literature drop mode for flyer delivery"}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setLitDropMode(!litDropMode); toast(litDropMode ? "Literature drop mode off" : "Literature drop mode on"); }}
              className={cn(
                "relative w-12 h-7 rounded-full transition-colors",
                litDropMode ? "bg-green-500" : "bg-gray-300",
              )}
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
          <h2 className="text-sm font-semibold text-gray-900">Campaign Map</h2>
          <p className="text-xs text-gray-500">Draw turfs, review volunteer coverage, and estimate effort live.</p>
        </CardHeader>
        <CardContent>
          <CampaignMap
            mode="canvassing"
            height={460}
            showControls
            showCalculator
            onTurfDraw={(coordinates) => {
              setTurfAssigneeId("");
              setTurfCanvassDate("");
              setTurfNotes("");
              hydratePanelFromSelection({
                id: null,
                name: `New Turf ${new Date().toLocaleDateString()}`,
                coordinates,
                stats: { doors: 0, knocked: 0, supporters: 0, estimatedHours: 0, volunteersNeeded: 1 },
              });
            }}
            onTurfClick={(selection) => {
              hydratePanelFromSelection(selection);
              if (selection.id) {
                void loadExistingTurf(selection.id);
              } else {
                setTurfAssigneeId("");
                setTurfCanvassDate("");
                setTurfNotes("");
              }
            }}
          />
        </CardContent>
      </Card>

      {/* ── Turf panel ── */}
      {turfPanelOpen && (
        <div className="fixed inset-0 z-[1400] bg-black/35" onClick={() => setTurfPanelOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl p-5 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Turf Details</h3>
              <button onClick={() => setTurfPanelOpen(false)} className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close turf panel">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <FormField label="Turf name">
                <Input value={activeTurfName} onChange={(e) => setActiveTurfName(e.target.value)} placeholder="Ward 3 North" />
              </FormField>
              <FormField label="Assign volunteer">
                <Select value={turfAssigneeId} onChange={(e) => setTurfAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email ?? "Volunteer"}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Canvass date">
                <Input type="date" value={turfCanvassDate} onChange={(e) => setTurfCanvassDate(e.target.value)} />
              </FormField>
              <FormField label="Notes">
                <Textarea rows={4} value={turfNotes} onChange={(e) => setTurfNotes(e.target.value)} placeholder="Instructions, route notes, or key talking points" />
              </FormField>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setTurfPanelOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={saveTurfFlow} loading={savingTurf} className="flex-1">Save</Button>
              </div>
            </div>
          </aside>
        </div>
      )}

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
                    {list.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{list.description}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", statusColors[list.status])}>{statusLabels[list.status]}</span>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{list.assignments.length} assigned</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Created {formatDate(list.createdAt)}</div>
                </div>
                {list.assignments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Assigned to</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.assignments.map((a) => (
                        <span key={a.id} className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[a.status])}>
                          {a.user.name ?? "Unknown"} -- {statusLabels[a.status]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => { setShowAssign(list.id); setAssignUserId(""); }} className="flex-1">
                    <Users className="w-3.5 h-3.5" /> Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create list modal ── */}
      <CreateCanvassModal open={showCreate} onClose={() => setShowCreate(false)} campaignId={campaignId} onCreated={() => { setShowCreate(false); load(); }} />

      {/* ── Assign modal ── */}
      <Modal open={!!showAssign} onClose={() => setShowAssign(null)} title="Assign Volunteer" size="sm">
        <div className="space-y-4">
          <FormField label="Select Volunteer">
            <Select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
              <option value="">Choose a volunteer...</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAssign(null)} className="flex-1">Cancel</Button>
            <Button onClick={assign} loading={assigning} disabled={!assignUserId} className="flex-1">Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Create Canvass Modal ──────────────────────────────────────────────────── */

function CreateCanvassModal({ open, onClose, campaignId, onCreated }: { open: boolean; onClose: () => void; campaignId: string; onCreated: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateCanvassListInput>({
    resolver: zodResolver(createCanvassListSchema),
    defaultValues: { campaignId },
  });
  async function onSubmit(data: CreateCanvassListInput) {
    const res = await fetch("/api/canvass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast.success("Canvass list created"); reset(); onCreated(); } else { const e = await res.json(); toast.error(e.error ?? "Failed"); }
  }
  return (
    <Modal open={open} onClose={onClose} title="New Canvass List" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <FormField label="List Name" error={errors.name?.message} required>
          <Input {...register("name")} placeholder="East Ward 12 -- April Blitz" />
        </FormField>
        <FormField label="Description">
          <Textarea {...register("description")} rows={2} placeholder="Target area, focus, instructions for volunteers..." />
        </FormField>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create</Button>
        </div>
      </form>
    </Modal>
  );
}
