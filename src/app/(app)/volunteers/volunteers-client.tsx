"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Search, ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle } from "lucide-react";
import { Badge, Button, Card, CardContent, Checkbox, FormField, Input, Label, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";
import { fullName, formatPhone } from "@/lib/utils";

interface VolunteerProfileRow {
  id: string;
  availability: string | null;
  skills: string[];
  maxHoursPerWeek: number | null;
  hasVehicle: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; address1: string | null; city: string | null } | null;
}

interface Props { campaignId: string; }

interface VolunteerStats {
  activeVolunteers: number;
  totalHours: number;
  hoursThisWeek: number;
  pendingExpensesCount: number;
  pendingExpensesTotal: number;
  upcomingShifts: number;
  activeGroups: number;
}

const pageSize = 25;

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
      } catch {
        // keep UI usable if stats endpoint is unavailable
      }
    }

    loadStats();
  }, [campaignId, volunteers.length]);

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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Volunteers"
        description="Manage volunteer profiles, skills, availability, and activity."
        actions={<Button onClick={() => openEditor()}><Users className="w-4 h-4" />New volunteer</Button>}
      />

      {stats && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="py-4"><p className="text-xs text-gray-500">Active Volunteers</p><p className="text-2xl font-bold text-gray-900">{stats.activeVolunteers}</p></CardContent></Card>
          <Card><CardContent className="py-4"><p className="text-xs text-gray-500">Total Hours Logged</p><p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</p><p className="text-xs text-gray-500 mt-1">{stats.hoursThisWeek.toFixed(1)} this week</p></CardContent></Card>
          <Card><CardContent className="py-4"><p className="text-xs text-gray-500">Pending Expenses</p><p className="text-2xl font-bold text-gray-900">{stats.pendingExpensesCount}</p><p className="text-xs text-gray-500 mt-1">${stats.pendingExpensesTotal.toFixed(2)} pending</p></CardContent></Card>
          <Card><CardContent className="py-4"><p className="text-xs text-gray-500">Ops Capacity</p><p className="text-2xl font-bold text-gray-900">{stats.upcomingShifts}</p><p className="text-xs text-gray-500 mt-1">{stats.activeGroups} active groups</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone, or skill"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[180px]">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              <Checkbox label="Has vehicle" checked={hasVehicle} onChange={(event) => setHasVehicle(event.target.checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedVolunteers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedVolunteers.length} volunteer{selectedVolunteers.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/volunteers/bulk-activate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: selectedVolunteers }),
                      });
                      if (!res.ok) throw new Error("Failed to activate volunteers");
                      toast.success("Volunteers activated");
                      setSelectedVolunteers([]);
                      loadVolunteers();
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/volunteers/bulk-deactivate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: selectedVolunteers }),
                      });
                      if (!res.ok) throw new Error("Failed to deactivate volunteers");
                      toast.success("Volunteers deactivated");
                      setSelectedVolunteers([]);
                      loadVolunteers();
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedVolunteers.length === volunteers.length && volunteers.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedVolunteers(volunteers.map((volunteer) => volunteer.id));
                      } else {
                        setSelectedVolunteers([]);
                      }
                    }}
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
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <td key={idx} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : volunteers.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-gray-500">No volunteers found for this campaign.</td></tr>
              ) : (
                volunteers.map((volunteer) => (
                  <tr key={volunteer.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedVolunteers.includes(volunteer.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedVolunteers((prev) => [...prev, volunteer.id]);
                          } else {
                            setSelectedVolunteers((prev) => prev.filter((id) => id !== volunteer.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {volunteer.user ? volunteer.user.name ?? "(Unnamed)" : volunteer.contact ? fullName(volunteer.contact.firstName, volunteer.contact.lastName) : "Volunteer"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {volunteer.user?.email ?? volunteer.contact?.email ?? "No email"}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-gray-600">
                        {volunteer.user?.phone ? formatPhone(volunteer.user.phone) : volunteer.contact?.phone ? formatPhone(volunteer.contact.phone) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{volunteer.availability ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="space-x-1 flex flex-wrap">{volunteer.skills.slice(0, 3).map((skill) => <Badge key={skill} variant="info">{skill}</Badge>)}</div></td>
                    <td className="px-4 py-3">{volunteer.maxHoursPerWeek ?? "—"} hrs</td>
                    <td className="px-4 py-3"><Badge variant={volunteer.isActive ? "success" : "warning"}>{volunteer.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openEditor(volunteer)}>
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={selectedProfile ? `Edit ${selectedName}` : "New volunteer"} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Availability"><Textarea value={formState.availability} onChange={(event) => setFormState((state) => ({ ...state, availability: event.target.value }))} placeholder="e.g. Weeknights, weekends" /></FormField>
            <FormField label="Skills"><Input value={formState.skills} onChange={(event) => setFormState((state) => ({ ...state, skills: event.target.value }))} placeholder="Organizing, canvassing, data entry" /></FormField>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <FormField label="Max hours/week"><Input type="number" value={formState.maxHoursPerWeek} onChange={(event) => setFormState((state) => ({ ...state, maxHoursPerWeek: event.target.value }))} placeholder="0" /></FormField>
            <FormField label="Vehicle"><Checkbox label="Has vehicle" checked={formState.hasVehicle} onChange={(event) => setFormState((state) => ({ ...state, hasVehicle: event.target.checked }))} /></FormField>
            <FormField label="Status"><Select value={formState.isActive ? "active" : "inactive"} onChange={(event) => setFormState((state) => ({ ...state, isActive: event.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select></FormField>
          </div>
          <FormField label="Notes"><Textarea value={formState.notes} onChange={(event) => setFormState((state) => ({ ...state, notes: event.target.value }))} /></FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}><XCircle className="w-4 h-4" />Cancel</Button>
            <Button onClick={saveProfile}><CheckCircle2 className="w-4 h-4" />Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
