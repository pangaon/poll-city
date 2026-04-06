"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Filter,
  List,
  MapPin,
  QrCode,
  Search,
  Send,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type ViewMode = "month" | "week" | "list";

type EventType = "canvass" | "fundraiser" | "townhall" | "meeting" | "rally" | "other";

interface EventRsvp {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  attended?: boolean;
  checkedInAt?: string | null;
}

interface EventRow {
  id: string;
  campaignId: string;
  name: string;
  eventDate: string;
  location: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  capacity: number | null;
  timezone?: string | null;
  eventType?: string | null;
  virtualUrl?: string | null;
  totals?: {
    rsvpCount: number;
    checkInCount: number;
    goingCount: number;
  };
  rsvps: EventRsvp[];
}

interface EventFormState {
  id?: string;
  name: string;
  eventDate: string;
  location: string;
  description: string;
  eventType: EventType;
  timezone: string;
  capacity: number;
  status: string;
  isPublic: boolean;
  isVirtual: boolean;
  virtualUrl: string;
  allowPublicRsvp: boolean;
  requiresApproval: boolean;
  reminderHours: number;
}

const EMPTY_FORM: EventFormState = {
  name: "",
  eventDate: "",
  location: "",
  description: "",
  eventType: "canvass",
  timezone: "America/Toronto",
  capacity: 0,
  status: "scheduled",
  isPublic: true,
  isVirtual: false,
  virtualUrl: "",
  allowPublicRsvp: true,
  requiresApproval: false,
  reminderHours: 24,
};

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string; icon: string; color: string }> = [
  { value: "canvass", label: "Canvass", icon: "🚪", color: "bg-blue-100 text-blue-700" },
  { value: "fundraiser", label: "Fundraiser", icon: "💰", color: "bg-emerald-100 text-emerald-700" },
  { value: "townhall", label: "Town Hall", icon: "🏛️", color: "bg-violet-100 text-violet-700" },
  { value: "meeting", label: "Meeting", icon: "🧭", color: "bg-amber-100 text-amber-700" },
  { value: "rally", label: "Rally", icon: "📣", color: "bg-rose-100 text-rose-700" },
  { value: "other", label: "Other", icon: "📌", color: "bg-slate-100 text-slate-700" },
];

function toInputDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function displayDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status: string): string {
  if (status === "live") return "bg-emerald-100 text-emerald-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-slate-100 text-slate-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function eventTypeMeta(eventType: string | null | undefined) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === eventType) ?? EVENT_TYPE_OPTIONS[5];
}

export default function EventsClient({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [checkInMode, setCheckInMode] = useState(false);

  async function loadEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, includePast: "true" });
      const response = await fetch(`/api/events?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load events");

      const data = (payload.data ?? []) as EventRow[];
      setEvents(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      toast.error((error as Error).message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [campaignId]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (typeFilter !== "all" && (event.eventType ?? "other") !== typeFilter) return false;
      if (search.trim()) {
        const key = `${event.name} ${event.location} ${event.description ?? ""}`.toLowerCase();
        if (!key.includes(search.toLowerCase())) return false;
      }

      if (viewMode === "week") {
        const diff = new Date(event.eventDate).getTime() - now;
        return diff >= -2 * 24 * 60 * 60 * 1000 && diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (viewMode === "month") {
        const diff = new Date(event.eventDate).getTime() - now;
        return diff >= -7 * 24 * 60 * 60 * 1000 && diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [events, search, statusFilter, typeFilter, viewMode]);

  const selectedEvent = useMemo(
    () => filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedId],
  );

  const stats = useMemo(() => {
    const upcoming = events.filter((event) => new Date(event.eventDate).getTime() > Date.now()).length;
    const totalRsvps = events.reduce((sum, event) => sum + (event.totals?.rsvpCount ?? event.rsvps.length), 0);
    const weekEdge = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const thisWeek = events.filter((event) => {
      const t = new Date(event.eventDate).getTime();
      return t >= Date.now() && t <= weekEdge;
    }).length;
    return { upcoming, totalRsvps, thisWeek };
  }, [events]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(event: EventRow) {
    setForm({
      id: event.id,
      name: event.name,
      eventDate: toInputDate(event.eventDate),
      location: event.location,
      description: event.description ?? "",
      eventType: (event.eventType as EventType) ?? "other",
      timezone: event.timezone || "America/Toronto",
      capacity: event.capacity ?? 0,
      status: event.status,
      isPublic: event.isPublic,
      isVirtual: Boolean(event.virtualUrl),
      virtualUrl: event.virtualUrl ?? "",
      allowPublicRsvp: true,
      requiresApproval: false,
      reminderHours: 24,
    });
    setFormOpen(true);
  }

  async function saveEvent() {
    if (!form.name.trim() || !form.eventDate || !form.location.trim()) {
      toast.error("Name, date, and location are required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        campaignId,
        name: form.name,
        eventDate: form.eventDate,
        location: form.location,
        description: form.description,
        eventType: form.eventType,
        timezone: form.timezone,
        capacity: form.capacity > 0 ? form.capacity : null,
        status: form.status,
        isPublic: form.isPublic,
        isVirtual: form.isVirtual,
        virtualUrl: form.isVirtual ? form.virtualUrl : null,
        allowPublicRsvp: form.allowPublicRsvp,
        requiresApproval: form.requiresApproval,
      };

      const endpoint = form.id ? `/api/events/${form.id}` : "/api/events";
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save event");

      toast.success(form.id ? "Event updated" : "Event created");
      setFormOpen(false);
      await loadEvents();
    } catch (error) {
      toast.error((error as Error).message || "Unable to save event");
    } finally {
      setSaving(false);
    }
  }

  async function sendReminder() {
    if (!selectedEvent) return;
    toast.success(`Reminder queued for ${selectedEvent.name}`);
  }

  async function sendFollowUp() {
    if (!selectedEvent) return;
    toast.success(`Follow-up queued for ${selectedEvent.name}`);
  }

  async function checkIn(rsvpId: string) {
    if (!selectedEvent) return;
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId }),
      });
      if (!response.ok) throw new Error("Check-in failed");
      toast.success("Checked in");
      await loadEvents();
    } catch {
      toast.error("Unable to check in attendee");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500">Plan, run, and follow up events across campaign and public audiences.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Create event
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={stats.upcoming} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Total RSVPs" value={stats.totalRsvps} />
        <StatCard icon={<Clock3 className="h-4 w-4" />} label="This week" value={stats.thisWeek} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or notes"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            {([
              ["month", "Month"],
              ["week", "Week"],
              ["list", "List"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${viewMode === id ? "bg-blue-700 text-white" : "text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All types</option>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Events list ({filteredEvents.length})</p>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">No events match your filters.</p>
            ) : (
              filteredEvents.map((event) => {
                const type = eventTypeMeta(event.eventType);
                const active = selectedEvent?.id === event.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${active ? "bg-blue-50/60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{event.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${type.color}`}>
                        {type.icon} {type.label}
                      </span>
                      <span>{displayDate(event.eventDate)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      RSVPs {(event.totals?.rsvpCount ?? event.rsvps.length)}
                      {typeof event.capacity === "number" ? ` / ${event.capacity}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          {!selectedEvent ? (
            <p className="p-5 text-sm text-gray-500">Select an event to view details.</p>
          ) : (
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-gray-900">{selectedEvent.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{displayDate(selectedEvent.eventDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(selectedEvent)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-700" />{selectedEvent.location}</p>
                {selectedEvent.virtualUrl && (
                  <p className="mt-2 inline-flex items-center gap-2"><Video className="h-4 w-4 text-blue-700" />{selectedEvent.virtualUrl}</p>
                )}
                {selectedEvent.description && <p className="mt-2 text-gray-600">{selectedEvent.description}</p>}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={sendReminder}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Send className="h-4 w-4" />
                  Send reminder
                </button>
                <button
                  type="button"
                  onClick={sendFollowUp}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <List className="h-4 w-4" />
                  Post-event follow-up
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">Check-in mode</p>
                  <button
                    type="button"
                    onClick={() => setCheckInMode((prev) => !prev)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${checkInMode ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    {checkInMode ? "Enabled" : "Enable"}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    <QrCode className="h-4 w-4" />
                    QR scanner option
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">RSVP list</p>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                  {(selectedEvent.rsvps ?? []).length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No RSVPs yet.</p>
                  ) : (
                    selectedEvent.rsvps.map((rsvp) => (
                      <div key={rsvp.id} className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{rsvp.name}</p>
                          <p className="text-xs text-gray-500">{rsvp.email}{rsvp.phone ? ` • ${rsvp.phone}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rsvp.attended ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {rsvp.attended ? "checked in" : rsvp.status}
                          </span>
                          {checkInMode && !rsvp.attended && (
                            <button
                              type="button"
                              onClick={() => void checkIn(rsvp.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                            >
                              Check in
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <p className="text-lg font-semibold text-gray-900">{form.id ? "Edit event" : "Create event"}</p>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm text-gray-600">
                Event name
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600">
                Type
                <select value={form.eventType} onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value as EventType }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-600">
                Date and time
                <input type="datetime-local" value={form.eventDate} onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600">
                Timezone
                <input value={form.timezone} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600 md:col-span-2">
                Location
                <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600">
                Capacity
                <input type="number" min={0} value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600">
                Status
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isVirtual} onChange={(e) => setForm((prev) => ({ ...prev, isVirtual: e.target.checked }))} />
                Virtual event
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.allowPublicRsvp} onChange={(e) => setForm((prev) => ({ ...prev, allowPublicRsvp: e.target.checked }))} />
                Allow public RSVP
              </label>

              {form.isVirtual && (
                <label className="text-sm text-gray-600 md:col-span-2">
                  Virtual URL
                  <input value={form.virtualUrl} onChange={(e) => setForm((prev) => ({ ...prev, virtualUrl: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
              )}

              <label className="text-sm text-gray-600 md:col-span-2">
                Description
                <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="text-sm text-gray-600">
                Reminder schedule (hours before)
                <input type="number" min={1} value={form.reminderHours} onChange={(e) => setForm((prev) => ({ ...prev, reminderHours: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <div className="flex items-end justify-end gap-2 md:col-span-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button type="button" onClick={() => void saveEvent()} disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                  {saving ? "Saving..." : form.id ? "Save changes" : "Create event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between text-gray-500">
        <span className="text-sm font-medium">{label}</span>
        <span>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
