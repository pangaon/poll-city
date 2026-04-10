"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  addWeeks,
  subWeeks,
  startOfDay,
  parseISO,
  differenceInMinutes,
  isBefore,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Filter,
  List,
  LayoutGrid,
  X,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Bell,
  Columns3,
  AlertCircle,
  ClipboardList,
  Truck,
  Printer,
  Megaphone,
  UserCheck,
  Activity,
  Radio,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Modal,
  Input,
  Select,
  Label,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgendaItem {
  id: string;
  source: "calendar" | "event" | "shift" | "task" | "field_assignment";
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  itemType: string;
  status: string;
  location?: string | null;
  color?: string;
  assigneeCount?: number;
  meta?: Record<string, unknown>;
}

interface DashboardData {
  todayItems: AgendaItem[];
  upcomingEvents: EventItem[];
  shiftsToday: ShiftItem[];
  unfilledShifts: ShiftItem[];
  candidateNext7: AgendaItem[];
  printDeadlines: PrintJobItem[];
  deliveriesDue: DeliveryItem[];
  signInstallsToday: FieldItem[];
  litDropsScheduled: FieldItem[];
  openConflicts: ConflictItem[];
  missedCheckIns: CheckInItem[];
  noShows: NoShowItem[];
  commsToday: CommsItem[];
  pendingApprovals: AgendaItem[];
  overdueTasks: TaskItem[];
}

interface EventItem {
  id: string;
  name: string;
  eventDate: string;
  location: string;
  status: string;
  _count: { rsvps: number };
}

interface ShiftItem {
  id: string;
  name: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  maxVolunteers: number;
  minVolunteers: number;
  _count: { signups: number };
}

interface PrintJobItem {
  id: string;
  title: string;
  productType: string;
  deadline: string;
  status: string;
  quantity: number;
}

interface DeliveryItem {
  id: string;
  description: string;
  scheduledDate: string;
  status: string;
  provider: { name: string; category: string };
}

interface FieldItem {
  id: string;
  name: string;
  assignmentType: string;
  status: string;
  scheduledDate: string;
  assignedUser?: { name: string | null } | null;
  _count?: { stops: number };
}

interface ConflictItem {
  id: string;
  conflictType: string;
  severity: string;
  entityLabel: string | null;
  status: string;
  sourceItem: { title: string; startAt: string };
  conflictingItem: { title: string; startAt: string };
}

interface CheckInItem {
  calendarItem: { title: string; startAt: string; locationName: string | null };
  assignedUser: { name: string | null; phone: string | null } | null;
}

interface NoShowItem {
  shift: { name: string; meetingLocation: string };
  volunteerProfile: { user: { name: string | null; phone: string | null } | null } | null;
}

interface CommsItem {
  id: string;
  subject: string;
  status: string;
  scheduledFor: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: { name: string | null } | null;
}

interface NewItemForm {
  title: string;
  description: string;
  itemType: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  locationName: string;
  virtualUrl: string;
  ward: string;
}

type ViewMode = "month" | "week" | "agenda" | "dashboard";

// ─── Color map ───────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  calendar:        { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-emerald-200", dot: "bg-[#1D9E75]" },
  event:           { bg: "bg-blue-50",     text: "text-blue-800",    border: "border-blue-200",    dot: "bg-[#0A2342]" },
  shift:           { bg: "bg-violet-50",   text: "text-violet-800",  border: "border-violet-200",  dot: "bg-violet-500" },
  task:            { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200",   dot: "bg-[#EF9F27]" },
  field_assignment:{ bg: "bg-red-50",      text: "text-red-800",     border: "border-red-200",     dot: "bg-[#E24B4A]" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  campaign_event:     <CalendarIcon className="h-3 w-3" />,
  candidate_appearance: <UserCheck className="h-3 w-3" />,
  volunteer_shift_item: <Users className="h-3 w-3" />,
  canvassing_run:     <MapPin className="h-3 w-3" />,
  literature_drop_item: <ClipboardList className="h-3 w-3" />,
  sign_install_item:  <Flag className="h-3 w-3" />,
  phone_bank_item:    <Radio className="h-3 w-3" />,
  print_deadline:     <Printer className="h-3 w-3" />,
  vendor_appointment: <Truck className="h-3 w-3" />,
  delivery_window:    <Truck className="h-3 w-3" />,
  email_blast_item:   <Megaphone className="h-3 w-3" />,
  sms_blast_item:     <Megaphone className="h-3 w-3" />,
  internal_deadline:  <Clock className="h-3 w-3" />,
  milestone:          <Flag className="h-3 w-3" />,
  travel_block:       <MapPin className="h-3 w-3" />,
  protected_time:     <Eye className="h-3 w-3" />,
};

function itemColors(source: string) {
  return SOURCE_COLORS[source] ?? SOURCE_COLORS.calendar;
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-gray-200", className)} />
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "blocking") return <Badge variant="danger">Blocking</Badge>;
  if (severity === "warning") return <Badge className="bg-amber-100 text-amber-800">Warning</Badge>;
  return <Badge variant="info">Info</Badge>;
}

// ─── Agenda Row ───────────────────────────────────────────────────────────────

function AgendaRow({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick?: (item: AgendaItem) => void;
}) {
  const colors = itemColors(item.source);
  const icon = TYPE_ICONS[item.itemType] ?? <Activity className="h-3 w-3" />;
  const start = parseISO(item.startAt);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
        colors.bg,
        colors.border
      )}
      onClick={() => onClick?.(item)}
    >
      <div className={cn("mt-0.5 rounded-full p-1", colors.bg)}>
        <span className={colors.text}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("truncate text-sm font-medium", colors.text)}>{item.title}</p>
          {item.assigneeCount != null && item.assigneeCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <Users className="h-3 w-3" />
              {item.assigneeCount}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {!item.allDay && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(start, "h:mm a")}
              {item.endAt && ` – ${format(parseISO(item.endAt), "h:mm a")}`}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1 truncate max-w-[160px]">
              <MapPin className="h-3 w-3 shrink-0" />
              {item.location}
            </span>
          )}
          <span className="text-[10px] py-0 px-1 border border-current rounded capitalize inline-flex items-center">
            {item.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Dashboard Widgets ────────────────────────────────────────────────────────

function WidgetCard({
  title,
  count,
  color,
  icon,
  items,
  emptyText,
  renderItem,
}: {
  title: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  items: unknown[];
  emptyText: string;
  renderItem: (item: unknown, i: number) => React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded", color)}>
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <Badge variant={count > 0 ? "default" : "info"} className="tabular-nums">
          {count}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">{items.slice(0, 5).map(renderItem)}</div>
      )}
    </Card>
  );
}

// ─── Month Calendar Cell ──────────────────────────────────────────────────────

function MonthCell({
  day,
  items,
  currentMonth,
  onDayClick,
  onItemClick,
}: {
  day: Date;
  items: AgendaItem[];
  currentMonth: Date;
  onDayClick: (d: Date) => void;
  onItemClick: (item: AgendaItem) => void;
}) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);

  return (
    <div
      className={cn(
        "min-h-[100px] rounded-lg p-1.5 cursor-pointer transition-colors hover:bg-gray-50 border",
        inMonth ? "bg-white border-gray-100" : "bg-gray-50/50 border-transparent",
        today && "ring-2 ring-[#1D9E75]"
      )}
      onClick={() => onDayClick(day)}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
          today
            ? "bg-[#1D9E75] text-white"
            : inMonth
            ? "text-gray-700"
            : "text-gray-400"
        )}
      >
        {format(day, "d")}
      </span>
      <div className="space-y-0.5">
        {items.slice(0, 3).map((item) => {
          const colors = itemColors(item.source);
          return (
            <div
              key={item.id}
              className={cn(
                "truncate rounded px-1 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80",
                colors.bg,
                colors.text
              )}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item);
              }}
            >
              {!item.allDay && (
                <span className="opacity-60 mr-1">{format(parseISO(item.startAt), "h:mm")}</span>
              )}
              {item.title}
            </div>
          );
        })}
        {items.length > 3 && (
          <p className="text-[10px] text-gray-400 px-1">+{items.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

// ─── Item Detail Panel ───────────────────────────────────────────────────────

function ItemDetailPanel({
  item,
  onClose,
}: {
  item: AgendaItem;
  onClose: () => void;
}) {
  const start = parseISO(item.startAt);
  const colors = itemColors(item.source);
  const meta = item.meta ?? {} as Record<string, unknown>;

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 overflow-y-auto"
    >
      <div className={cn("p-4 border-b", colors.bg)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Badge className={cn("mb-2 text-[10px]", colors.text, colors.border)}>
              {item.source.replace(/_/g, " ")} · {item.itemType.replace(/_/g, " ")}
            </Badge>
            <h2 className={cn("font-semibold leading-tight", colors.text)}>{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 ml-2">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {item.allDay
                ? format(start, "EEE, MMM d, yyyy") + " (all day)"
                : `${format(start, "EEE, MMM d · h:mm a")}${item.endAt ? ` – ${format(parseISO(item.endAt), "h:mm a")}` : ""}`}
            </span>
          </div>
          {item.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{item.location}</span>
            </div>
          )}
          {item.assigneeCount != null && item.assigneeCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4 shrink-0" />
              <span>{item.assigneeCount} assigned</span>
            </div>
          )}
        </div>

        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
          <Badge className="capitalize">{item.status.replace(/_/g, " ")}</Badge>
        </div>

        {/* Source-specific metadata */}
        {item.source === "event" && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">RSVPs</p>
            <p className="text-sm text-gray-700">{String(meta.rsvpCount ?? 0)} registered</p>
            {meta.capacity != null && (
              <p className="text-xs text-gray-500">Capacity: {String(meta.capacity)}</p>
            )}
          </div>
        )}

        {item.source === "shift" && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteers</p>
            <p className="text-sm text-gray-700">{String(meta.signupCount ?? 0)} / {String(meta.maxVolunteers ?? "?")} signed up</p>
          </div>
        )}

        {item.source === "field_assignment" && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</p>
            <p className="text-sm text-gray-700 capitalize">{String(meta.assignmentType ?? "").replace(/_/g, " ")}</p>
            {meta.targetWard != null && <p className="text-xs text-gray-500">Ward: {String(meta.targetWard)}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Quick Create Modal ───────────────────────────────────────────────────────

const ITEM_TYPES = [
  { value: "campaign_event", label: "Campaign Event" },
  { value: "candidate_appearance", label: "Candidate Appearance" },
  { value: "staff_meeting", label: "Staff Meeting" },
  { value: "donor_meeting", label: "Donor Meeting" },
  { value: "debate", label: "Debate" },
  { value: "media_appearance", label: "Media Appearance" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "volunteer_shift_item", label: "Volunteer Shift" },
  { value: "canvassing_run", label: "Canvassing Run" },
  { value: "literature_drop_item", label: "Literature Drop" },
  { value: "sign_install_item", label: "Sign Install" },
  { value: "sign_removal_item", label: "Sign Removal" },
  { value: "phone_bank_item", label: "Phone Bank" },
  { value: "print_deadline", label: "Print Deadline" },
  { value: "vendor_appointment", label: "Vendor Appointment" },
  { value: "delivery_window", label: "Delivery Window" },
  { value: "email_blast_item", label: "Email Blast" },
  { value: "sms_blast_item", label: "SMS Blast" },
  { value: "internal_deadline", label: "Internal Deadline" },
  { value: "milestone", label: "Milestone" },
  { value: "travel_block", label: "Travel Block" },
  { value: "protected_time", label: "Protected Time" },
  { value: "other_item", label: "Other" },
];

function QuickCreateModal({
  open,
  defaultDate,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultDate: Date | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const defaultStart = defaultDate ?? new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [form, setForm] = useState<NewItemForm>({
    title: "",
    description: "",
    itemType: "campaign_event",
    startAt: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
    endAt: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
    allDay: false,
    locationName: "",
    virtualUrl: "",
    ward: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const s = defaultDate ?? new Date();
      const e = new Date(s.getTime() + 60 * 60 * 1000);
      setForm((f) => ({
        ...f,
        startAt: format(s, "yyyy-MM-dd'T'HH:mm"),
        endAt: format(e, "yyyy-MM-dd'T'HH:mm"),
        title: "",
        description: "",
        locationName: "",
        ward: "",
        virtualUrl: "",
      }));
      setErr(null);
    }
  }, [open, defaultDate]);

  async function handleCreate() {
    if (!form.title.trim()) return setErr("Title is required");
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/campaign-calendar/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          itemType: form.itemType,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          allDay: form.allDay,
          locationName: form.locationName.trim() || undefined,
          ward: form.ward.trim() || undefined,
          virtualUrl: form.virtualUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create item");
      }
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to Calendar" size="md">
      <div className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="What's happening?"
            autoFocus
          />
        </div>

        <div>
          <Label>Type</Label>
          <Select
            value={form.itemType}
            onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value }))}
          >
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allDay"
            checked={form.allDay}
            onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="allDay" className="!mb-0">All day</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start</Label>
            <Input
              type={form.allDay ? "date" : "datetime-local"}
              value={form.allDay ? form.startAt.split("T")[0] : form.startAt}
              onChange={(e) => setForm((f) => ({
                ...f,
                startAt: form.allDay ? e.target.value + "T00:00" : e.target.value,
              }))}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type={form.allDay ? "date" : "datetime-local"}
              value={form.allDay ? form.endAt.split("T")[0] : form.endAt}
              onChange={(e) => setForm((f) => ({
                ...f,
                endAt: form.allDay ? e.target.value + "T23:59" : e.target.value,
              }))}
            />
          </div>
        </div>

        <div>
          <Label>Location</Label>
          <Input
            value={form.locationName}
            onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
            placeholder="Meeting location"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ward</Label>
            <Input
              value={form.ward}
              onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
              placeholder="Ward 5"
            />
          </div>
          <div>
            <Label>Virtual URL</Label>
            <Input
              value={form.virtualUrl}
              onChange={(e) => setForm((f) => ({ ...f, virtualUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description…"
            rows={2}
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add to Calendar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CalendarClient({ campaignId }: { campaignId: string }) {
  void campaignId; // used server-side; client uses session's activeCampaignId

  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, AgendaItem[]>>({});
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [detailItem, setDetailItem] = useState<AgendaItem | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [filterSource, setFilterSource] = useState<Set<string>>(
    new Set(["calendar", "event", "shift", "task", "field_assignment"])
  );

  // ─── Date range for current view ───────────────────────────────────────

  const { viewStart, viewEnd, days } = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      return { viewStart: s, viewEnd: endOfWeek(currentDate, { weekStartsOn: 0 }), days: 7 };
    }
    if (view === "month") {
      const s = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const e = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      const d = Math.ceil(differenceInMinutes(e, s) / (60 * 24));
      return { viewStart: s, viewEnd: e, days: d };
    }
    // agenda: 30 days
    return { viewStart: currentDate, viewEnd: addDays(currentDate, 30), days: 30 };
  }, [view, currentDate]);

  // ─── Fetch agenda ───────────────────────────────────────────────────────

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: format(viewStart, "yyyy-MM-dd"),
        days: String(days),
      });
      const res = await fetch(`/api/campaign-calendar/agenda?${params}`);
      if (!res.ok) throw new Error("Failed to load agenda");
      const d = await res.json();
      setAgendaItems(d.data ?? []);
      setGroupedItems(d.grouped ?? {});
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, [viewStart, days]);

  // ─── Fetch dashboard ────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    if (view !== "dashboard") return;
    setDashLoading(true);
    try {
      const res = await fetch("/api/campaign-calendar/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const d = await res.json();
      setDashboard(d.data ?? null);
    } catch {
      // silent
    } finally {
      setDashLoading(false);
    }
  }, [view]);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  function navigate(dir: -1 | 1) {
    if (view === "month") setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, dir * 14));
  }

  function navigateToday() {
    setCurrentDate(new Date());
  }

  // ─── Month grid days ────────────────────────────────────────────────────

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const s = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const e = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: s, end: e });
  }, [view, currentDate]);

  // ─── Filter items for a specific day ────────────────────────────────────

  function itemsForDay(day: Date): AgendaItem[] {
    const key = format(day, "yyyy-MM-dd");
    const dayItems = groupedItems[key] ?? [];
    return dayItems.filter((i) => filterSource.has(i.source));
  }

  // ─── Filtered agenda items ───────────────────────────────────────────────

  const filteredItems = useMemo(
    () => agendaItems.filter((i) => filterSource.has(i.source)),
    [agendaItems, filterSource]
  );

  // ─── Week days ───────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    });
  }, [view, currentDate]);

  // ─── Date header label ───────────────────────────────────────────────────

  function headerLabel() {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    return `${format(viewStart, "MMM d")} – ${format(viewEnd, "MMM d, yyyy")}`;
  }

  // ─── Open conflicts count ────────────────────────────────────────────────

  const conflictCount = dashboard?.openConflicts?.length ?? 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#1D9E75]" />
          <h1 className="text-lg font-semibold text-gray-900">Campaign Calendar</h1>
          {conflictCount > 0 && (
            <button
              onClick={() => setShowConflicts(true)}
              className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              <AlertTriangle className="h-3 w-3" />
              {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border bg-gray-50 p-0.5">
            {(["month", "week", "agenda", "dashboard"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium capitalize transition-colors",
                  view === v
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {v === "agenda" ? "List" : v === "dashboard" ? "Command" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => { setCreateDate(null); setShowCreate(true); }}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Navigation row (only for calendar views) */}
      {view !== "dashboard" && (
        <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="rounded p-1 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="rounded p-1 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={navigateToday}
              className="rounded border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <h2 className="text-sm font-medium text-gray-700">{headerLabel()}</h2>
          </div>

          {/* Source filters */}
          <div className="flex items-center gap-1">
            {Object.entries(SOURCE_COLORS).map(([src, c]) => (
              <button
                key={src}
                onClick={() =>
                  setFilterSource((prev) => {
                    const next = new Set(prev);
                    if (next.has(src)) next.delete(src);
                    else next.add(src);
                    return next;
                  })
                }
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize transition-all",
                  filterSource.has(src)
                    ? cn(c.bg, c.text, c.border)
                    : "border-gray-200 bg-gray-50 text-gray-400"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", filterSource.has(src) ? c.dot : "bg-gray-300")} />
                {src.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {/* Month view */}
        {view === "month" && (
          <div className="p-3">
            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-medium uppercase text-gray-400">
                  {d}
                </div>
              ))}
            </div>
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Shimmer key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => (
                  <MonthCell
                    key={day.toISOString()}
                    day={day}
                    items={itemsForDay(day)}
                    currentMonth={currentDate}
                    onDayClick={(d) => {
                      setCurrentDate(d);
                      setView("agenda");
                    }}
                    onItemClick={(item) => setDetailItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Week view */}
        {view === "week" && (
          <div className="p-3">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const items = itemsForDay(day);
                const today = isToday(day);
                return (
                  <div key={day.toISOString()} className="min-h-[400px]">
                    <div className={cn(
                      "mb-2 rounded-lg px-2 py-1.5 text-center text-xs",
                      today ? "bg-[#1D9E75] text-white" : "bg-gray-50 text-gray-600"
                    )}>
                      <div className="font-medium">{format(day, "EEE")}</div>
                      <div className={cn("text-lg font-bold", today ? "text-white" : "text-gray-900")}>
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {loading
                        ? Array.from({ length: 2 }).map((_, i) => <Shimmer key={i} className="h-12" />)
                        : items.length === 0
                        ? <p className="text-[10px] text-gray-300 text-center py-2">—</p>
                        : items.map((item) => {
                          const c = itemColors(item.source);
                          return (
                            <div
                              key={item.id}
                              className={cn("rounded p-1.5 cursor-pointer hover:opacity-90 transition-opacity", c.bg, c.border, "border")}
                              onClick={() => setDetailItem(item)}
                            >
                              <p className={cn("text-[10px] font-medium truncate", c.text)}>{item.title}</p>
                              {!item.allDay && (
                                <p className="text-[9px] text-gray-400">
                                  {format(parseISO(item.startAt), "h:mm a")}
                                </p>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agenda / List view */}
        {view === "agenda" && (
          <div className="mx-auto max-w-3xl p-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-16" />)}
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="h-8 w-8" />}
                title="Nothing scheduled"
                description="No items in this date range. Add something to get started."
                action={
                  <Button size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Item
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Group by date */}
                {Object.entries(
                  filteredItems.reduce<Record<string, AgendaItem[]>>((acc, item) => {
                    const key = item.startAt.split("T")[0];
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, dayItems]) => {
                    const d = parseISO(dateKey);
                    return (
                      <div key={dateKey}>
                        <div className="mb-2 flex items-center gap-2">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                            isToday(d) ? "bg-[#1D9E75] text-white" : "bg-gray-100 text-gray-600"
                          )}>
                            {format(d, "d")}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{format(d, "EEEE")}</p>
                            <p className="text-xs text-gray-400">{format(d, "MMMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="ml-10 space-y-2">
                          {dayItems.map((item) => (
                            <AgendaRow
                              key={item.id}
                              item={item}
                              onClick={setDetailItem}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Dashboard / Command view */}
        {view === "dashboard" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Campaign Command Centre</h2>
              <p className="text-xs text-gray-500">Real-time operational status across all campaign streams</p>
            </div>

            {dashLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => <Shimmer key={i} className="h-40" />)}
              </div>
            ) : !dashboard ? (
              <p className="text-sm text-gray-500">Failed to load dashboard</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* Today's schedule */}
                <WidgetCard
                  title="Today's Schedule"
                  count={dashboard.todayItems.length}
                  color="bg-[#1D9E75]/10"
                  icon={<CalendarIcon className="h-3.5 w-3.5 text-[#1D9E75]" />}
                  items={dashboard.todayItems}
                  emptyText="Nothing scheduled today."
                  renderItem={(item, i) => {
                    const it = item as AgendaItem;
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="mt-0.5 text-[#1D9E75]">
                          {TYPE_ICONS[it.itemType] ?? <Clock className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800">{it.title}</p>
                          {!it.allDay && (
                            <p className="text-gray-400">{format(parseISO(it.startAt), "h:mm a")}</p>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Upcoming events */}
                <WidgetCard
                  title="Upcoming Events"
                  count={dashboard.upcomingEvents.length}
                  color="bg-blue-50"
                  icon={<CalendarIcon className="h-3.5 w-3.5 text-blue-600" />}
                  items={dashboard.upcomingEvents}
                  emptyText="No events in the next 7 days."
                  renderItem={(item, i) => {
                    const ev = item as EventItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{ev.name}</p>
                        <p className="text-gray-400">
                          {format(parseISO(ev.eventDate), "EEE MMM d · h:mm a")} · {ev._count.rsvps} RSVPs
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Volunteer shifts */}
                <WidgetCard
                  title="Shifts Today"
                  count={dashboard.shiftsToday.length}
                  color="bg-violet-50"
                  icon={<Users className="h-3.5 w-3.5 text-violet-600" />}
                  items={dashboard.shiftsToday}
                  emptyText="No shifts today."
                  renderItem={(item, i) => {
                    const sh = item as ShiftItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{sh.name}</p>
                        <p className="text-gray-400">
                          {sh.startTime}–{sh.endTime} · {sh._count.signups}/{sh.maxVolunteers} volunteers
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Unfilled shifts */}
                <WidgetCard
                  title="Unfilled Shifts"
                  count={dashboard.unfilledShifts.length}
                  color={dashboard.unfilledShifts.length > 0 ? "bg-amber-50" : "bg-gray-50"}
                  icon={<AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                  items={dashboard.unfilledShifts}
                  emptyText="All shifts are filled."
                  renderItem={(item, i) => {
                    const sh = item as ShiftItem;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <p className="truncate font-medium text-gray-800">{sh.name}</p>
                        <span className="text-amber-600 font-medium whitespace-nowrap ml-2">
                          {sh._count.signups}/{sh.minVolunteers} needed
                        </span>
                      </div>
                    );
                  }}
                />

                {/* Open conflicts */}
                <WidgetCard
                  title="Schedule Conflicts"
                  count={dashboard.openConflicts.length}
                  color={dashboard.openConflicts.length > 0 ? "bg-red-50" : "bg-gray-50"}
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                  items={dashboard.openConflicts}
                  emptyText="No open conflicts."
                  renderItem={(item, i) => {
                    const c = item as ConflictItem;
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-1 mb-0.5">
                          <SeverityBadge severity={c.severity} />
                          <span className="text-gray-500 capitalize">{c.conflictType.replace(/_/g, " ")}</span>
                        </div>
                        <p className="truncate text-gray-700">{c.sourceItem?.title}</p>
                      </div>
                    );
                  }}
                />

                {/* Print deadlines */}
                <WidgetCard
                  title="Print Deadlines"
                  count={dashboard.printDeadlines.length}
                  color="bg-orange-50"
                  icon={<Printer className="h-3.5 w-3.5 text-orange-600" />}
                  items={dashboard.printDeadlines}
                  emptyText="No print deadlines this week."
                  renderItem={(item, i) => {
                    const pj = item as PrintJobItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{pj.title}</p>
                        <p className="text-gray-400">
                          {format(parseISO(pj.deadline), "EEE MMM d")} · {pj.quantity.toLocaleString()} units
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Vendor deliveries */}
                <WidgetCard
                  title="Deliveries Due"
                  count={dashboard.deliveriesDue.length}
                  color="bg-teal-50"
                  icon={<Truck className="h-3.5 w-3.5 text-teal-600" />}
                  items={dashboard.deliveriesDue}
                  emptyText="No deliveries in next 48h."
                  renderItem={(item, i) => {
                    const d = item as DeliveryItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{d.provider?.name}</p>
                        <p className="text-gray-400">
                          {format(parseISO(d.scheduledDate), "EEE h:mm a")} · {d.status}
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Sign installs */}
                <WidgetCard
                  title="Sign Installs Today"
                  count={dashboard.signInstallsToday.length}
                  color="bg-red-50"
                  icon={<Flag className="h-3.5 w-3.5 text-red-600" />}
                  items={dashboard.signInstallsToday}
                  emptyText="No sign installs today."
                  renderItem={(item, i) => {
                    const fa = item as FieldItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{fa.name}</p>
                        <p className="text-gray-400">
                          {fa.assignedUser?.name ?? "Unassigned"} · {fa._count?.stops ?? 0} stops
                        </p>
                      </div>
                    );
                  }}
                />

                {/* Communications */}
                <WidgetCard
                  title="Comms Today"
                  count={dashboard.commsToday.length}
                  color="bg-indigo-50"
                  icon={<Megaphone className="h-3.5 w-3.5 text-indigo-600" />}
                  items={dashboard.commsToday}
                  emptyText="No communications scheduled today."
                  renderItem={(item, i) => {
                    const cm = item as CommsItem;
                    return (
                      <div key={i} className="text-xs">
                        <p className="truncate font-medium text-gray-800">{cm.subject}</p>
                        <p className="text-gray-400 capitalize">{cm.status}</p>
                      </div>
                    );
                  }}
                />

                {/* Missed check-ins */}
                {dashboard.missedCheckIns.length > 0 && (
                  <WidgetCard
                    title="Missed Check-ins"
                    count={dashboard.missedCheckIns.length}
                    color="bg-red-50"
                    icon={<Bell className="h-3.5 w-3.5 text-red-600" />}
                    items={dashboard.missedCheckIns}
                    emptyText=""
                    renderItem={(item, i) => {
                      const ci = item as CheckInItem;
                      return (
                        <div key={i} className="text-xs">
                          <p className="truncate font-medium text-gray-800">{ci.calendarItem?.title}</p>
                          <p className="text-gray-400">{ci.assignedUser?.name ?? "Unknown"}</p>
                        </div>
                      );
                    }}
                  />
                )}

                {/* No-shows */}
                {dashboard.noShows.length > 0 && (
                  <WidgetCard
                    title="No-shows"
                    count={dashboard.noShows.length}
                    color="bg-red-50"
                    icon={<AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                    items={dashboard.noShows}
                    emptyText=""
                    renderItem={(item, i) => {
                      const ns = item as NoShowItem;
                      return (
                        <div key={i} className="text-xs">
                          <p className="truncate font-medium text-gray-800">
                            {ns.volunteerProfile?.user?.name ?? "Unknown"}
                          </p>
                          <p className="text-gray-400">{ns.shift?.name}</p>
                        </div>
                      );
                    }}
                  />
                )}

                {/* Overdue tasks */}
                {dashboard.overdueTasks.length > 0 && (
                  <WidgetCard
                    title="Overdue Tasks"
                    count={dashboard.overdueTasks.length}
                    color="bg-amber-50"
                    icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                    items={dashboard.overdueTasks}
                    emptyText=""
                    renderItem={(item, i) => {
                      const t = item as TaskItem;
                      return (
                        <div key={i} className="text-xs">
                          <p className="truncate font-medium text-gray-800">{t.title}</p>
                          <p className="text-gray-400 capitalize">
                            {t.priority} · due {t.dueDate ? format(parseISO(t.dueDate), "MMM d") : "?"}
                          </p>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item detail panel */}
      <AnimatePresence>
        {detailItem && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setDetailItem(null)}
            />
            <ItemDetailPanel item={detailItem} onClose={() => setDetailItem(null)} />
          </>
        )}
      </AnimatePresence>

      {/* Quick create modal */}
      <QuickCreateModal
        open={showCreate}
        defaultDate={createDate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { fetchAgenda(); fetchDashboard(); }}
      />
    </div>
  );
}
