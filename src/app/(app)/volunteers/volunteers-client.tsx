"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, Search, ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle,
  Trophy, DoorOpen, TrendingUp, Car, Clock, Star, Filter,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, FormField, Input, Label,
  Modal, PageHeader, Select, Textarea, EmptyState, StatCard, Switch,
} from "@/components/ui";
import { toast } from "sonner";
import { fullName, formatPhone } from "@/lib/utils";

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

interface VolunteerStats {
  activeVolunteers: number;
  totalHours: number;
  hoursThisWeek: number;
  pendingExpensesCount: number;
  pendingExpensesTotal: number;
  upcomingShifts: number;
  activeGroups: number;
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
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [tab, setTab] = useState<"roster" | "leaderboard">("roster");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    async function loadStats() {
      try {
        const res = await fetch(`/api/volunteers/stats?campaignId=${campaignId}`);
        const payload = await res.json();
        if (res.ok) setStats(payload.data ?? null);
      } catch { /* keep UI usable */ }
    }
    loadStats();
  }, [campaignId, volunteers.length]);

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

      {/* Stats row */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="grid gap-3 grid-cols-2 lg:grid-cols-4"
        >
          <StatCard label="Active Volunteers" value={stats.activeVolunteers} icon={<Users className="w-5 h-5" />} color="blue" />
          <StatCard label="Total Hours" value={stats.totalHours.toFixed(1)} icon={<Clock className="w-5 h-5" />} color="green" />
          <StatCard label="This Week" value={stats.hoursThisWeek.toFixed(1)} change={`${stats.upcomingShifts} upcoming shifts`} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
          <StatCard label="Groups" value={stats.activeGroups} change={`$${stats.pendingExpensesTotal.toFixed(2)} pending`} icon={<Star className="w-5 h-5" />} color="purple" />
        </motion.div>
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedVolunteers.length} volunteer{selectedVolunteers.length !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex gap-2">
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
                        <td className="px-4 py-3 font-medium text-gray-900">{(v.totalHours ?? 0).toFixed(1)}h</td>
                        <td className="px-4 py-3"><Badge variant={v.isActive ? "success" : "warning"}>{v.isActive ? "Active" : "Inactive"}</Badge></td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => openEditor(v)} className="min-h-[44px]">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
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
            <FormField label="Availability"><Textarea value={formState.availability} onChange={(e) => setFormState((s) => ({ ...s, availability: e.target.value }))} placeholder="e.g. Weeknights, weekends" /></FormField>
            <FormField label="Skills"><Input value={formState.skills} onChange={(e) => setFormState((s) => ({ ...s, skills: e.target.value }))} placeholder="Organizing, canvassing, data entry" className="min-h-[44px]" /></FormField>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <FormField label="Max hours/week"><Input type="number" value={formState.maxHoursPerWeek} onChange={(e) => setFormState((s) => ({ ...s, maxHoursPerWeek: e.target.value }))} placeholder="0" className="min-h-[44px]" /></FormField>
            <FormField label="Vehicle"><Checkbox label="Has vehicle" checked={formState.hasVehicle} onChange={(e) => setFormState((s) => ({ ...s, hasVehicle: e.target.checked }))} /></FormField>
            <FormField label="Status"><Select value={formState.isActive ? "active" : "inactive"} onChange={(e) => setFormState((s) => ({ ...s, isActive: e.target.value === "active" }))} className="min-h-[44px]">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select></FormField>
          </div>
          <FormField label="Notes"><Textarea value={formState.notes} onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))} /></FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)} className="min-h-[44px]"><XCircle className="w-4 h-4" /> Cancel</Button>
            <Button onClick={saveProfile} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]"><CheckCircle2 className="w-4 h-4" /> Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
