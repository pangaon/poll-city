"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, XCircle, Users, MapPin,
  ChevronLeft, ChevronRight, RefreshCw, Send, DoorOpen,
  BookOpen, SignpostBig, Trash2, Activity, CheckCircle2, Clock,
  Printer, Map, Navigation,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, FormField,
  Input, Modal, PageHeader, Select, Spinner, Textarea,
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
interface TeamMember { id: string; name: string; email: string | null }

// ── Operation type tabs ───────────────────────────────────────────────────────

type TabKey = "all" | AssignmentType;

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  { key: "all",          label: "All Operations", icon: <ClipboardList className="h-4 w-4" />, color: "text-gray-500",   activeColor: "border-[#0A2342] text-[#0A2342]" },
  { key: "canvass",      label: "Canvass",         icon: <DoorOpen className="h-4 w-4" />,      color: "text-blue-500",   activeColor: "border-blue-600 text-blue-700" },
  { key: "lit_drop",     label: "Lit Drop",        icon: <BookOpen className="h-4 w-4" />,      color: "text-purple-500", activeColor: "border-purple-600 text-purple-700" },
  { key: "sign_install", label: "Sign Install",    icon: <SignpostBig className="h-4 w-4" />,   color: "text-green-500",  activeColor: "border-green-600 text-green-700" },
  { key: "sign_remove",  label: "Sign Remove",     icon: <Trash2 className="h-4 w-4" />,        color: "text-amber-500",  activeColor: "border-amber-600 text-amber-700" },
];

const TYPE_BADGE: Record<AssignmentType, string> = {
  canvass:      "bg-blue-100 text-blue-800",
  lit_drop:     "bg-purple-100 text-purple-800",
  sign_install: "bg-green-100 text-green-800",
  sign_remove:  "bg-amber-100 text-amber-800",
};

const TYPE_LABEL: Record<AssignmentType, string> = {
  canvass: "Canvass", lit_drop: "Lit Drop",
  sign_install: "Sign Install", sign_remove: "Sign Remove",
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

const STOP_HINT: Record<AssignmentType, string> = {
  canvass:      "Stops auto-generated from campaign contacts",
  lit_drop:     "Stops auto-generated from campaign households",
  sign_install: "Stops auto-generated from pending & scheduled signs",
  sign_remove:  "Stops auto-generated from installed signs",
};

const PAGE_SIZE = 25;

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? "h-4 w-full"}`} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  campaignName: string;
  currentUserId: string;
  turfs: Turf[];
  teamMembers: TeamMember[];
}

export default function FieldOpsClient({ campaignId, campaignName: _campaignName, currentUserId: _currentUserId, turfs, teamMembers }: Props) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Partial<Record<TabKey, number>>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAssign, setShowAssign] = useState<AssignmentRow | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  const [form, setForm] = useState({
    name: "",
    assignmentType: "canvass" as AssignmentType,
    fieldUnitId: "",
    scheduledDate: "",
    assignedUserId: "",
    notes: "",
    description: "",
  });

  const loadCounts = useCallback(async () => {
    const types: TabKey[] = ["all", "canvass", "lit_drop", "sign_install", "sign_remove"];
    const results = await Promise.allSettled(
      types.map((t) => {
        const p = new URLSearchParams({ campaignId, pageSize: "1" });
        if (t !== "all") p.set("type", t);
        return fetch(`/api/field-assignments?${p}`)
          .then((r) => r.json())
          .then((d) => ({ key: t, count: d.total ?? 0 }));
      }),
    );
    const counts: Partial<Record<TabKey, number>> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") counts[r.value.key] = r.value.count;
    });
    setTabCounts(counts);
  }, [campaignId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(PAGE_SIZE) });
      if (activeTab !== "all") params.set("type", activeTab);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/field-assignments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setAssignments(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, activeTab, statusFilter]);

  useEffect(() => { load(); loadCounts(); }, [load, loadCounts]);
  useEffect(() => { setPage(1); }, [activeTab, statusFilter]);

  const transition = useCallback(async (id: string, action: string, extra?: Record<string, string>) => {
    const res = await fetch(`/api/field-assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Action failed");
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data.data } : a)));
    loadCounts();
  }, [loadCounts]);

  const handlePublish = useCallback(async (a: AssignmentRow) => {
    try { await transition(a.id, "publish"); toast.success(`"${a.name}" published`); }
    catch (err) { toast.error((err as Error).message); }
  }, [transition]);

  const handleCancel = useCallback(async (a: AssignmentRow) => {
    if (!confirm(`Cancel "${a.name}"?`)) return;
    try { await transition(a.id, "cancel"); toast.success(`"${a.name}" cancelled`); }
    catch (err) { toast.error((err as Error).message); }
  }, [transition]);

  const handleAssignSubmit = useCallback(async () => {
    if (!showAssign || !assignUserId) return;
    setAssigning(true);
    try {
      await transition(showAssign.id, "assign", { assignedUserId: assignUserId });
      toast.success(`Assigned to ${teamMembers.find((m) => m.id === assignUserId)?.name}`);
      setShowAssign(null); setAssignUserId("");
    } catch (err) { toast.error((err as Error).message); }
    finally { setAssigning(false); }
  }, [showAssign, assignUserId, transition, teamMembers]);

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const body: Record<string, unknown> = { campaignId, assignmentType: form.assignmentType, name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.fieldUnitId) body.fieldUnitId = form.fieldUnitId;
      if (form.scheduledDate) body.scheduledDate = new Date(form.scheduledDate).toISOString();
      if (form.assignedUserId) body.assignedUserId = form.assignedUserId;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/field-assignments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      toast.success(`Created — ${data.data._count.stops} stops generated`);
      setShowCreate(false);
      setForm({ name: "", assignmentType: form.assignmentType, fieldUnitId: "", scheduledDate: "", assignedUserId: "", notes: "", description: "" });
      setPage(1); load(); loadCounts();
    } catch (err) { toast.error((err as Error).message); }
    finally { setCreating(false); }
  }, [form, campaignId, load, loadCounts]);

  const openCreate = useCallback(() => {
    setForm((f) => ({ ...f, assignmentType: activeTab === "all" ? "canvass" : activeTab as AssignmentType }));
    setShowCreate(true);
  }, [activeTab]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const active = assignments.filter((a) => ["assigned", "in_progress"].includes(a.status)).length;
  const draft  = assignments.filter((a) => a.status === "draft").length;
  const done   = assignments.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-0 p-4 sm:p-6">
      <PageHeader
        title="Field Operations"
        description="Deploy your team — canvass, lit drops, sign installs and removals from one place."
        actions={
          <div className="flex items-center gap-2">
            {/* Sub-view quick links */}
            <Link href="/field-ops/map">
              <Button variant="outline" size="sm" title="Live Map"><Map className="h-4 w-4 mr-1.5" />Live Map</Button>
            </Link>
            <Link href="/field-ops/walk">
              <Button variant="outline" size="sm" title="Walk"><Navigation className="h-4 w-4 mr-1.5" />Walk</Button>
            </Link>
            <Link href="/field-ops/scripts">
              <Button variant="outline" size="sm" title="Scripts"><BookOpen className="h-4 w-4 mr-1.5" />Scripts</Button>
            </Link>
            <Link href="/field-ops/print">
              <Button variant="outline" size="sm" title="Print Walk List"><Printer className="h-4 w-4 mr-1.5" />Print</Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Deploy Team
            </Button>
          </div>
        }
      />

      {/* ── Operation type tabs ──────────────────────────────────────────────── */}
      <div className="mt-4 border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? `${tab.activeColor} bg-transparent`
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className={isActive ? "" : tab.color}>{tab.icon}</span>
                {tab.label}
                {count !== undefined && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────────────── */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 py-4">
          {[
            { label: "Active", value: active, icon: <Activity className="h-4 w-4 text-amber-500" /> },
            { label: "Draft",  value: draft,  icon: <Clock className="h-4 w-4 text-gray-400" /> },
            { label: "Done",   value: done,   icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-3">
                {s.icon}
                <div>
                  <div className="text-lg font-bold leading-none">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filter row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { load(); loadCounts(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <span className="ml-auto text-sm text-gray-400">{total} total</span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Shimmer className="h-5 w-1/3" /><Shimmer className="h-5 w-1/6" />
                  <Shimmer className="h-5 w-1/6" /><Shimmer className="h-5 w-1/6" />
                </div>
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title={activeTab === "all" ? "No assignments yet" : `No ${TYPE_LABEL[activeTab as AssignmentType] ?? ""} assignments`}
              description="Deploy your team by creating a new assignment."
              action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Deploy Team</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-3">Assignment</th>
                    {activeTab === "all" && <th className="px-4 py-3">Type</th>}
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
                          <Link href={`/field-ops/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {a.name}
                          </Link>
                          {a.fieldUnit && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="h-3 w-3" />{a.fieldUnit.name}
                            </div>
                          )}
                        </td>
                        {activeTab === "all" && (
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[a.assignmentType]}`}>
                              {TYPE_LABEL[a.assignmentType]}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_META[a.status].badge}>{STATUS_META[a.status].label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a._count.stops}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString("en-CA") : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a.assignedUser?.name ?? <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {a.status === "draft" && (
                              <Button size="sm" variant="ghost" onClick={() => handlePublish(a)} title="Publish">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {["draft", "published"].includes(a.status) && (
                              <Button size="sm" variant="ghost" onClick={() => { setShowAssign(a); setAssignUserId(a.assignedUser?.id ?? ""); }} title="Assign">
                                <Users className="h-4 w-4" />
                              </Button>
                            )}
                            {a.assignmentType === "canvass" && (
                              <Link href={a.fieldUnit ? `/field-ops/print?canvassingTurfId=${a.fieldUnit.id}` : "/field-ops/print"}>
                                <Button size="sm" variant="ghost" title="Print Walk List">
                                  <Printer className="h-4 w-4 text-gray-400" />
                                </Button>
                              </Link>
                            )}
                            {!["completed", "cancelled"].includes(a.status) && (
                              <Button size="sm" variant="ghost" onClick={() => handleCancel(a)} title="Cancel" className="text-red-400 hover:text-red-600">
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

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2 text-sm text-gray-500">
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>{page} / {pages}</span>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Deploy Team" size="md">
        <div className="space-y-4">
          <FormField label="Operation Type" required>
            <Select value={form.assignmentType} onChange={(e) => setForm((f) => ({ ...f, assignmentType: e.target.value as AssignmentType }))}>
              <option value="canvass">Canvass — Door knocking</option>
              <option value="lit_drop">Lit Drop — Literature delivery</option>
              <option value="sign_install">Sign Install — Place lawn signs</option>
              <option value="sign_remove">Sign Remove — Retrieve signs</option>
            </Select>
          </FormField>
          <FormField label="Assignment Name" required>
            <Input
              placeholder={`e.g. Ward 5 ${form.assignmentType === "canvass" ? "Saturday Canvass" : form.assignmentType === "lit_drop" ? "Lit Drop Run" : "Sign Operation"}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Briefing Notes">
            <Textarea rows={2} placeholder="What should the team know before they go?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Turf (optional)">
              <Select value={form.fieldUnitId} onChange={(e) => setForm((f) => ({ ...f, fieldUnitId: e.target.value }))}>
                <option value="">Whole campaign</option>
                {turfs.map((t) => <option key={t.id} value={t.id}>{t.name}{t.ward ? ` — ${t.ward}` : ""}</option>)}
              </Select>
            </FormField>
            <FormField label="Scheduled Date">
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Assign To (optional)">
            <Select value={form.assignedUserId} onChange={(e) => setForm((f) => ({ ...f, assignedUserId: e.target.value }))}>
              <option value="">Assign later</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </FormField>
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {STOP_HINT[form.assignmentType]}
            {form.fieldUnitId ? " in the selected turf." : " across the full campaign."}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              Deploy
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!showAssign} onClose={() => { setShowAssign(null); setAssignUserId(""); }} title={`Assign "${showAssign?.name}"`} size="sm">
        <div className="space-y-4">
          <FormField label="Assign To" required>
            <Select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
              <option value="">Select team member</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowAssign(null); setAssignUserId(""); }}>Cancel</Button>
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
