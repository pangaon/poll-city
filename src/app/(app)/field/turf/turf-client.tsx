"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map as MapIcon, Plus, X, CheckCircle2, Clock, PlayCircle,
  UserCheck, Users, ChevronRight, Navigation, AlertCircle,
  Trash2, Zap, BarChart3, RotateCcw, Home,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
  StatCard,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TurfStatus, FieldProgramType } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TurfRow {
  id: string;
  name: string;
  status: TurfStatus;
  ward: string | null;
  pollNumber: string | null;
  streets: string[];
  oddEven: string;
  totalStops: number;
  completedStops: number;
  completionPercent: number;
  estimatedMinutes: number | null;
  routeDistance: number | null;
  notes: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  assignedVolunteer: {
    user: { id: string; name: string | null; email: string };
  } | null;
  assignedGroup: { id: string; name: string } | null;
  _count: { stops: number; routes: number; fieldShifts: number };
}

interface Program { id: string; name: string; programType: FieldProgramType }
interface TeamMember { id: string; name: string | null; email: string }
interface DensityRow { poll: string; ward: string | null; contactCount: number }

interface StopDetail {
  id: string;
  order: number;
  visited: boolean;
  visitedAt: string | null;
  notes: string | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    address1: string | null;
    streetNumber: string | null;
    streetName: string | null;
    supportLevel: string | null;
  } | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialTurfs: TurfRow[];
  programs: Program[];
  teamMembers: TeamMember[];
  density: DensityRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TurfStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "default", icon: <Clock className="h-3 w-3" /> },
  assigned: { label: "Assigned", variant: "info", icon: <UserCheck className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "warning", icon: <PlayCircle className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  reassigned: { label: "Reassigned", variant: "default", icon: <RotateCcw className="h-3 w-3" /> },
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function assigneeName(turf: TurfRow): string | null {
  if (turf.assignedUser?.name) return turf.assignedUser.name;
  if (turf.assignedUser?.email) return turf.assignedUser.email;
  if (turf.assignedVolunteer?.user?.name) return turf.assignedVolunteer.user.name;
  if (turf.assignedVolunteer?.user?.email) return turf.assignedVolunteer.user.email;
  if (turf.assignedGroup?.name) return `Group: ${turf.assignedGroup.name}`;
  return null;
}

function completionColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-400";
  if (pct > 0) return "bg-blue-500";
  return "bg-gray-200";
}

// ── Create Drawer ──────────────────────────────────────────────────────────────

function CreateDrawer({
  campaignId,
  teamMembers,
  density,
  onClose,
  onCreate,
}: {
  campaignId: string;
  teamMembers: TeamMember[];
  density: DensityRow[];
  onClose: () => void;
  onCreate: (turf: TurfRow) => void;
}) {
  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [pollNumber, setPollNumber] = useState("");
  const [oddEven, setOddEven] = useState("all");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const distinctWards = Array.from(new Set(density.map((d) => d.ward).filter(Boolean) as string[]));
  const pollsForWard = ward
    ? density.filter((d) => d.ward === ward)
    : density;

  async function handlePreview() {
    if (!ward && !pollNumber) {
      toast.error("Select a ward or poll number to preview contacts");
      return;
    }
    setPreviewing(true);
    try {
      const sp = new URLSearchParams({ campaignId, oddEven });
      if (ward) sp.set("ward", ward);
      if (pollNumber) sp.set("pollNumber", pollNumber);
      const res = await fetch(`/api/turf/preview?${sp}`);
      const json = await res.json() as { total: number };
      setPreviewCount(json.total);
    } catch {
      toast.error("Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) { toast.error("Turf name is required"); return; }
    if (!ward && !pollNumber) { toast.error("Select a ward or poll number"); return; }
    setSaving(true);
    try {
      // First fetch contact IDs for this turf definition
      const sp = new URLSearchParams({ campaignId, oddEven });
      if (ward) sp.set("ward", ward);
      if (pollNumber) sp.set("pollNumber", pollNumber);
      const previewRes = await fetch(`/api/turf/preview?${sp}`);
      const previewJson = await previewRes.json() as { contacts: { id: string }[] };
      const contactIds = previewJson.contacts.map((c: { id: string }) => c.id);

      const res = await fetch("/api/field/turf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: name.trim(),
          ward: ward || undefined,
          pollNumber: pollNumber || undefined,
          oddEven,
          contactIds,
          assignedUserId: assignedUserId || null,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to create turf");
        return;
      }
      const data = await res.json() as { data: TurfRow };
      toast.success(`Turf "${data.data.name}" created with ${contactIds.length} stops`);
      onCreate(data.data);
      onClose();
    } catch {
      toast.error("Failed to create turf");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Create Turf</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <FormField label="Turf Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Poll 14 East — Odd Streets"
          />
        </FormField>

        <FormField label="Ward">
          <Select value={ward} onChange={(e) => { setWard(e.target.value); setPollNumber(""); setPreviewCount(null); }}>
            <option value="">— Any ward —</option>
            {distinctWards.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Poll Number">
          <Select value={pollNumber} onChange={(e) => { setPollNumber(e.target.value); setPreviewCount(null); }}>
            <option value="">— Any poll —</option>
            {pollsForWard.map((d) => (
              <option key={d.poll} value={d.poll}>
                Poll {d.poll} ({d.contactCount} contacts)
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Streets">
          <Select value={oddEven} onChange={(e) => { setOddEven(e.target.value); setPreviewCount(null); }}>
            <option value="all">All streets</option>
            <option value="odd">Odd side only</option>
            <option value="even">Even side only</option>
          </Select>
        </FormField>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            loading={previewing}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4" />
            Preview Contacts
          </Button>
          {previewCount !== null && (
            <span className="text-sm font-semibold text-emerald-600">
              {previewCount} contacts
            </span>
          )}
        </div>

        <FormField label="Assign To">
          <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.email}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions, access notes…"
            className="min-h-[72px]"
          />
        </FormField>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleCreate} loading={saving}>
          <Plus className="h-4 w-4" />
          Create Turf
        </Button>
      </div>
    </motion.div>
  );
}

// ── Edit Panel ─────────────────────────────────────────────────────────────────

function EditPanel({
  turf,
  campaignId,
  teamMembers,
  onClose,
  onUpdate,
  onDelete,
}: {
  turf: TurfRow;
  campaignId: string;
  teamMembers: TeamMember[];
  onClose: () => void;
  onUpdate: (updated: TurfRow) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(turf.name);
  const [status, setStatus] = useState<TurfStatus>(turf.status);
  const [assignedUserId, setAssignedUserId] = useState(turf.assignedUser?.id ?? "");
  const [notes, setNotes] = useState(turf.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [stops, setStops] = useState<StopDetail[] | null>(null);
  const [loadingStops, setLoadingStops] = useState(true);
  const [stopsExpanded, setStopsExpanded] = useState(false);

  const assignee = assigneeName(turf);

  // Lazy-load stops when panel opens
  useEffect(() => {
    setLoadingStops(true);
    fetch(`/api/field/turf/${turf.id}?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((json: { data: { stops: StopDetail[] } }) => {
        setStops(json.data.stops ?? []);
      })
      .catch(() => toast.error("Could not load stops"))
      .finally(() => setLoadingStops(false));
  }, [turf.id, campaignId]);

  async function handleToggleStop(stop: StopDetail) {
    const newVisited = !stop.visited;
    // Optimistic update
    setStops((prev) =>
      prev?.map((s) => (s.id === stop.id ? { ...s, visited: newVisited } : s)) ?? null,
    );
    try {
      const res = await fetch(`/api/field/turf/${turf.id}/stops/${stop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, visited: newVisited }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as {
        data: { turf: { completedStops: number; completionPercent: number } };
      };
      onUpdate({
        ...turf,
        completedStops: data.data.turf.completedStops,
        completionPercent: data.data.turf.completionPercent,
      });
    } catch {
      // Revert
      setStops((prev) =>
        prev?.map((s) => (s.id === stop.id ? { ...s, visited: stop.visited } : s)) ?? null,
      );
      toast.error("Failed to update stop");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/field/turf/${turf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: name.trim() || turf.name,
          status,
          assignedUserId: assignedUserId || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to update");
        return;
      }
      const data = await res.json() as { data: TurfRow };
      toast.success("Turf updated");
      onUpdate(data.data);
      onClose();
    } catch {
      toast.error("Failed to update turf");
    } finally {
      setSaving(false);
    }
  }

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const res = await fetch(
        `/api/field/turf/${turf.id}/optimize?campaignId=${campaignId}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Optimization failed");
        return;
      }
      const data = await res.json() as { data: { distanceKm: number; estimatedMinutes: number; optimizedStopCount: number } };
      toast.success(
        `Route optimized — ${data.data.distanceKm} km, ~${data.data.estimatedMinutes} min walk`,
      );
      // Reflect updated stats in parent
      onUpdate({
        ...turf,
        routeDistance: data.data.distanceKm,
        estimatedMinutes: data.data.estimatedMinutes,
      });
    } catch {
      toast.error("Optimization failed");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/field/turf/${turf.id}?campaignId=${campaignId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to delete");
        return;
      }
      toast.success(`Turf "${turf.name}" deleted`);
      onDelete(turf.id);
      onClose();
    } catch {
      toast.error("Failed to delete turf");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Edit Turf</h2>
          {assignee && (
            <p className="text-xs text-gray-500 mt-0.5">Assigned to {assignee}</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Completion summary */}
        <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center gap-4 text-sm">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Completion</span>
              <span className="font-semibold">{turf.completionPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completionColor(turf.completionPercent)}`}
                style={{ width: `${turf.completionPercent}%` }}
              />
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{turf.completedStops} / {turf.totalStops} stops</p>
            {turf.estimatedMinutes && <p>~{turf.estimatedMinutes} min</p>}
            {turf.routeDistance && <p>{turf.routeDistance} km</p>}
          </div>
        </div>

        {/* Optimize button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={handleOptimize}
          loading={optimizing}
        >
          <Zap className="h-4 w-4" />
          Optimize Walk Route
        </Button>

        {/* Stops list */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <button
            onClick={() => setStopsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-400" />
              Stops
              {!loadingStops && stops !== null && (
                <span className="text-xs text-gray-500 font-normal">
                  ({stops.filter((s) => s.visited).length}/{stops.length} visited)
                </span>
              )}
            </span>
            <ChevronRight
              className={`h-4 w-4 text-gray-400 transition-transform ${stopsExpanded ? "rotate-90" : ""}`}
            />
          </button>

          {stopsExpanded && (
            <div className="border-t border-gray-100">
              {loadingStops ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : stops === null || stops.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No stops in this turf.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {stops.map((stop) => {
                    const contactName =
                      [stop.contact?.firstName, stop.contact?.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unknown";
                    const address =
                      stop.contact?.address1 ??
                      [stop.contact?.streetNumber, stop.contact?.streetName]
                        .filter(Boolean)
                        .join(" ") ??
                      "No address";
                    return (
                      <label
                        key={stop.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={stop.visited}
                          onChange={() => handleToggleStop(stop)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contactName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{address}</p>
                        </div>
                        {stop.visited && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <FormField label="Turf Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>

        <FormField label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as TurfStatus)}>
            <option value="draft">Draft</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="reassigned">Reassigned</option>
          </Select>
        </FormField>

        <FormField label="Assign To">
          <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.email}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[72px]"
          />
        </FormField>

        {/* Geography info (read-only) */}
        <div className="rounded-lg border border-gray-100 px-4 py-3 space-y-1 text-sm text-gray-500">
          {turf.ward && <p>Ward: <span className="text-gray-800 font-medium">{turf.ward}</span></p>}
          {turf.pollNumber && <p>Poll: <span className="text-gray-800 font-medium">{turf.pollNumber}</span></p>}
          <p>Streets: <span className="text-gray-800 font-medium capitalize">{turf.oddEven === "all" ? "All" : turf.oddEven + " side"}</span></p>
          <p>Routes linked: <span className="text-gray-800 font-medium">{turf._count.routes}</span></p>
          <p>Shifts linked: <span className="text-gray-800 font-medium">{turf._count.fieldShifts}</span></p>
        </div>

        {/* Delete zone */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete this turf
          </button>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3">
            <p className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              This will permanently delete the turf and all its stops.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
}

// ── Turf Card ─────────────────────────────────────────────────────────────────

function TurfCard({
  turf,
  onSelect,
}: {
  turf: TurfRow;
  onSelect: (t: TurfRow) => void;
}) {
  const cfg = STATUS_CONFIG[turf.status];
  const assignee = assigneeName(turf);
  const pct = turf.completionPercent;

  return (
    <motion.div layout transition={SPRING}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(turf)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{turf.name}</h3>
                <Badge variant={cfg.variant}>
                  <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                {turf.ward && <span>Ward {turf.ward}</span>}
                {turf.pollNumber && <span>Poll {turf.pollNumber}</span>}
                {turf.oddEven !== "all" && <span className="capitalize">{turf.oddEven} side</span>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          </div>

          {/* Completion bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{turf.completedStops}/{turf.totalStops} stops</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completionColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              {assignee ? (
                <>
                  <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span className="truncate max-w-[140px]">{assignee}</span>
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5" />
                  <span>Unassigned</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {turf.estimatedMinutes && (
                <span className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  ~{turf.estimatedMinutes} min
                </span>
              )}
              {turf._count.routes > 0 && (
                <span>{turf._count.routes} route{turf._count.routes !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TurfClient({
  campaignId,
  campaignName,
  initialTurfs,
  programs,
  teamMembers,
  density,
}: Props) {
  const [turfs, setTurfs] = useState<TurfRow[]>(initialTurfs);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<TurfRow | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = turfs.length;
    const assigned = turfs.filter((t) => t.status === "assigned").length;
    const inProgress = turfs.filter((t) => t.status === "in_progress").length;
    const completed = turfs.filter((t) => t.status === "completed").length;
    const totalStops = turfs.reduce((s, t) => s + t.totalStops, 0);
    const doneStops = turfs.reduce((s, t) => s + t.completedStops, 0);
    const overallPct = totalStops > 0 ? Math.round((doneStops / totalStops) * 100) : 0;
    return { total, assigned, inProgress, completed, totalStops, doneStops, overallPct };
  }, [turfs]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeTab === "all") return turfs;
    return turfs.filter((t) => t.status === activeTab);
  }, [turfs, activeTab]);

  function handleCreate(t: TurfRow) {
    setTurfs((prev) => [t, ...prev]);
  }

  function handleUpdate(updated: TurfRow) {
    setTurfs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selected?.id === updated.id) setSelected(updated);
  }

  function handleDelete(id: string) {
    setTurfs((prev) => prev.filter((t) => t.id !== id));
  }

  const TAB_COUNTS: Record<string, number> = {
    all: turfs.length,
    draft: turfs.filter((t) => t.status === "draft").length,
    assigned: turfs.filter((t) => t.status === "assigned").length,
    in_progress: turfs.filter((t) => t.status === "in_progress").length,
    completed: turfs.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Backdrop */}
      <AnimatePresence>
        {(showCreate || selected) && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => { setShowCreate(false); setSelected(null); }}
          />
        )}
      </AnimatePresence>

      <PageHeader
        title="Turf Management"
        description={`${campaignName} — ${stats.total} turfs, ${stats.overallPct}% complete`}
        actions={
          <Button onClick={() => { setShowCreate(true); setSelected(null); }}>
            <Plus className="h-4 w-4" />
            New Turf
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Turfs"
          value={stats.total}
          icon={<MapIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Assigned"
          value={stats.assigned}
          icon={<UserCheck className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<PlayCircle className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Overall progress bar */}
      {stats.totalStops > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Overall Door Coverage</span>
              <span className="font-semibold text-gray-900">
                {stats.doneStops.toLocaleString()} / {stats.totalStops.toLocaleString()} stops ({stats.overallPct}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.overallPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${completionColor(stats.overallPct)}`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter tabs */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-4">
        {(["all", "draft", "assigned", "in_progress", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tab === "all" ? "All" : STATUS_CONFIG[tab as TurfStatus]?.label ?? tab}
            {TAB_COUNTS[tab] > 0 && (
              <span className="ml-1.5 text-xs font-semibold opacity-60">
                {TAB_COUNTS[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<MapIcon className="h-10 w-10" />}
            title={activeTab === "all" ? "No turfs yet" : `No ${activeTab.replace("_", " ")} turfs`}
            description={
              activeTab === "all"
                ? "Create your first turf to start assigning canvassers to geographic areas."
                : undefined
            }
            action={
              activeTab === "all" ? (
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" /> Create Turf
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((t) => (
              <TurfCard key={t.id} turf={t} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {showCreate && (
          <CreateDrawer
            key="create"
            campaignId={campaignId}
            teamMembers={teamMembers}
            density={density}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
        {selected && !showCreate && (
          <EditPanel
            key={selected.id}
            turf={selected}
            campaignId={campaignId}
            teamMembers={teamMembers}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
