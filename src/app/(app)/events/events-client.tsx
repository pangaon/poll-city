"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Filter,
  List,
  MapPin,
  Megaphone,
  PartyPopper,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Search,
  Send,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants & types                                                  */
/* ------------------------------------------------------------------ */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

type ViewMode = "calendar" | "list";

type EventType =
  | "canvass_launch"
  | "phone_banking"
  | "fundraiser"
  | "town_hall"
  | "meet_and_greet"
  | "debate_watch"
  | "volunteer_appreciation"
  | "advance_voting"
  | "election_day_ops"
  | "sign_pickup"
  | "training"
  | "other";

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
  maxWaitlist: number | null;
  timezone?: string | null;
  eventType?: string | null;
  virtualUrl?: string | null;
  isVirtual?: boolean;
  isTownhall?: boolean;
  townhallStatus?: string | null;
  slug?: string | null;
  allowPublicRsvp?: boolean;
  requiresApproval?: boolean;
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
  maxWaitlist: number;
  status: string;
  isPublic: boolean;
  isVirtual: boolean;
  virtualUrl: string;
  allowPublicRsvp: boolean;
  requiresApproval: boolean;
}

interface RsvpFormState {
  name: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: EventFormState = {
  name: "",
  eventDate: "",
  location: "",
  description: "",
  eventType: "canvass_launch",
  timezone: "America/Toronto",
  capacity: 0,
  maxWaitlist: 0,
  status: "scheduled",
  isPublic: true,
  isVirtual: false,
  virtualUrl: "",
  allowPublicRsvp: true,
  requiresApproval: false,
};

const EMPTY_RSVP: RsvpFormState = { name: "", email: "", phone: "" };

const EVENT_TYPE_OPTIONS: Array<{
  value: EventType;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: "canvass_launch", label: "Canvass Launch", icon: "\uD83D\uDEAA", color: "bg-blue-100 text-blue-700" },
  { value: "phone_banking", label: "Phone Banking", icon: "\uD83D\uDCDE", color: "bg-indigo-100 text-indigo-700" },
  { value: "fundraiser", label: "Fundraiser", icon: "\uD83D\uDCB0", color: "bg-emerald-100 text-emerald-700" },
  { value: "town_hall", label: "Town Hall", icon: "\uD83C\uDFDB\uFE0F", color: "bg-violet-100 text-violet-700" },
  { value: "meet_and_greet", label: "Meet & Greet", icon: "\uD83E\uDD1D", color: "bg-amber-100 text-amber-700" },
  { value: "debate_watch", label: "Debate Watch Party", icon: "\uD83D\uDCFA", color: "bg-rose-100 text-rose-700" },
  { value: "volunteer_appreciation", label: "Volunteer Appreciation", icon: "\uD83C\uDF89", color: "bg-pink-100 text-pink-700" },
  { value: "advance_voting", label: "Advance Voting Day", icon: "\uD83D\uDDF3\uFE0F", color: "bg-cyan-100 text-cyan-700" },
  { value: "election_day_ops", label: "Election Day Ops", icon: "\u2B50", color: "bg-orange-100 text-orange-700" },
  { value: "sign_pickup", label: "Sign Pickup", icon: "\uD83E\uDEA7", color: "bg-lime-100 text-lime-700" },
  { value: "training", label: "Training", icon: "\uD83D\uDCDA", color: "bg-teal-100 text-teal-700" },
  { value: "other", label: "Other", icon: "\uD83D\uDCCC", color: "bg-slate-100 text-slate-700" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function shortDay(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-CA", { weekday: "short" });
}

function statusBadge(status: string): string {
  if (status === "live") return "bg-emerald-100 text-emerald-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-slate-100 text-slate-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function rsvpBadge(status: string): string {
  if (status === "going" || status === "checked_in") return "bg-emerald-100 text-emerald-700";
  if (status === "waitlisted") return "bg-amber-100 text-amber-700";
  if (status === "not_going" || status === "no_show") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function eventTypeMeta(eventType: string | null | undefined) {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === eventType) ?? EVENT_TYPE_OPTIONS[11];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/* ------------------------------------------------------------------ */
/*  Spring motion presets                                              */
/* ------------------------------------------------------------------ */

const springButton = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 400, damping: 17 },
};

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

/* ------------------------------------------------------------------ */
/*  Shimmer skeleton                                                   */
/* ------------------------------------------------------------------ */

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpForm, setRsvpForm] = useState<RsvpFormState>(EMPTY_RSVP);
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  // Bulk selection
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  // Bulk check-in modal
  const [bulkCheckInEventId, setBulkCheckInEventId] = useState<string | null>(null);
  const [checkInStates, setCheckInStates] = useState<Record<string, boolean>>({});

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, includePast: "true" });
      const response = await fetch(`/api/events?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load events");
      const data = (payload.data ?? []) as EventRow[];
      setEvents(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (error) {
      toast.error((error as Error).message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedId]);

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  /* ---- Filters ---- */
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (typeFilter !== "all" && (ev.eventType ?? "other") !== typeFilter) return false;
      if (search.trim()) {
        const key = `${ev.name} ${ev.location} ${ev.description ?? ""}`.toLowerCase();
        if (!key.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, search, statusFilter, typeFilter]);

  const selectedEvent = useMemo(
    () => filteredEvents.find((ev) => ev.id === selectedId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedId],
  );

  const stats = useMemo(() => {
    const upcoming = events.filter((ev) => new Date(ev.eventDate).getTime() > Date.now()).length;
    const totalRsvps = events.reduce((s, ev) => s + (ev.totals?.rsvpCount ?? ev.rsvps.length), 0);
    const weekEdge = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const thisWeek = events.filter((ev) => {
      const t = new Date(ev.eventDate).getTime();
      return t >= Date.now() && t <= weekEdge;
    }).length;
    return { upcoming, totalRsvps, thisWeek };
  }, [events]);

  /* ---- Calendar helpers ---- */
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfWeek(calYear, calMonth);
    const cells: Array<{ day: number | null; events: EventRow[] }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, events: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = filteredEvents.filter((ev) => {
        const ed = new Date(ev.eventDate);
        return ed.getFullYear() === calYear && ed.getMonth() === calMonth && ed.getDate() === d;
      });
      cells.push({ day: d, events: dayEvents });
    }
    return cells;
  }, [calYear, calMonth, filteredEvents]);

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  const monthLabel = new Date(calYear, calMonth).toLocaleString("en-CA", { month: "long", year: "numeric" });

  /* ---- CRUD handlers ---- */
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(ev: EventRow) {
    setForm({
      id: ev.id,
      name: ev.name,
      eventDate: toInputDate(ev.eventDate),
      location: ev.location,
      description: ev.description ?? "",
      eventType: (ev.eventType as EventType) ?? "other",
      timezone: ev.timezone || "America/Toronto",
      capacity: ev.capacity ?? 0,
      maxWaitlist: ev.maxWaitlist ?? 0,
      status: ev.status,
      isPublic: ev.isPublic,
      isVirtual: ev.isVirtual ?? false,
      virtualUrl: ev.virtualUrl ?? "",
      allowPublicRsvp: ev.allowPublicRsvp ?? true,
      requiresApproval: ev.requiresApproval ?? false,
    });
    setFormOpen(true);
  }

  function openDuplicate(ev: EventRow) {
    setForm({
      name: `${ev.name} (Copy)`,
      eventDate: "",
      location: ev.location,
      description: ev.description ?? "",
      eventType: (ev.eventType as EventType) ?? "other",
      timezone: ev.timezone || "America/Toronto",
      capacity: ev.capacity ?? 0,
      maxWaitlist: ev.maxWaitlist ?? 0,
      status: "draft",
      isPublic: ev.isPublic,
      isVirtual: ev.isVirtual ?? false,
      virtualUrl: ev.virtualUrl ?? "",
      allowPublicRsvp: ev.allowPublicRsvp ?? true,
      requiresApproval: ev.requiresApproval ?? false,
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
        maxWaitlist: form.maxWaitlist > 0 ? form.maxWaitlist : null,
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

  async function cancelEvent(ev: EventRow) {
    if (!confirm(`Cancel "${ev.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) throw new Error("Failed to cancel");
      toast.success("Event cancelled");
      await loadEvents();
    } catch {
      toast.error("Unable to cancel event");
    }
  }

  async function deleteEvent(ev: EventRow) {
    if (!confirm(`Permanently delete "${ev.name}"?`)) return;
    try {
      const response = await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Event deleted");
      setSelectedId(null);
      await loadEvents();
    } catch {
      toast.error("Unable to delete event");
    }
  }

  async function duplicateEvent(ev: EventRow) {
    try {
      const response = await fetch(`/api/events/${ev.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to duplicate");
      toast.success("Event duplicated as draft");
      await loadEvents();
    } catch {
      toast.error("Unable to duplicate event");
    }
  }

  /* ---- RSVP ---- */
  async function addRsvp() {
    if (!selectedEvent) return;
    if (!rsvpForm.name.trim() || !rsvpForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setRsvpSaving(true);
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rsvpForm.name,
          email: rsvpForm.email,
          phone: rsvpForm.phone || null,
          status: "going",
          source: "staff",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to add RSVP");
      const rsvpData = payload.data as EventRsvp | undefined;
      const wasWaitlisted = rsvpData?.status === "waitlisted";
      toast.success(wasWaitlisted ? "Added to waitlist (event at capacity)" : "RSVP added");
      setRsvpForm(EMPTY_RSVP);
      setRsvpOpen(false);
      await loadEvents();
    } catch (error) {
      toast.error((error as Error).message || "Unable to add RSVP");
    } finally {
      setRsvpSaving(false);
    }
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

  /* ---- iCal export ---- */
  function downloadIcal(eventId: string) {
    window.open(`/api/events/${eventId}/calendar`, "_blank");
  }

  /* ---- Reminder / follow-up ---- */
  async function sendReminder() {
    if (!selectedEvent) return;
    const toastId = toast.loading(`Sending reminders for ${selectedEvent.name}…`);
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}/remind`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send reminders", { id: toastId });
        return;
      }
      if (data.sent === 0) {
        toast.info(data.message ?? "No confirmed RSVPs to remind.", { id: toastId });
      } else {
        toast.success(
          `Reminder sent to ${data.sent} attendee${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
          { id: toastId }
        );
      }
    } catch {
      toast.error("Network error — reminders not sent", { id: toastId });
    }
  }

  async function sendFollowUp() {
    if (!selectedEvent) return;
    const toastId = toast.loading(`Sending follow-ups for ${selectedEvent.name}…`);
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}/followup`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send follow-ups", { id: toastId });
        return;
      }
      if (data.sent === 0) {
        toast.info(data.message ?? "All RSVPs already received a follow-up.", { id: toastId });
      } else {
        toast.success(
          `Follow-up sent to ${data.sent} attendee${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
          { id: toastId }
        );
      }
    } catch {
      toast.error("Network error — follow-ups not sent", { id: toastId });
    }
  }

  /* ---- Bulk event selection helpers ---- */
  function toggleEventSelection(id: string, checked: boolean) {
    setSelectedEventIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedEventIds(checked ? filteredEvents.map((ev) => ev.id) : []);
  }

  async function exportSignInSheet(eventId: string) {
    try {
      const url = `/api/export/events?campaignId=${campaignId}&eventId=${eventId}&format=signin`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sign-in-sheet-${eventId}-${Date.now()}.csv`;
      a.click();
      toast.success("Sign-in sheet downloaded");
    } catch {
      toast.error("Export failed");
    }
  }

  async function handleBulkExportSignIn() {
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedEventIds.map((id) => exportSignInSheet(id)));
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkSendReminder() {
    setBulkActionLoading(true);
    try {
      await Promise.allSettled(
        selectedEventIds.map(async (eventId) => {
          const ev = events.find((e) => e.id === eventId);
          if (!ev) return;
          const contactIds = ev.rsvps
            .filter((r) => r.status === "going" || r.status === "checked_in")
            .map((r) => r.id);
          if (contactIds.length === 0) return;
          return fetch("/api/communications/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              subject: `Reminder: ${ev.name}`,
              bodyHtml: `<p>This is a reminder that <strong>${ev.name}</strong> is coming up on ${displayDate(ev.eventDate)} at ${ev.location}.</p><p>We look forward to seeing you there!</p>`,
              contactIds,
            }),
          });
        })
      );
      toast.success(`Reminders queued for ${selectedEventIds.length} event${selectedEventIds.length !== 1 ? "s" : ""}`);
      setSelectedEventIds([]);
    } catch {
      toast.error("Failed to send reminders");
    } finally {
      setBulkActionLoading(false);
    }
  }

  function openBulkCheckIn(eventId: string) {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const initial: Record<string, boolean> = {};
    ev.rsvps.forEach((r) => { initial[r.id] = r.attended ?? false; });
    setCheckInStates(initial);
    setBulkCheckInEventId(eventId);
  }

  async function saveBulkCheckIn() {
    if (!bulkCheckInEventId) return;
    setBulkActionLoading(true);
    try {
      const rsvpIds = Object.entries(checkInStates)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      const res = await fetch(`/api/events/${bulkCheckInEventId}/check-in`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpIds }),
      });
      if (!res.ok) throw new Error("Bulk check-in failed");
      toast.success("Check-ins saved");
      setBulkCheckInEventId(null);
      await loadEvents();
    } catch {
      toast.error("Failed to save check-ins");
    } finally {
      setBulkActionLoading(false);
    }
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  const bulkCheckInEvent = bulkCheckInEventId ? events.find((e) => e.id === bulkCheckInEventId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
            Events
          </h1>
          <p className="text-sm text-gray-500">
            Plan, run, and follow up events across campaign and public audiences.
          </p>
        </div>
        <motion.button
          {...springButton}
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: GREEN, minHeight: 44 }}
        >
          <Plus className="h-4 w-4" />
          Create event
        </motion.button>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={stats.upcoming} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Total RSVPs" value={stats.totalRsvps} />
        <StatCard icon={<Clock3 className="h-4 w-4" />} label="This week" value={stats.thisWeek} />
      </div>

      {/* ---- Toolbar ---- */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or notes"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
              style={{ minHeight: 44 }}
            />
          </div>

          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            {([["calendar", "Calendar"], ["list", "List"]] as const).map(([id, label]) => (
              <motion.button
                key={id}
                {...springButton}
                type="button"
                onClick={() => setViewMode(id)}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold"
                style={
                  viewMode === id
                    ? { backgroundColor: NAVY, color: "#fff" }
                    : { color: "#4b5563" }
                }
              >
                {id === "calendar" ? <Calendar className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                {label}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              style={{ minHeight: 44 }}
            >
              <option value="all">All types</option>
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              style={{ minHeight: 44 }}
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

      {/* ---- Bulk action bar ---- */}
      <AnimatePresence>
        {selectedEventIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex flex-wrap items-center gap-2"
          >
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">
              {selectedEventIds.length} event{selectedEventIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="w-px h-5 bg-blue-200 mx-1" />
            <motion.button
              {...springButton}
              type="button"
              disabled={bulkActionLoading}
              onClick={() => void handleBulkExportSignIn()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
              style={{ minHeight: 36 }}
            >
              <Download className="h-3.5 w-3.5" />
              Export Sign-in Sheet{selectedEventIds.length > 1 ? "s" : ""}
            </motion.button>
            <motion.button
              {...springButton}
              type="button"
              disabled={bulkActionLoading}
              onClick={() => void handleBulkSendReminder()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
              style={{ minHeight: 36 }}
            >
              <Send className="h-3.5 w-3.5" />
              Send Reminder{selectedEventIds.length > 1 ? "s" : ""}
            </motion.button>
            <motion.button
              {...springButton}
              type="button"
              onClick={() => setSelectedEventIds([])}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              style={{ minHeight: 36 }}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Calendar View ---- */}
      {viewMode === "calendar" && (
        <motion.div {...fadeIn} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <motion.button {...springButton} type="button" onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100" style={{ minHeight: 44, minWidth: 44 }}>
              <ChevronLeft className="h-5 w-5" style={{ color: NAVY }} />
            </motion.button>
            <p className="text-sm font-bold" style={{ color: NAVY }}>
              {monthLabel}
            </p>
            <motion.button {...springButton} type="button" onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100" style={{ minHeight: 44, minWidth: 44 }}>
              <ChevronRight className="h-5 w-5" style={{ color: NAVY }} />
            </motion.button>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((cell, idx) => {
              const isToday =
                cell.day === now.getDate() &&
                calMonth === now.getMonth() &&
                calYear === now.getFullYear();
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] rounded-lg border p-1 text-xs ${
                    cell.day ? "border-gray-100 bg-white" : "border-transparent bg-gray-50/50"
                  }`}
                >
                  {cell.day && (
                    <>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          isToday ? "text-white" : "text-gray-700"
                        }`}
                        style={isToday ? { backgroundColor: GREEN } : undefined}
                      >
                        {cell.day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {cell.events.slice(0, 3).map((ev) => {
                          const tm = eventTypeMeta(ev.eventType);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => {
                                setSelectedId(ev.id);
                                setDetailOpen(true);
                              }}
                              className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${tm.color}`}
                            >
                              {ev.name}
                            </button>
                          );
                        })}
                        {cell.events.length > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{cell.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---- List View ---- */}
      {viewMode === "list" && (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          {/* Event list panel */}
          <motion.div {...fadeIn} className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                aria-label="Select all events"
                checked={filteredEvents.length > 0 && selectedEventIds.length === filteredEvents.length}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              <p className="text-sm font-semibold" style={{ color: NAVY }}>
                Events ({filteredEvents.length})
              </p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-20" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarPlus className="h-10 w-10 text-gray-300" />}
                  headline="No events yet"
                  description="Create your first event to get started."
                  action={
                    <motion.button
                      {...springButton}
                      type="button"
                      onClick={openCreate}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                      style={{ backgroundColor: GREEN, minHeight: 44 }}
                    >
                      <Plus className="h-4 w-4" />
                      Create event
                    </motion.button>
                  }
                />
              ) : (
                filteredEvents.map((ev) => {
                  const type = eventTypeMeta(ev.eventType);
                  const active = selectedEvent?.id === ev.id;
                  const isChecked = selectedEventIds.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className={`border-b border-gray-100 ${active ? "bg-[#0A2342]/5" : ""}`}
                    >
                      <div className="flex items-start gap-2 px-4 pt-3 pb-1">
                        <input
                          type="checkbox"
                          aria-label={`Select ${ev.name}`}
                          checked={isChecked}
                          onChange={(e) => toggleEventSelection(ev.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600"
                        />
                        <motion.button
                          whileHover={{ backgroundColor: "rgba(29, 158, 117, 0.04)" }}
                          type="button"
                          onClick={() => setSelectedId(ev.id)}
                          className="min-w-0 flex-1 text-left rounded-lg -mx-1 px-1"
                          style={{ minHeight: 44 }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>
                              {ev.name}
                            </p>
                            <div className="flex shrink-0 items-center gap-1">
                              {ev.isTownhall && ev.townhallStatus === "live" && (
                                <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                  LIVE
                                </span>
                              )}
                              {ev.isTownhall && ev.townhallStatus !== "live" && (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                                  Townhall
                                </span>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(ev.status)}`}
                              >
                                {ev.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${type.color}`}>
                              {type.icon} {type.label}
                            </span>
                            <span>{shortDay(ev.eventDate)} {displayDate(ev.eventDate)}</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {ev.totals?.goingCount ?? 0} going
                            </span>
                            {ev.capacity ? (() => {
                              const going = ev.totals?.goingCount ?? 0;
                              const pct = Math.min(100, Math.round((going / ev.capacity) * 100));
                              const barColor = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
                              return (
                                <span className="flex items-center gap-1.5">
                                  <span>{going}/{ev.capacity}</span>
                                  <span className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden inline-flex">
                                    <span className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                  </span>
                                </span>
                              );
                            })() : null}
                            {(ev.totals?.checkInCount ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-1" style={{ color: GREEN }}>
                                <UserCheck className="h-3 w-3" />
                                {ev.totals?.checkInCount} checked in
                              </span>
                            )}
                          </div>
                        </motion.button>
                      </div>
                      {/* Per-event quick actions */}
                      <div className="flex items-center gap-1.5 px-4 pb-2 pt-1">
                        <motion.button
                          {...springButton}
                          type="button"
                          title="Bulk check-in"
                          onClick={() => openBulkCheckIn(ev.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
                          style={{ minHeight: 28 }}
                        >
                          <UserCheck className="h-3 w-3" />
                          Check-in
                        </motion.button>
                        <motion.button
                          {...springButton}
                          type="button"
                          title="Export sign-in sheet"
                          onClick={() => void exportSignInSheet(ev.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
                          style={{ minHeight: 28 }}
                        >
                          <Download className="h-3 w-3" />
                          Sign-in Sheet
                        </motion.button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Detail panel */}
          <motion.div {...fadeIn} className="rounded-2xl border border-gray-200 bg-white">
            {!selectedEvent ? (
              <EmptyState
                icon={<Megaphone className="h-10 w-10 text-gray-300" />}
                headline="Select an event"
                description="Choose an event from the list to view details."
              />
            ) : (
              <EventDetail
                ev={selectedEvent}
                checkInMode={checkInMode}
                setCheckInMode={setCheckInMode}
                onEdit={() => openEdit(selectedEvent)}
                onDuplicate={() => duplicateEvent(selectedEvent)}
                onCancel={() => cancelEvent(selectedEvent)}
                onDelete={() => deleteEvent(selectedEvent)}
                onOpenDuplicateForm={() => openDuplicate(selectedEvent)}
                onCheckIn={checkIn}
                onDownloadIcal={() => downloadIcal(selectedEvent.id)}
                onSendReminder={sendReminder}
                onSendFollowUp={sendFollowUp}
                onOpenRsvp={() => setRsvpOpen(true)}
              />
            )}
          </motion.div>
        </div>
      )}

      {/* ---- Calendar click detail drawer ---- */}
      <AnimatePresence>
        {viewMode === "calendar" && detailOpen && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onClick={() => setDetailOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <p className="text-lg font-bold" style={{ color: NAVY }}>
                  {selectedEvent.name}
                </p>
                <button type="button" onClick={() => setDetailOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5">
                <EventDetail
                  ev={selectedEvent}
                  checkInMode={checkInMode}
                  setCheckInMode={setCheckInMode}
                  onEdit={() => { setDetailOpen(false); openEdit(selectedEvent); }}
                  onDuplicate={() => { setDetailOpen(false); duplicateEvent(selectedEvent); }}
                  onCancel={() => { setDetailOpen(false); cancelEvent(selectedEvent); }}
                  onDelete={() => { setDetailOpen(false); deleteEvent(selectedEvent); }}
                  onOpenDuplicateForm={() => { setDetailOpen(false); openDuplicate(selectedEvent); }}
                  onCheckIn={checkIn}
                  onDownloadIcal={() => downloadIcal(selectedEvent.id)}
                  onSendReminder={sendReminder}
                  onSendFollowUp={sendFollowUp}
                  onOpenRsvp={() => setRsvpOpen(true)}
                  compact
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Create/Edit modal ---- */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <p className="text-lg font-bold" style={{ color: NAVY }}>
                  {form.id ? "Edit event" : "Create event"}
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <FormField label="Event name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-base"
                    placeholder="Canvass launch at City Hall"
                  />
                </FormField>

                <FormField label="Event type">
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value as EventType }))}
                    className="input-base"
                  >
                    {EVENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.icon} {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Date and time">
                  <input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                    className="input-base"
                  />
                </FormField>

                <FormField label="Timezone">
                  <input
                    value={form.timezone}
                    onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                    className="input-base"
                  />
                </FormField>

                <FormField label="Location" className="md:col-span-2">
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className="input-base"
                    placeholder="123 Main St, Toronto"
                  />
                </FormField>

                <FormField label="Capacity (0 = unlimited)">
                  <input
                    type="number"
                    min={0}
                    value={form.capacity}
                    onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                    className="input-base"
                  />
                </FormField>

                <FormField label="Waitlist cap (0 = unlimited)">
                  <input
                    type="number"
                    min={0}
                    value={form.maxWaitlist}
                    onChange={(e) => setForm((p) => ({ ...p, maxWaitlist: Number(e.target.value) }))}
                    className="input-base"
                  />
                </FormField>

                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="input-base"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </FormField>

                <FormField label="Visibility">
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
                        className="h-4 w-4 rounded"
                      />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.allowPublicRsvp}
                        onChange={(e) => setForm((p) => ({ ...p, allowPublicRsvp: e.target.checked }))}
                        className="h-4 w-4 rounded"
                      />
                      Public RSVP
                    </label>
                  </div>
                </FormField>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isVirtual}
                    onChange={(e) => setForm((p) => ({ ...p, isVirtual: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  Virtual event
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) => setForm((p) => ({ ...p, requiresApproval: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  Requires approval
                </label>

                {form.isVirtual && (
                  <FormField label="Virtual URL" className="md:col-span-2">
                    <input
                      value={form.virtualUrl}
                      onChange={(e) => setForm((p) => ({ ...p, virtualUrl: e.target.value }))}
                      className="input-base"
                      placeholder="https://zoom.us/j/..."
                    />
                  </FormField>
                )}

                <FormField label="Description" className="md:col-span-2">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="input-base min-h-24 resize-y"
                    placeholder="What should attendees know?"
                  />
                </FormField>

                <div className="flex items-end justify-end gap-2 md:col-span-2">
                  <motion.button
                    {...springButton}
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
                    style={{ minHeight: 44 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    {...springButton}
                    type="button"
                    onClick={() => void saveEvent()}
                    disabled={saving}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: GREEN, minHeight: 44 }}
                  >
                    {saving ? "Saving..." : form.id ? "Save changes" : "Create event"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- RSVP modal ---- */}
      <AnimatePresence>
        {rsvpOpen && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => setRsvpOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            >
              <p className="text-lg font-bold" style={{ color: NAVY }}>
                Add RSVP to {selectedEvent.name}
              </p>
              {selectedEvent.capacity && selectedEvent.capacity > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {selectedEvent.totals?.goingCount ?? 0}/{selectedEvent.capacity} spots filled
                  {(selectedEvent.totals?.goingCount ?? 0) >= selectedEvent.capacity &&
                    " — new RSVPs will be waitlisted"}
                </p>
              )}
              <div className="mt-4 space-y-3">
                <FormField label="Name">
                  <input
                    value={rsvpForm.name}
                    onChange={(e) => setRsvpForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-base"
                  />
                </FormField>
                <FormField label="Email">
                  <input
                    type="email"
                    value={rsvpForm.email}
                    onChange={(e) => setRsvpForm((p) => ({ ...p, email: e.target.value }))}
                    className="input-base"
                  />
                </FormField>
                <FormField label="Phone (optional)">
                  <input
                    value={rsvpForm.phone}
                    onChange={(e) => setRsvpForm((p) => ({ ...p, phone: e.target.value }))}
                    className="input-base"
                  />
                </FormField>
                <div className="flex justify-end gap-2 pt-2">
                  <motion.button
                    {...springButton}
                    type="button"
                    onClick={() => setRsvpOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
                    style={{ minHeight: 44 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    {...springButton}
                    type="button"
                    onClick={() => void addRsvp()}
                    disabled={rsvpSaving}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: GREEN, minHeight: 44 }}
                  >
                    {rsvpSaving ? "Saving..." : "Add RSVP"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Bulk Check-in modal ---- */}
      <AnimatePresence>
        {bulkCheckInEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setBulkCheckInEventId(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
                <div>
                  <p className="text-base font-bold" style={{ color: NAVY }}>
                    Bulk Check-in
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{bulkCheckInEvent.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkCheckInEventId(null)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {bulkCheckInEvent.rsvps.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No RSVPs for this event.</p>
                ) : (
                  <div className="space-y-1">
                    {bulkCheckInEvent.rsvps.map((rsvp) => (
                      <label
                        key={rsvp.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checkInStates[rsvp.id] ?? false}
                          onChange={(e) =>
                            setCheckInStates((prev) => ({ ...prev, [rsvp.id]: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{rsvp.name}</p>
                          <p className="text-xs text-gray-500 truncate">{rsvp.email}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            (checkInStates[rsvp.id] ?? false) ? "bg-emerald-100 text-emerald-700" : rsvpBadge(rsvp.status)
                          }`}
                        >
                          {(checkInStates[rsvp.id] ?? false) ? "checked in" : rsvp.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-gray-500">
                  {Object.values(checkInStates).filter(Boolean).length} of {bulkCheckInEvent.rsvps.length} checked in
                </p>
                <div className="flex gap-2">
                  <motion.button
                    {...springButton}
                    type="button"
                    onClick={() => setBulkCheckInEventId(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                    style={{ minHeight: 40 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    {...springButton}
                    type="button"
                    disabled={bulkActionLoading}
                    onClick={() => void saveBulkCheckIn()}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: GREEN, minHeight: 40 }}
                  >
                    {bulkActionLoading ? "Saving..." : "Save Check-ins"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shimmer keyframes (injected once) */}
      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .input-base {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          min-height: 44px;
          outline: none;
        }
        .input-base:focus {
          border-color: ${GREEN};
          box-shadow: 0 0 0 2px ${GREEN}33;
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between text-gray-500">
        <span className="text-sm font-medium">{label}</span>
        <span style={{ color: GREEN }}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  headline,
  description,
  action,
}: {
  icon: ReactNode;
  headline: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      {icon}
      <p className="mt-3 text-sm font-semibold text-gray-700">{headline}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function FormField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium text-gray-600 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ---- Event Detail panel ---- */

function EventDetail({
  ev,
  checkInMode,
  setCheckInMode,
  onEdit,
  onDuplicate,
  onCancel,
  onDelete,
  onOpenDuplicateForm,
  onCheckIn,
  onDownloadIcal,
  onSendReminder,
  onSendFollowUp,
  onOpenRsvp,
  compact,
}: {
  ev: EventRow;
  checkInMode: boolean;
  setCheckInMode: (v: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onOpenDuplicateForm: () => void;
  onCheckIn: (rsvpId: string) => void;
  onDownloadIcal: () => void;
  onSendReminder: () => void;
  onSendFollowUp: () => void;
  onOpenRsvp: () => void;
  compact?: boolean;
}) {
  const type = eventTypeMeta(ev.eventType);
  const goingRsvps = ev.rsvps.filter((r) => r.status === "going" || r.status === "checked_in");
  const waitlistedRsvps = ev.rsvps.filter((r) => r.status === "waitlisted");

  return (
    <div className={`space-y-4 ${compact ? "" : "p-5"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {!compact && (
            <p className="text-lg font-bold" style={{ color: NAVY }}>
              {ev.name}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${type.color}`}>
              {type.icon} {type.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(ev.status)}`}>
              {ev.status}
            </span>
            {ev.isTownhall && ev.townhallStatus === "live" && (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            )}
            {ev.isTownhall && ev.townhallStatus !== "live" && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                Townhall
              </span>
            )}
            {ev.isPublic && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                Public
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{displayDate(ev.eventDate)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <motion.button {...springButton} type="button" onClick={onEdit} className="rounded-lg p-2 hover:bg-gray-100" title="Edit" style={{ minHeight: 44, minWidth: 44 }}>
            <Pencil className="h-4 w-4 text-gray-600" />
          </motion.button>
          <motion.button {...springButton} type="button" onClick={onDuplicate} className="rounded-lg p-2 hover:bg-gray-100" title="Duplicate" style={{ minHeight: 44, minWidth: 44 }}>
            <Copy className="h-4 w-4 text-gray-600" />
          </motion.button>
          <motion.button {...springButton} type="button" onClick={onDownloadIcal} className="rounded-lg p-2 hover:bg-gray-100" title="Export iCal" style={{ minHeight: 44, minWidth: 44 }}>
            <Download className="h-4 w-4 text-gray-600" />
          </motion.button>
        </div>
      </div>

      {/* Location / description */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <p className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4" style={{ color: NAVY }} />
          {ev.location}
        </p>
        {ev.virtualUrl && (
          <p className="mt-2 inline-flex items-center gap-2">
            <Video className="h-4 w-4" style={{ color: NAVY }} />
            <a href={ev.virtualUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: GREEN }}>
              {ev.virtualUrl}
            </a>
          </p>
        )}
        {ev.description && <p className="mt-2 text-gray-600">{ev.description}</p>}
      </div>

      {/* Capacity bar */}
      {ev.capacity && ev.capacity > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{ev.totals?.goingCount ?? 0} / {ev.capacity} attending</span>
            {waitlistedRsvps.length > 0 && (
              <span>{waitlistedRsvps.length} waitlisted</span>
            )}
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((ev.totals?.goingCount ?? 0) / ev.capacity) * 100)}%`,
                backgroundColor: (ev.totals?.goingCount ?? 0) >= ev.capacity ? "#ef4444" : GREEN,
              }}
            />
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        <motion.button {...springButton} type="button" onClick={onSendReminder} className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: NAVY, minHeight: 44 }}>
          <Send className="h-4 w-4" />
          Reminder
        </motion.button>
        <motion.button {...springButton} type="button" onClick={onSendFollowUp} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700" style={{ minHeight: 44 }}>
          <List className="h-4 w-4" />
          Follow-up
        </motion.button>
        {ev.status !== "cancelled" && (
          <motion.button {...springButton} type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600" style={{ minHeight: 44 }}>
            <XCircle className="h-4 w-4" />
            Cancel
          </motion.button>
        )}
        <motion.button {...springButton} type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600" style={{ minHeight: 44 }}>
          <Trash2 className="h-4 w-4" />
          Delete
        </motion.button>
      </div>

      {/* Check-in mode */}
      <div className="rounded-xl border border-gray-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: NAVY }}>
            Check-in mode
          </p>
          <motion.button
            {...springButton}
            type="button"
            onClick={() => setCheckInMode(!checkInMode)}
            className="rounded-lg px-3 py-2 text-xs font-semibold"
            style={
              checkInMode
                ? { backgroundColor: GREEN, color: "#fff", minHeight: 44 }
                : { backgroundColor: "#f3f4f6", color: "#374151", minHeight: 44 }
            }
          >
            {checkInMode ? "Enabled" : "Enable"}
          </motion.button>
        </div>
        {checkInMode && (
          <div className="mt-2 flex gap-2">
            <motion.button
              {...springButton}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
              style={{ minHeight: 44 }}
            >
              <QrCode className="h-4 w-4" />
              QR scanner
            </motion.button>
          </div>
        )}
      </div>

      {/* RSVP / Attendee list */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: NAVY }}>
            Attendees ({ev.rsvps.length})
          </p>
          <motion.button
            {...springButton}
            type="button"
            onClick={onOpenRsvp}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: GREEN, minHeight: 44 }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add RSVP
          </motion.button>
        </div>

        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200">
          {ev.rsvps.length === 0 ? (
            <EmptyState
              icon={<PartyPopper className="h-8 w-8 text-gray-300" />}
              headline="No RSVPs yet"
              description="Add attendees or share the event link."
            />
          ) : (
            ev.rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{rsvp.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {rsvp.email}
                    {rsvp.phone ? ` \u00B7 ${rsvp.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rsvp.attended ? "bg-emerald-100 text-emerald-700" : rsvpBadge(rsvp.status)}`}>
                    {rsvp.attended ? "checked in" : rsvp.status}
                  </span>
                  {checkInMode && !rsvp.attended && rsvp.status !== "not_going" && (
                    <motion.button
                      {...springButton}
                      type="button"
                      onClick={() => onCheckIn(rsvp.id)}
                      className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: GREEN, minHeight: 36 }}
                    >
                      <Check className="h-3 w-3" />
                    </motion.button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
