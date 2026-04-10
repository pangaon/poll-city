"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Clock,
  Users, MapPin, ChevronLeft, ChevronRight, RefreshCw, Send,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, FormField,
  Input, Label, Modal, PageHeader, Select, Spinner, Textarea,
} from "@/components/ui";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssignmentType = "canvass" | "lit_drop" | "sign_install" | "sign_remove";
type AssignmentStatus =
  | "draft" | "published" | "assigned" | "in_progress"
  | "completed" | "cancelled" | "reassigned";

interface AssignmentRow {
  id: string;
  name: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  scheduledDate: string | null;
  notes: string | null;
  assignedUser: { id: string; name: string } | null;
  fieldUnit: { id: string; name: string } | null;
  _count: { stops: number };
  createdAt: string;
}

interface Turf { id: string; name: string; ward: string | null }
interface TeamMember { id: string; name: string }

// ── Meta ─────────────────────────────────────────────────────────────────────

const TYPE_META: Record<AssignmentType, { label: string; color: string }> = {
  canvass:      { label: "Canvass",       color: "bg-blue-100 text-blue-800" },
  lit_drop:     { label: "Lit Drop",      color: "bg-purple-100 text-purple-800" },
  sign_install: { label: "Sign Install",  color: "bg-green-100 text-green-800" },
  sign_remove:  { label: "Sign Remove",   color: "bg-amber-100 text-amber-800" },
};

const STATUS_META: Record<AssignmentStatus, { label: string; badge: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft:       { label: "Draft",       badge: "default" },
  published:   { label: "Published",   badge: "info" },
  assigned:    { label: "Assigned",    badge: "warning" },
  in_progress: { label: "In Progress", badge: "warning" },
  completed:   { label: "Completed",   badge: "success" },
  cancelled:   { label: "Cancelled",   badge: "danger" },
  reassigned:  { label: "Reassigned",  badge: "info" },
};

const PAGE_SIZE = 25;

// ── Shimmer ───────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-100 ${className ?? "h-4 w-full"}`}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  turfs: Turf[];
  teamMembers: TeamMember[];
}

export default function FieldOpsClient({ campaignId, turfs, teamMembers }: Props) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAssign, setShowAssign] = useState<AssignmentRow | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  // Create form state
  const [form, setForm] = useState({
    name: "",
    assignmentType: "canvass" as AssignmentType,
    fieldUnitId: "",
    scheduledDate: "",
    assignedUserId: "",
    notes: "",
    description: "",
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/field-assignments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load assignments");
      setAssignments(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, typeFilter]);

  // ── Status action ──────────────────────────────────────────────────────────

  const transition = useCallback(
    async (id: string, action: string, extra?: Record<string, string>) => {
      const res = await fetch(`/api/field-assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data.data } : a)),
      );
    },
    [],
  );

  const handlePublish = useCallback(
    async (a: AssignmentRow) => {
      try {
        await transition(a.id, "publish");
        toast.success(`"${a.name}" published`);
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [transition],
  );

  const handleCancel = useCallback(
    async (a: AssignmentRow) => {
      if (!confirm(`Cancel "${a.name}"? This cannot be undone.`)) return;
      try {
        await transition(a.id, "cancel");
        toast.success(`"${a.name}" cancelled`);
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [transition],
  );

  // ── Assign ─────────────────────────────────────────────────────────────────

  const handleAssignSubmit = useCallback(async () => {
    if (!showAssign || !assignUserId) return;
    setAssigning(true);
    try {
      await transition(showAssign.id, "assign", { assignedUserId: assignUserId });
      toast.success(`Assigned to ${teamMembers.find((m) => m.id === assignUserId)?.name}`);
      setShowAssign(null);
      setAssignUserId("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAssigning(false);
    }
  }, [showAssign, assignUserId, transition, teamMembers]);

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        campaignId,
        assignmentType: form.assignmentType,
        name: form.name.trim(),
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.fieldUnitId) body.fieldUnitId = form.fieldUnitId;
      if (form.scheduledDate) body.scheduledDate = new Date(form.scheduledDate).toISOString();
      if (form.assignedUserId) body.assignedUserId = form.assignedUserId;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/field-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create assignment");

      toast.success(`Assignment created — ${data.data._count.stops} stops generated`);
      setShowCreate(false);
      setForm({
        name: "", assignmentType: "canvass", fieldUnitId: "",
        scheduledDate: "", assignedUserId: "", notes: "", description: "",
      });
      setPage(1);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }, [form, campaignId, load]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Field Assignments"
        description="Create, publish, and assign canvass runs, lit drops, and sign operations."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Assignment
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Shimmer className="h-5 w-1/3" />
                  <Shimmer className="h-5 w-1/6" />
                  <Shimmer className="h-5 w-1/6" />
                  <Shimmer className="h-5 w-1/6" />
                </div>
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No assignments yet"
              description="Create your first field assignment to get your team out the door."
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Assignment
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-3">Assignment</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Stops</th>
                    <th className="px-4 py-3">Scheduled</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <AnimatePresence initial={false}>
                  <tbody>
                    {assignments.map((a) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{a.name}</div>
                          {a.fieldUnit && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {a.fieldUnit.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_META[a.assignmentType].color}`}>
                            {TYPE_META[a.assignmentType].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_META[a.status].badge}>
                            {STATUS_META[a.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a._count.stops}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {a.scheduledDate
                            ? new Date(a.scheduledDate).toLocaleDateString("en-CA")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a.assignedUser?.name ?? (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {a.status === "draft" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePublish(a)}
                                title="Publish"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {(a.status === "draft" || a.status === "published") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setShowAssign(a); setAssignUserId(a.assignedUser?.id ?? ""); }}
                                title="Assign"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            )}
                            {!["completed", "cancelled"].includes(a.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(a)}
                                title="Cancel"
                                className="text-red-500 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} assignments</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="self-center">
              {page} / {pages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Field Assignment"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Assignment Type" required>
            <Select
              value={form.assignmentType}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignmentType: e.target.value as AssignmentType }))
              }
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Name" required>
            <Input
              placeholder={`e.g. Ward 5 ${TYPE_META[form.assignmentType].label}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              rows={2}
              placeholder="Optional briefing notes for the team"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Turf (optional)">
              <Select
                value={form.fieldUnitId}
                onChange={(e) => setForm((f) => ({ ...f, fieldUnitId: e.target.value }))}
              >
                <option value="">All campaign targets</option>
                {turfs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.ward ? ` — ${t.ward}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Scheduled Date">
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Assign To (optional)">
            <Select
              value={form.assignedUserId}
              onChange={(e) => setForm((f) => ({ ...f, assignedUserId: e.target.value }))}
            >
              <option value="">Assign later</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Notes">
            <Textarea
              rows={2}
              placeholder="Internal notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {form.assignmentType === "canvass" && "Stops will be auto-generated from campaign contacts"}
            {form.assignmentType === "lit_drop" && "Stops will be auto-generated from campaign households"}
            {form.assignmentType === "sign_install" && "Stops will be auto-generated from pending & scheduled signs"}
            {form.assignmentType === "sign_remove" && "Stops will be auto-generated from installed signs"}
            {form.fieldUnitId && " in the selected turf."}
            {!form.fieldUnitId && " across the full campaign."}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={!!showAssign}
        onClose={() => { setShowAssign(null); setAssignUserId(""); }}
        title={`Assign "${showAssign?.name}"`}
        size="sm"
      >
        <div className="space-y-4">
          <FormField label="Assign To" required>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">Select a team member</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowAssign(null); setAssignUserId(""); }}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={assigning || !assignUserId}>
              {assigning ? <Spinner className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
