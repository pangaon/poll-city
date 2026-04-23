"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, Search, ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle,
  Trophy, DoorOpen, Car, Filter, Mail, MessageSquare, ClipboardList, Download,
  UserCheck, Phone, ExternalLink, ChevronDown,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, FormField, Input, Label,
  Modal, PageHeader, Select, Textarea, EmptyState, Switch,
} from "@/components/ui";
import { toast } from "sonner";
import { fullName, formatPhone } from "@/lib/utils";
import { AdoniPageAssist } from "@/components/adoni/adoni-page-assist";
import { AdoniChip } from "@/components/adoni/adoni-chip";

/* ─── types ─────────────────────────────────────────────────────────── */
interface VolunteerProfileRow {
  id: string;
  availability: string | null;
  skills: string[];
  maxHoursPerWeek: number | null;
  hasVehicle: boolean;
  notes: string | null;
  totalHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; address1: string | null; city: string | null } | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  doorsTotal: number;
  doorsThisWeek: number;
  doorsToday: number;
  supportersFound: number;
  conversionRate: number;
  status: "star" | "active" | "new" | "quiet" | "inactive";
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  signupCount?: number;
  capacity?: number | null;
}

interface VolunteerStats {
  total: number;
  active: number;
  totalHours: number;
  withVehicle: number;
}

interface Props { campaignId: string }

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const pageSize = 25;

function statusBadge(status: string) {
  const map: Record<string, { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }> = {
    star: { variant: "warning", label: "Star" },
    active: { variant: "success", label: "Active" },
    new: { variant: "info", label: "New" },
    quiet: { variant: "danger", label: "Quiet" },
    inactive: { variant: "default", label: "Inactive" },
  };
  const s = map[status] ?? map.inactive;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function ShimmerRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Row action dropdown ────────────────────────────────────────────── */
function RowActions({
  volunteer,
  onEdit,
  onAssignShift,
  onSendMessage,
  onCreateTask,
}: {
  volunteer: VolunteerProfileRow;
  onEdit: () => void;
  onAssignShift: () => void;
  onSendMessage: () => void;
  onCreateTask: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const phone = volunteer.user?.phone ?? volunteer.contact?.phone ?? null;
  const contactId = volunteer.contact?.id ?? null;

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] flex items-center gap-1"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setOpen(false); onEdit(); }}
          >
            <Pencil className="w-3.5 h-3.5 text-gray-500" /> Edit profile
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setOpen(false); onAssignShift(); }}
          >
            <UserCheck className="w-3.5 h-3.5 text-gray-500" /> Assign to shift
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setOpen(false); onSendMessage(); }}
          >
            <Mail className="w-3.5 h-3.5 text-gray-500" /> Send message
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setOpen(false); onCreateTask(); }}
          >
            <ClipboardList className="w-3.5 h-3.5 text-gray-500" /> Create task
          </button>
          {contactId && (
            <a
              href={`/contacts/${contactId}`}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" /> View contact
            </a>
          )}
          {phone && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                navigator.clipboard.writeText(phone).then(() => toast.success("Phone copied")).catch(() => toast.error("Copy failed"));
              }}
            >
              <Phone className="w-3.5 h-3.5 text-gray-500" /> Copy phone
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VolunteersClient({ campaignId }: Props) {
  const [volunteers, setVolunteers] = useState<VolunteerProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VolunteerProfileRow | null>(null);
  const [formState, setFormState] = useState({ availability: "", skills: "", maxHoursPerWeek: "", hasVehicle: false, isActive: true, notes: "" });
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [tab, setTab] = useState<"roster" | "leaderboard">("roster");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  /* ─── Stats ─────────────────────────────────────────────────────────── */
  const [stats, setStats] = useState<VolunteerStats | null>(null);

  useEffect(() => {
    fetch(`/api/volunteers/stats?campaignId=${campaignId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, [campaignId]);

  /* ─── Shift modal ─────────────────────────────────────────────────── */
  const [showAssignShift, setShowAssignShift] = useState(false);
  const [shiftTargets, setShiftTargets] = useState<VolunteerProfileRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState("");

  function openAssignShift(targets: VolunteerProfileRow[]) {
    setShiftTargets(targets);
    setSelectedShiftId("");
    setShowAssignShift(true);
    setShiftsLoading(true);
    fetch(`/api/volunteers/shifts?campaignId=${campaignId}`)
      .then((r) => r.ok ? r.json() : { shifts: [] })
      .then((d) => setShifts(d.shifts ?? d.data ?? []))
      .catch(() => setShifts([]))
      .finally(() => setShiftsLoading(false));
  }

  async function submitAssignShift() {
    if (!selectedShiftId) { toast.error("Select a shift"); return; }
    try {
      const res = await fetch(`/api/volunteers/shifts/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: selectedShiftId, volunteerIds: shiftTargets.map((v) => v.id), campaignId }),
      });
      if (!res.ok) throw new Error("Failed to assign shift");
      toast.success(`Assigned ${shiftTargets.length} volunteer${shiftTargets.length !== 1 ? "s" : ""} to shift`);
      setShowAssignShift(false);
      setSelectedVolunteers([]);
    } catch (error) { toast.error((error as Error).message); }
  }

  /* ─── Message modal ──────────────────────────────────────────────── */
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [messageTargets, setMessageTargets] = useState<VolunteerProfileRow[]>([]);
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });

  function openSendMessage(targets: VolunteerProfileRow[]) {
    setMessageTargets(targets);
    setMessageForm({ subject: "", body: "" });
    setShowSendMessage(true);
  }

  async function submitSendMessage() {
    if (!messageForm.subject.trim() || !messageForm.body.trim()) { toast.error("Subject and message are required"); return; }
    const contactIds = messageTargets
      .map((v) => v.contact?.id)
      .filter((id): id is string => Boolean(id));
    try {
      const res = await fetch("/api/communications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, subject: messageForm.subject, bodyHtml: messageForm.body, contactIds }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      toast.success(`Message sent to ${messageTargets.length} volunteer${messageTargets.length !== 1 ? "s" : ""}`);
      setShowSendMessage(false);
      setSelectedVolunteers([]);
    } catch (error) { toast.error((error as Error).message); }
  }

  /* ─── Task modal ─────────────────────────────────────────────────── */
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTargets, setTaskTargets] = useState<VolunteerProfileRow[]>([]);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "" });

  function openCreateTask(targets: VolunteerProfileRow[]) {
    setTaskTargets(targets);
    setTaskForm({ title: "", description: "", dueDate: "" });
    setShowCreateTask(true);
  }

  async function submitCreateTask() {
    if (!taskForm.title.trim()) { toast.error("Task title is required"); return; }
    try {
      await Promise.all(
        taskTargets.map((v) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              title: taskForm.title,
              description: taskForm.description,
              assignedToId: v.user?.id ?? null,
              dueDate: taskForm.dueDate || null,
            }),
          })
        )
      );
      toast.success(`Task created for ${taskTargets.length} volunteer${taskTargets.length !== 1 ? "s" : ""}`);
      setShowCreateTask(false);
      setSelectedVolunteers([]);
    } catch (error) { toast.error((error as Error).message || "Failed to create tasks"); }
  }

  /* ─── Export ─────────────────────────────────────────────────────── */
  function handleExport() {
    const ids = selectedVolunteers.join(",");
    const url = `/api/export/volunteers?campaignId=${campaignId}&ids=${ids}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "volunteers.csv";
    a.click();
  }

  /* ─── Selected volunteer objects ────────────────────────────────── */
  const selectedObjects = useMemo(
    () => volunteers.filter((v) => selectedVolunteers.includes(v.id)),
    [volunteers, selectedVolunteers]
  );

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (hasVehicle) params.set("hasVehicle", "true");
      if (skillsFilter.length > 0) params.set("skills", skillsFilter.join(","));
      if (availabilityFilter.length > 0) params.set("availability", availabilityFilter.join(","));
      const res = await fetch(`/api/volunteers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load volunteers");
      setVolunteers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error((error as Error).message || "Unable to load volunteers");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search, status, hasVehicle, skillsFilter, availabilityFilter]);

  useEffect(() => { loadVolunteers(); }, [loadVolunteers]);
  useEffect(() => { setPage(1); }, [search, status, hasVehicle, skillsFilter, availabilityFilter]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLeaderboardLoading(true);
    fetch(`/api/volunteers/performance?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard ?? []))
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, [campaignId, tab]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedName = useMemo(() => {
    if (!selectedProfile) return "";
    if (selectedProfile.user) return fullName(selectedProfile.user.name ?? "", "");
    if (selectedProfile.contact) return fullName(selectedProfile.contact.firstName, selectedProfile.contact.lastName);
    return "Volunteer";
  }, [selectedProfile]);

  function openEditor(profile?: VolunteerProfileRow) {
    if (profile) {
      setSelectedProfile(profile);
      setFormState({
        availability: profile.availability ?? "",
        skills: profile.skills.join(", "),
        maxHoursPerWeek: profile.maxHoursPerWeek?.toString() ?? "",
        hasVehicle: profile.hasVehicle,
        isActive: profile.isActive,
        notes: profile.notes ?? "",
      });
    } else {
      setSelectedProfile(null);
      setFormState({ availability: "", skills: "", maxHoursPerWeek: "", hasVehicle: false, isActive: true, notes: "" });
    }
    setOpenEdit(true);
  }

  async function saveProfile() {
    try {
      const url = selectedProfile ? `/api/volunteers?id=${selectedProfile.id}` : "/api/volunteers";
      const method = selectedProfile ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: formState.availability,
          skills: formState.skills.split(",").map((item) => item.trim()).filter(Boolean),
          maxHoursPerWeek: formState.maxHoursPerWeek ? Number(formState.maxHoursPerWeek) : null,
          hasVehicle: formState.hasVehicle,
          isActive: formState.isActive,
          notes: formState.notes,
          campaignId,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to save volunteer profile");
      toast.success(selectedProfile ? "Volunteer profile updated" : "Volunteer profile created");
      setOpenEdit(false);
      loadVolunteers();
    } catch (error) {
      toast.error((error as Error).message || "Failed to save");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 pb-12">
      <PageHeader
        title="Volunteers"
        description="Manage volunteer profiles, skills, availability, and performance."
        actions={<Button onClick={() => openEditor()} className="bg-[#0A2342] hover:bg-[#0A2342]/90 min-h-[44px]"><Users className="w-4 h-4" />New volunteer</Button>}
      />

      <AdoniPageAssist
        pageKey="volunteers"
        prompts={[
          "Who are my most active volunteers this week?",
          "Which volunteers have vehicles and are available weekends?",
          "Draft a thank-you message for all active volunteers",
          "Which canvassers haven't logged activity in 7 days?",
        ]}
      />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Volunteers", value: stats.total, icon: Users },
            { label: "Active", value: stats.active, icon: CheckCircle2 },
            { label: "Total Hours", value: `${stats.totalHours.toFixed(0)}h`, icon: Filter },
            { label: "Have Vehicle", value: stats.withVehicle, icon: Car },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(["roster", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "roster" ? "Roster" : "Leaderboard"}
          </button>
        ))}
      </div>

      {tab === "roster" && (
        <>
          {/* Search + Filters */}
          <Card>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, phone, or skill"
                    className="pl-9 min-h-[44px]"
                  />
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[160px] min-h-[44px]">
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <Switch checked={hasVehicle} onCheckedChange={setHasVehicle} />
                    <span className="text-sm text-gray-700 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Vehicle</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedVolunteers.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedVolunteers.length} volunteer{selectedVolunteers.length !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={async () => {
                          try {
                            const res = await fetch("/api/volunteers/bulk-activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedVolunteers }) });
                            if (!res.ok) throw new Error("Failed to activate volunteers");
                            toast.success("Volunteers activated");
                            setSelectedVolunteers([]); loadVolunteers();
                          } catch (error) { toast.error((error as Error).message); }
                        }}>
                          <CheckCircle2 className="w-4 h-4" /> Activate
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={async () => {
                          try {
                            const res = await fetch("/api/volunteers/bulk-deactivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedVolunteers }) });
                            if (!res.ok) throw new Error("Failed to deactivate volunteers");
                            toast.success("Volunteers deactivated");
                            setSelectedVolunteers([]); loadVolunteers();
                          } catch (error) { toast.error((error as Error).message); }
                        }}>
                          <XCircle className="w-4 h-4" /> Deactivate
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => openAssignShift(selectedObjects)}>
                          <UserCheck className="w-4 h-4" /> Assign Shift
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => openSendMessage(selectedObjects)}>
                          <Mail className="w-4 h-4" /> Send Message
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => openCreateTask(selectedObjects)}>
                          <ClipboardList className="w-4 h-4" /> Create Task
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={handleExport}>
                          <Download className="w-4 h-4" /> Export
                        </Button>
                        <Button size="sm" variant="secondary" className="min-h-[44px]" onClick={() => setSelectedVolunteers([])}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Roster table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedVolunteers.length === volunteers.length && volunteers.length > 0}
                        onChange={(e) => setSelectedVolunteers(e.target.checked ? volunteers.map((v) => v.id) : [])}
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Availability</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Skills</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Hours</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <ShimmerRows cols={8} />
                  ) : volunteers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14">
                        <EmptyState
                          icon={<Users className="w-12 h-12" />}
                          title="No volunteers found"
                          description="Add your first volunteer to get started"
                          action={<Button onClick={() => openEditor()} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Add Volunteer</Button>}
                        />
                      </td>
                    </tr>
                  ) : (
                    volunteers.map((v, i) => (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: i * 0.02 }}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedVolunteers.includes(v.id)}
                            onChange={(e) => setSelectedVolunteers((prev) => e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0A2342] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(v.user?.name ?? v.contact?.firstName ?? "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {v.user ? v.user.name ?? "(Unnamed)" : v.contact ? fullName(v.contact.firstName, v.contact.lastName) : "Volunteer"}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{v.user?.email ?? v.contact?.email ?? "No email"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                          {v.user?.phone ? formatPhone(v.user.phone) : v.contact?.phone ? formatPhone(v.contact.phone) : "--"}
                          {v.hasVehicle && <Car className="w-3.5 h-3.5 text-[#1D9E75] inline ml-2" />}
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{v.availability ?? "--"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {v.skills.slice(0, 3).map((s) => <Badge key={s} variant="info">{s}</Badge>)}
                            {v.skills.length > 3 && <Badge>+{v.skills.length - 3}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {v.maxHoursPerWeek ? (
                            <div className="min-w-[72px]">
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="font-medium text-gray-900">{(v.totalHours ?? 0).toFixed(1)}h</span>
                                <span className="text-gray-400">/ {v.maxHoursPerWeek}h</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#1D9E75] transition-all"
                                  style={{ width: `${Math.min(100, Math.round(((v.totalHours ?? 0) / v.maxHoursPerWeek) * 100))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900 text-sm">{(v.totalHours ?? 0).toFixed(1)}h</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={v.isActive ? "success" : "warning"}>{v.isActive ? "Active" : "Inactive"}</Badge>
                            {(() => {
                              const days = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                              if (days < 14) return <Badge variant="info">New</Badge>;
                              if (days > 365) return <Badge variant="default">1yr+</Badge>;
                              if (days > 180) return <Badge variant="default">6mo+</Badge>;
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            volunteer={v}
                            onEdit={() => openEditor(v)}
                            onAssignShift={() => openAssignShift([v])}
                            onSendMessage={() => openSendMessage([v])}
                            onCreateTask={() => openCreateTask([v])}
                          />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Showing {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} of {total}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1} className="min-h-[44px]"><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page === totalPages} className="min-h-[44px]"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Leaderboard tab */}
      {tab === "leaderboard" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring}>
          <Card className="overflow-hidden">
            {leaderboardLoading ? (
              <div className="p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <EmptyState
                icon={<Trophy className="w-12 h-12" />}
                title="No performance data yet"
                description="Volunteers will appear here once they start knocking doors"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 w-12">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Volunteer</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">
                        <span className="inline-flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5" /> Doors</span>
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 hidden sm:table-cell">This Week</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 hidden md:table-cell">Supporters</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 hidden md:table-cell">Conv%</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaderboard.map((entry, i) => (
                      <motion.tr
                        key={entry.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...spring, delay: i * 0.03 }}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-gray-400">
                          {i === 0 ? <span className="text-lg text-[#EF9F27]">1st</span>
                            : i === 1 ? <span className="text-lg text-gray-400">2nd</span>
                            : i === 2 ? <span className="text-lg text-amber-700">3rd</span>
                            : i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              i === 0 ? "bg-[#EF9F27] text-white" : "bg-[#0A2342] text-white"
                            }`}>
                              {entry.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{entry.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#0A2342]">{entry.doorsTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{entry.doorsThisWeek}</td>
                        <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{entry.supportersFound}</td>
                        <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{entry.conversionRate}%</td>
                        <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Edit/Create modal */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={selectedProfile ? `Edit ${selectedName}` : "New volunteer"} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Availability" help={{ content: "When this volunteer is free to help. Used to schedule shifts and send targeted asks.", example: "Weekday evenings, Saturday mornings" }} hint="Be specific — it helps you schedule the right people.">
              <Textarea value={formState.availability} onChange={(e) => setFormState((s) => ({ ...s, availability: e.target.value }))} placeholder="e.g. Weekday evenings and Saturdays" />
            </FormField>
            <FormField label="Skills" help={{ content: "What this volunteer can do for your campaign. Used to match them to the right tasks and shifts.", example: "Canvassing, phone banking, signs crew, driving, data entry" }} hint="Comma-separated. Add as many as apply.">
              <Input value={formState.skills} onChange={(e) => setFormState((s) => ({ ...s, skills: e.target.value }))} placeholder="Canvassing, phone banking, data entry" className="min-h-[44px]" />
            </FormField>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <FormField label="Max hours/week" help={{ content: "The most hours per week this volunteer can commit. Helps you avoid burning out your best people.", example: "8" }} hint="Leave blank if no limit.">
              <Input type="number" value={formState.maxHoursPerWeek} onChange={(e) => setFormState((s) => ({ ...s, maxHoursPerWeek: e.target.value }))} placeholder="8" className="min-h-[44px]" />
            </FormField>
            <FormField label="Vehicle" help={{ content: "Does this volunteer have a car? Drivers are valuable for GOTV day — transporting voters to the polls.", tip: "Even one driver per poll can flip the result." }}>
              <Checkbox label="Has vehicle" checked={formState.hasVehicle} onChange={(e) => setFormState((s) => ({ ...s, hasVehicle: e.target.checked }))} />
            </FormField>
            <FormField label="Status" help={{ content: "Active volunteers appear in shift assignments and bulk messaging. Set to Inactive to keep the record but exclude them from operations.", example: "Active" }}>
              <Select value={formState.isActive ? "active" : "inactive"} onChange={(e) => setFormState((s) => ({ ...s, isActive: e.target.value === "active" }))} className="min-h-[44px]">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes" help={{ content: "Anything the team should know about working with this volunteer — special skills, constraints, or context.", example: "Can only work west of Yonge. Great with seniors." }}>
            <Textarea value={formState.notes} onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))} placeholder="e.g. Prefers evening shifts. Has sign-installation experience." />
          </FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)} className="min-h-[44px]"><XCircle className="w-4 h-4" /> Cancel</Button>
            <Button onClick={saveProfile} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]"><CheckCircle2 className="w-4 h-4" /> Save</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Shift modal */}
      <Modal open={showAssignShift} onClose={() => setShowAssignShift(false)} title="Assign to Shift" size="md">
        <div className="space-y-4">
          {/* Who is being assigned */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {shiftTargets.length} volunteer{shiftTargets.length !== 1 ? "s" : ""} selected
            </p>
            <div className="flex flex-wrap gap-2">
              {shiftTargets.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-[#1D9E75] text-white text-xs flex items-center justify-center font-medium">
                    {(t.user?.name ?? t.contact?.firstName ?? "?")[0].toUpperCase()}
                  </span>
                  {t.user?.name ?? `${t.contact?.firstName ?? ""} ${t.contact?.lastName ?? ""}`.trim()}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            {shiftsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-gray-500">No upcoming shifts found.</p>
                <a
                  href="/volunteers/shifts"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: "#1D9E75" }}
                  onClick={() => setShowAssignShift(false)}
                >
                  Create a shift
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Choose a shift</p>
                {shifts.map((s) => {
                  const start = new Date(s.startTime);
                  const spotsLeft = s.capacity != null ? s.capacity - (s.signupCount ?? 0) : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShiftId(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedShiftId === s.id
                          ? "border-[#1D9E75] bg-[#1D9E75]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900">{s.name}</span>
                        {spotsLeft !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${spotsLeft > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {start.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                        {" · "}
                        {start.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <a href="/volunteers/shifts" className="text-sm text-[#1D9E75] hover:underline" onClick={() => setShowAssignShift(false)}>
              + New shift
            </a>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAssignShift(false)} className="min-h-[44px]">Cancel</Button>
              <Button onClick={submitAssignShift} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]" disabled={!selectedShiftId || shifts.length === 0}>
                <UserCheck className="w-4 h-4" /> Assign {shiftTargets.length > 1 ? `${shiftTargets.length} volunteers` : ""}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Send Message modal */}
      <Modal open={showSendMessage} onClose={() => setShowSendMessage(false)} title="Send Message" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sending to {messageTargets.length} volunteer{messageTargets.length !== 1 ? "s" : ""}.
          </p>
          <FormField label="Subject" help={{ content: "The email subject line your volunteers will see in their inbox. Keep it short and clear.", example: "Canvassing this Saturday — we need you!" }}>
            <Input
              value={messageForm.subject}
              onChange={(e) => setMessageForm((s) => ({ ...s, subject: e.target.value }))}
              placeholder="e.g. Canvassing this Saturday — we need you!"
              className="min-h-[44px]"
            />
          </FormField>
          <FormField label="Message" help={{ content: "The body of your message. Tell your volunteers what you need, when and where to show up, and what to bring.", tip: "Keep it to 3–5 sentences. Volunteers skim — be direct." }}>
            <Textarea
              value={messageForm.body}
              onChange={(e) => setMessageForm((s) => ({ ...s, body: e.target.value }))}
              placeholder="Hi team, we're canvassing Ward 5 this Saturday from 10am–1pm. Meet at 45 Elm St. Bring comfortable shoes and your phone."
              rows={5}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowSendMessage(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={submitSendMessage} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
              <Mail className="w-4 h-4" /> Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task modal */}
      <Modal open={showCreateTask} onClose={() => setShowCreateTask(false)} title="Create Task" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Creating task for {taskTargets.length} volunteer{taskTargets.length !== 1 ? "s" : ""}.
          </p>
          <FormField label="Title" help={{ content: "A short, clear description of what needs to be done. One task per action.", example: "Call to confirm Saturday shift", tip: "Tasks assigned to volunteers show up on their dashboard." }} labelSuffix={<AdoniChip prefill="Suggest a task for a volunteer" label="Ask Adoni for a volunteer task idea" />}>
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="e.g. Call to confirm Saturday shift"
              className="min-h-[44px]"
            />
          </FormField>
          <FormField label="Description" help={{ content: "Any extra context the assignee needs to complete this task.", example: "Confirm they have the meeting location and know to bring their phone." }}>
            <Textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Any extra instructions or context for this task…"
              rows={3}
            />
          </FormField>
          <FormField label="Due Date" help={{ content: "When this task must be completed by. Overdue tasks are flagged in red on the Tasks page.", tip: "Set a real deadline — it creates accountability." }}>
            <Input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((s) => ({ ...s, dueDate: e.target.value }))}
              className="min-h-[44px]"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowCreateTask(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={submitCreateTask} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
              <ClipboardList className="w-4 h-4" /> Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
