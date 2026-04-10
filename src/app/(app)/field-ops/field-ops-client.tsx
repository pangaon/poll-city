"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, XCircle, Users, MapPin,
  ChevronLeft, ChevronRight, RefreshCw, Send, DoorOpen,
  BookOpen, SignpostBig, Trash2, Activity, CheckCircle2, Clock,
  Printer, Navigation, LayoutDashboard, Footprints,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, FormField,
  Input, Modal, PageHeader, Select, Spinner, Textarea,
} from "@/components/ui";
import { toast } from "sonner";

// ── Lazy sub-views ─────────────────────────────────────────────────────────────

const CanvassingClient = dynamic(
  () => import("@/app/(app)/canvassing/canvassing-client"),
  { ssr: false, loading: () => <ViewLoader /> },
);
const WalkShell = dynamic(
  () => import("@/app/(app)/canvassing/walk/walk-shell"),
  { ssr: false, loading: () => <ViewLoader /> },
);
const ScriptsClient = dynamic(
  () => import("@/app/(app)/canvassing/scripts/scripts-client"),
  { ssr: false, loading: () => <ViewLoader /> },
);
const PrintWalkListClient = dynamic(
  () => import("@/app/(app)/canvassing/print-walk-list/print-walk-list-client"),
  { ssr: false, loading: () => <ViewLoader /> },
);
const SignsClientPanel = dynamic(
  () => import("@/app/(app)/signs/signs-client"),
  { ssr: false, loading: () => <ViewLoader /> },
);

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="h-6 w-6 text-gray-300" />
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ContextTab = "dashboard" | "canvass" | "signs" | "lit-drop";
type CanvassPanel = "walk" | "scripts" | "print" | null;
type AssignmentType = "canvass" | "lit_drop" | "sign_install" | "sign_remove";
type AssignmentStatus =
  | "draft" | "published" | "assigned" | "in_progress"
  | "completed" | "cancelled" | "reassigned";

interface AssignmentRow {
  id: string; name: string; assignmentType: AssignmentType;
  status: AssignmentStatus; scheduledDate: string | null; notes: string | null;
  assignedUser: { id: string; name: string } | null;
  fieldUnit: { id: string; name: string } | null;
  _count: { stops: number }; createdAt: string;
}

interface Turf { id: string; name: string; ward: string | null }
interface TeamMember { id: string; name: string; email: string | null }
interface WardData { ward: string; contactCount: number; polls: { poll: string; contactCount: number }[] }

interface BriefingSnap {
  doorsThisWeek: number;
  activeVolunteers: number;
  totalSigns: number;
}

// ── Static config ──────────────────────────────────────────────────────────────

const CONTEXT_TABS: { key: ContextTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "dashboard", label: "Dashboard",  icon: <LayoutDashboard className="h-4 w-4" />, desc: "All operations overview" },
  { key: "canvass",   label: "Canvass",    icon: <DoorOpen className="h-4 w-4" />,        desc: "Door-to-door teams" },
  { key: "signs",     label: "Signs",      icon: <SignpostBig className="h-4 w-4" />,      desc: "Sign crews & inventory" },
  { key: "lit-drop",  label: "Lit Drop",   icon: <Footprints className="h-4 w-4" />,       desc: "Literature delivery" },
];

const DEPLOY_PRESET: Record<ContextTab, AssignmentType> = {
  dashboard: "canvass",
  canvass:   "canvass",
  signs:     "sign_install",
  "lit-drop": "lit_drop",
};

const DEPLOY_LABEL: Record<ContextTab, string> = {
  dashboard:  "New Deployment",
  canvass:    "Deploy Canvassers",
  signs:      "Deploy Sign Crew",
  "lit-drop": "Deploy Lit Drop",
};

const CANVASS_PANELS: { key: NonNullable<CanvassPanel>; label: string; icon: React.ReactNode }[] = [
  { key: "walk",    label: "Walk",    icon: <Navigation className="h-4 w-4" /> },
  { key: "scripts", label: "Scripts", icon: <BookOpen className="h-4 w-4" /> },
  { key: "print",   label: "Print",   icon: <Printer className="h-4 w-4" /> },
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
const SLIDE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
};

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? "h-4 w-full"}`} />;
}

// ── Live feed types + helpers ─────────────────────────────────────────────────

interface FeedItem {
  id: string; message: string; category: string; who: string; time: string;
}

const CATEGORY_DOT: Record<string, string> = {
  canvass:   "bg-blue-500",
  gotv:      "bg-[#1D9E75]",
  donation:  "bg-[#EF9F27]",
  volunteer: "bg-purple-500",
  sign:      "bg-emerald-500",
  import:    "bg-gray-400",
  system:    "bg-gray-400",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  campaignName: string;
  currentUserId: string;
  turfs: Turf[];
  teamMembers: TeamMember[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FieldOpsClient({ campaignId, campaignName, currentUserId, turfs, teamMembers }: Props) {
  const [contextTab, setContextTab] = useState<ContextTab>("dashboard");
  const [canvassPanel, setCanvassPanel] = useState<CanvassPanel>(null);

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tabCounts, setTabCounts] = useState<Partial<Record<string, number>>>({});
  const [briefing, setBriefing] = useState<BriefingSnap | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const latestTsRef = useRef<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAssign, setShowAssign] = useState<AssignmentRow | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [form, setForm] = useState({
    name: "", assignmentType: "canvass" as AssignmentType,
    fieldUnitId: "", targetWard: "", targetPolls: [] as string[],
    scheduledDate: "", assignedUserId: "", notes: "", description: "",
  });

  // Ward/poll targeting data
  const [wards, setWards] = useState<WardData[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  // Reset panel + page when switching context tabs
  useEffect(() => { setCanvassPanel(null); setPage(1); setStatusFilter("all"); }, [contextTab]);

  // Briefing stats — non-fatal, fires once
  useEffect(() => {
    fetch(`/api/briefing?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => setBriefing({
        doorsThisWeek: d.trends?.doorsThisWeek ?? 0,
        activeVolunteers: d.volunteers?.active ?? 0,
        totalSigns: d.totals?.signs ?? 0,
      }))
      .catch(() => {});
  }, [campaignId]);

  // Live feed — poll every 10s, only when Dashboard tab is active
  const fetchFeed = useCallback(async (incremental = false) => {
    const params = new URLSearchParams({ campaignId, limit: "20" });
    if (incremental && latestTsRef.current) params.set("since", latestTsRef.current);
    const res = await fetch(`/api/activity/live-feed?${params}`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    if (!data.feed?.length) return;
    setFeedItems((prev) => incremental ? [...data.feed, ...prev].slice(0, 30) : data.feed);
    if (data.latestTimestamp) latestTsRef.current = data.latestTimestamp;
  }, [campaignId]);

  useEffect(() => {
    if (contextTab !== "dashboard") return;
    fetchFeed(false);
    const id = setInterval(() => fetchFeed(true), 10_000);
    return () => clearInterval(id);
  }, [contextTab, fetchFeed]);

  // Tab counts (totals per type)
  const loadCounts = useCallback(async () => {
    const keys = ["all", "canvass", "lit_drop", "sign_install", "sign_remove"];
    const results = await Promise.allSettled(
      keys.map((t) => {
        const p = new URLSearchParams({ campaignId, pageSize: "1" });
        if (t !== "all") p.set("type", t);
        return fetch(`/api/field-assignments?${p}`)
          .then((r) => r.json())
          .then((d) => ({ key: t, count: d.total ?? 0 }));
      }),
    );
    const counts: Partial<Record<string, number>> = {};
    results.forEach((r) => { if (r.status === "fulfilled") counts[r.value.key] = r.value.count; });
    setTabCounts(counts);
  }, [campaignId]);

  // Assignment table — signs tab uses SignsClient directly, skip table load
  const load = useCallback(async () => {
    if (contextTab === "signs") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(PAGE_SIZE) });
      if (contextTab === "canvass") params.set("type", "canvass");
      if (contextTab === "lit-drop") params.set("type", "lit_drop");
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
  }, [campaignId, contextTab, page, statusFilter]);

  useEffect(() => { load(); loadCounts(); }, [load, loadCounts]);

  // Transitions
  const doTransition = useCallback(async (id: string, action: string, extra?: Record<string, string>) => {
    const res = await fetch(`/api/field-assignments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Action failed");
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data.data } : a)));
    loadCounts();
  }, [loadCounts]);

  const handlePublish = useCallback(async (a: AssignmentRow) => {
    try { await doTransition(a.id, "publish"); toast.success(`"${a.name}" published`); }
    catch (err) { toast.error((err as Error).message); }
  }, [doTransition]);

  const handleCancel = useCallback(async (a: AssignmentRow) => {
    if (!confirm(`Cancel "${a.name}"?`)) return;
    try { await doTransition(a.id, "cancel"); toast.success(`"${a.name}" cancelled`); }
    catch (err) { toast.error((err as Error).message); }
  }, [doTransition]);

  const handleAssignSubmit = useCallback(async () => {
    if (!showAssign || !assignUserId) return;
    setAssigning(true);
    try {
      await doTransition(showAssign.id, "assign", { assignedUserId: assignUserId });
      toast.success(`Assigned to ${teamMembers.find((m) => m.id === assignUserId)?.name}`);
      setShowAssign(null); setAssignUserId("");
    } catch (err) { toast.error((err as Error).message); }
    finally { setAssigning(false); }
  }, [showAssign, assignUserId, doTransition, teamMembers]);

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const body: Record<string, unknown> = { campaignId, assignmentType: form.assignmentType, name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.targetWard) body.targetWard = form.targetWard;
      if (form.targetPolls.length > 0) body.targetPolls = form.targetPolls;
      if (form.fieldUnitId) body.fieldUnitId = form.fieldUnitId;
      if (form.scheduledDate) body.scheduledDate = new Date(form.scheduledDate).toISOString();
      if (form.assignedUserId) body.assignedUserId = form.assignedUserId;
      if (form.notes.trim()) body.notes = form.notes.trim();
      const res = await fetch("/api/field-assignments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      toast.success(`Deployed — ${data.data._count.stops} stops generated`);
      setShowCreate(false);
      setForm((f) => ({ name: "", assignmentType: f.assignmentType, fieldUnitId: "", targetWard: "", targetPolls: [], scheduledDate: "", assignedUserId: "", notes: "", description: "" }));
      load(); loadCounts();
    } catch (err) { toast.error((err as Error).message); }
    finally { setCreating(false); }
  }, [form, campaignId, load, loadCounts]);

  // Fetch ward/poll data when modal opens (once per campaign)
  useEffect(() => {
    if (!showCreate || wards.length > 0) return;
    setWardsLoading(true);
    fetch(`/api/field-ops/ward-polls?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => setWards(d.wards ?? []))
      .catch(() => {})
      .finally(() => setWardsLoading(false));
  }, [showCreate, campaignId, wards.length]);

  const openCreate = useCallback(() => {
    setForm((f) => ({ ...f, assignmentType: DEPLOY_PRESET[contextTab], targetWard: "", targetPolls: [], fieldUnitId: "" }));
    setShowCreate(true);
  }, [contextTab]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const signCount = (tabCounts.sign_install ?? 0) + (tabCounts.sign_remove ?? 0);

  // ── Shared assignment table ────────────────────────────────────────────────

  function AssignmentTable({ showType = true }: { showType?: boolean }) {
    const active = assignments.filter((a) => ["assigned", "in_progress"].includes(a.status)).length;
    const draft  = assignments.filter((a) => a.status === "draft").length;
    const done   = assignments.filter((a) => a.status === "completed").length;

    return (
      <div className="space-y-4">
        {/* Stat strip */}
        {!loading && assignments.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active",  value: active, icon: <Activity className="h-4 w-4 text-amber-500" /> },
              { label: "Draft",   value: draft,  icon: <Clock className="h-4 w-4 text-gray-400" /> },
              { label: "Done",    value: done,   icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
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

        {/* Filter row */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { load(); loadCounts(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <span className="ml-auto text-sm text-gray-400">{total} total</span>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Shimmer className="h-5 w-1/3" /><Shimmer className="h-5 w-1/6" />
                    <Shimmer className="h-5 w-1/6" /><Shimmer className="h-5 w-1/6" />
                  </div>
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No assignments yet"
                description="Deploy your team to get started."
                action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{DEPLOY_LABEL[contextTab]}</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                      <th className="px-4 py-3">Assignment</th>
                      {showType && <th className="px-4 py-3">Type</th>}
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
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <Link href={`/field-ops/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600">{a.name}</Link>
                            {a.fieldUnit && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                <MapPin className="h-3 w-3" />{a.fieldUnit.name}
                              </div>
                            )}
                          </td>
                          {showType && (
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[a.assignmentType]}`}>
                                {TYPE_LABEL[a.assignmentType]}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3"><Badge variant={STATUS_META[a.status].badge}>{STATUS_META[a.status].label}</Badge></td>
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
                                <Button size="sm" variant="ghost" onClick={() => handlePublish(a)} title="Publish"><Send className="h-4 w-4" /></Button>
                              )}
                              {["draft", "published"].includes(a.status) && (
                                <Button size="sm" variant="ghost" onClick={() => { setShowAssign(a); setAssignUserId(a.assignedUser?.id ?? ""); }} title="Assign"><Users className="h-4 w-4" /></Button>
                              )}
                              {a.assignmentType === "canvass" && (
                                <Button size="sm" variant="ghost" title="Print Walk List" onClick={() => { setContextTab("canvass"); setCanvassPanel("print"); }}>
                                  <Printer className="h-4 w-4 text-gray-400" />
                                </Button>
                              )}
                              {!["completed", "cancelled"].includes(a.status) && (
                                <Button size="sm" variant="ghost" onClick={() => handleCancel(a)} title="Cancel" className="text-red-400 hover:text-red-600"><XCircle className="h-4 w-4" /></Button>
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
          <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span>{page} / {pages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Field Operations"
        description="Command centre — deploy, track, and manage every ground operation from one place."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />{DEPLOY_LABEL[contextTab]}
          </Button>
        }
      />

      {/* ── Command bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "All Ops",       value: tabCounts.all ?? "—",       icon: <ClipboardList className="h-5 w-5 text-[#0A2342]" />, sub: "total" },
          { label: "Canvass",       value: tabCounts.canvass ?? "—",   icon: <DoorOpen className="h-5 w-5 text-blue-500" />,      sub: "assignments" },
          { label: "Sign Ops",      value: signCount || "—",           icon: <SignpostBig className="h-5 w-5 text-green-500" />,   sub: `${briefing?.totalSigns ?? "—"} signs total` },
          { label: "Doors / Week",  value: briefing?.doorsThisWeek ?? "—", icon: <Activity className="h-5 w-5 text-amber-500" />, sub: `${briefing?.activeVolunteers ?? "—"} active vols` },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              {stat.icon}
              <div>
                <div className="text-2xl font-bold leading-none text-gray-900">{stat.value}</div>
                <div className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</div>
                <div className="text-xs text-gray-400">{stat.sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Context tabs ────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {CONTEXT_TABS.map((tab) => {
            const isActive = contextTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setContextTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#0A2342] text-[#0A2342]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className={isActive ? "text-[#0A2342]" : "text-gray-400"}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* Dashboard — all ops + live feed */}
        {contextTab === "dashboard" && (
          <motion.div key="dashboard" {...SLIDE} className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-6 items-start">
            <AssignmentTable showType />

            {/* Live activity feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-gray-700">Live Activity</h3>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75] animate-pulse" />live
                </span>
              </div>
              <Card>
                <CardContent className="p-0 divide-y divide-gray-50">
                  {feedItems.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-gray-400">No recent activity</p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {feedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="flex items-start gap-3 px-3 py-2.5"
                        >
                          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${CATEGORY_DOT[item.category] ?? "bg-gray-400"}`} />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-700 leading-snug">{item.message}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{relTime(item.time)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Canvass — map is always primary, tools open as side panels */}
        {contextTab === "canvass" && (
          <motion.div key="canvass" {...SLIDE} className="space-y-3">

            {/* Control bar — tools + deploy, embedded in the map context */}
            <div className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2">
              <div className="flex gap-2 flex-wrap">
                {CANVASS_PANELS.map((p) => (
                  <Button
                    key={p.key}
                    variant={canvassPanel === p.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCanvassPanel(canvassPanel === p.key ? null : p.key)}
                  >
                    {p.icon}<span className="ml-1.5">{p.label}</span>
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />Deploy Canvassers
              </Button>
            </div>

            {/* Map always visible — side panel slides in alongside it */}
            <div className="flex flex-col lg:flex-row rounded-xl border overflow-hidden min-h-0">
              {/* Map — takes remaining width, shrinks when panel is open */}
              <div className={canvassPanel ? "lg:flex-1 min-w-0" : "w-full"}>
                <Suspense fallback={<ViewLoader />}>
                  <CanvassingClient
                    campaignId={campaignId}
                    currentUserId={currentUserId}
                    teamMembers={teamMembers}
                  />
                </Suspense>
              </div>

              {/* Side panel — opens alongside the map */}
              <AnimatePresence>
                {canvassPanel && (
                  <motion.div
                    key={canvassPanel}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="lg:w-[400px] flex-shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto bg-white"
                  >
                    <Suspense fallback={<ViewLoader />}>
                      {canvassPanel === "walk"    && <WalkShell campaignId={campaignId} />}
                      {canvassPanel === "scripts" && <ScriptsClient campaignId={campaignId} />}
                      {canvassPanel === "print"   && <PrintWalkListClient campaignId={campaignId} campaignName={campaignName} />}
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        )}

        {/* Signs — full command: crew deployments + inventory */}
        {contextTab === "signs" && (
          <motion.div key="signs" {...SLIDE} className="space-y-6">
            {/* Sign deployment summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Install Ops", value: tabCounts.sign_install ?? "—", color: "text-green-600" },
                { label: "Remove Ops",  value: tabCounts.sign_remove  ?? "—", color: "text-amber-600" },
                { label: "Total Signs", value: briefing?.totalSigns   ?? "—", color: "text-gray-700" },
                { label: "Active Vols", value: briefing?.activeVolunteers ?? "—", color: "text-blue-600" },
              ].map((s) => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full signs management */}
            <Suspense fallback={<ViewLoader />}>
              <SignsClientPanel campaignId={campaignId} />
            </Suspense>
          </motion.div>
        )}

        {/* Lit Drop */}
        {contextTab === "lit-drop" && (
          <motion.div key="lit-drop" {...SLIDE}>
            <AssignmentTable showType={false} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={DEPLOY_LABEL[contextTab]} size="md">
        <div className="space-y-4">

          {/* Operation type */}
          <FormField label="Operation Type" required>
            <Select value={form.assignmentType} onChange={(e) => setForm((f) => ({ ...f, assignmentType: e.target.value as AssignmentType }))}>
              <option value="canvass">Canvass — Door knocking</option>
              <option value="lit_drop">Lit Drop — Literature delivery</option>
              <option value="sign_install">Sign Install — Place lawn signs</option>
              <option value="sign_remove">Sign Remove — Retrieve signs</option>
            </Select>
          </FormField>

          {/* Assignment name */}
          <FormField label="Assignment Name" required>
            <Input
              placeholder={`e.g. ${form.targetWard || "Ward 12"} ${form.assignmentType === "canvass" ? "Saturday Canvass" : form.assignmentType === "lit_drop" ? "Lit Drop Run" : "Sign Operation"}`}
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>

          {/* ── Poll targeting — primary assignment unit ─────────────────────── */}
          <div className="rounded-lg border border-[#0A2342]/20 bg-[#0A2342]/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#0A2342]" />
              <span className="text-sm font-semibold text-[#0A2342]">Poll Targeting</span>
              <span className="text-xs text-gray-500 ml-1">— polls are the primary assignment unit</span>
            </div>

            {/* Ward selector */}
            <FormField label="Ward">
              {wardsLoading ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-white text-sm text-gray-400">
                  <Spinner className="h-3.5 w-3.5" /> Loading wards…
                </div>
              ) : (
                <Select
                  value={form.targetWard}
                  onChange={(e) => setForm((f) => ({ ...f, targetWard: e.target.value, targetPolls: [] }))}
                >
                  <option value="">All wards</option>
                  {wards.map((w) => (
                    <option key={w.ward} value={w.ward}>
                      {w.ward} — {w.contactCount} contacts
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            {/* Poll multi-select — only shown when a ward is selected */}
            {form.targetWard && (() => {
              const wardData = wards.find((w) => w.ward === form.targetWard);
              if (!wardData) return null;
              return (
                <FormField label={`Polls in ${form.targetWard}`}>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {wardData.polls.map((p) => {
                      const selected = form.targetPolls.includes(p.poll);
                      return (
                        <button
                          key={p.poll}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              targetPolls: selected
                                ? f.targetPolls.filter((x) => x !== p.poll)
                                : [...f.targetPolls, p.poll],
                            }))
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "border-[#0A2342] bg-[#0A2342] text-white"
                              : "border-gray-300 bg-white text-gray-600 hover:border-[#0A2342] hover:text-[#0A2342]"
                          }`}
                        >
                          {p.poll}
                          <span className={`${selected ? "text-blue-200" : "text-gray-400"}`}>
                            {p.contactCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {wardData.polls.length > 1 && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, targetPolls: wardData.polls.map((p) => p.poll) }))}
                        className="text-xs text-[#0A2342] hover:underline"
                      >
                        Select all
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, targetPolls: [] }))}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </FormField>
              );
            })()}

            {/* Contact count preview */}
            {(() => {
              if (form.targetWard) {
                const wardData = wards.find((w) => w.ward === form.targetWard);
                if (wardData) {
                  const count = form.targetPolls.length > 0
                    ? wardData.polls.filter((p) => form.targetPolls.includes(p.poll)).reduce((s, p) => s + p.contactCount, 0)
                    : wardData.contactCount;
                  return (
                    <div className="text-xs text-[#1D9E75] font-medium">
                      {count} contact{count !== 1 ? "s" : ""} targeted
                      {form.targetPolls.length > 0 ? ` across ${form.targetPolls.length} poll${form.targetPolls.length !== 1 ? "s" : ""}` : ` across all polls in ${form.targetWard}`}
                    </div>
                  );
                }
              }
              return (
                <div className="text-xs text-gray-400">
                  Select a ward to target specific polls, or leave blank for the whole campaign.
                </div>
              );
            })()}
          </div>

          {/* Briefing notes */}
          <FormField label="Briefing Notes">
            <Textarea rows={2} placeholder="What should the team know before they go?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>

          {/* Date + assignee */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled Date">
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </FormField>
            <FormField label="Assign To">
              <Select value={form.assignedUserId} onChange={(e) => setForm((f) => ({ ...f, assignedUserId: e.target.value }))}>
                <option value="">Assign later</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </FormField>
          </div>

          {/* Turf — secondary/optional */}
          {turfs.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none list-none flex items-center gap-1">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                Turf override (advanced — optional)
              </summary>
              <div className="mt-2">
                <FormField label="Turf">
                  <Select value={form.fieldUnitId} onChange={(e) => setForm((f) => ({ ...f, fieldUnitId: e.target.value }))}>
                    <option value="">No turf override</option>
                    {turfs.map((t) => <option key={t.id} value={t.id}>{t.name}{t.ward ? ` — ${t.ward}` : ""}</option>)}
                  </Select>
                </FormField>
                <p className="mt-1 text-xs text-gray-400">
                  Turfs are drawn geographic boundaries. The system will still track stops by poll even when a turf is used.
                </p>
              </div>
            </details>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Deploy
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign modal ────────────────────────────────────────────────────── */}
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
              {assigning ? <Spinner className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}Assign
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
