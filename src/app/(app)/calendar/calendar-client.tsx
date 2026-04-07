"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  addWeeks,
  subWeeks,
  startOfDay,
  isBefore,
  differenceInCalendarDays,
  parseISO,
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
  Columns,
  X,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  name: string;
  eventDate: string;
  location: string | null;
  eventType: string | null;
  capacity: number | null;
  description: string | null;
  status: string;
  totals?: { rsvpCount: number; goingCount: number; checkInCount: number };
}

interface VolunteerShift {
  id: string;
  name: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  maxVolunteers: number;
  signups: unknown[];
}

interface TaskItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  assignedTo: { id: string; name: string | null } | null;
}

type CalendarItemType = "event" | "shift" | "task" | "milestone";

interface CalendarItem {
  id: string;
  title: string;
  date: Date;
  endTime?: string;
  type: CalendarItemType;
  eventType?: string | null;
  location?: string | null;
  attendees?: number;
  capacity?: number;
  status?: string;
  description?: string | null;
  raw?: CalendarEvent | VolunteerShift | TaskItem;
}

type ViewMode = "month" | "week" | "agenda";

// ─── Constants ──────────────────────────────────────────────────────────────

const ELECTION_DATE = new Date(2026, 9, 26); // Oct 26 2026
const NOMINATION_DEADLINE = new Date(2026, 7, 21, 14, 0); // Aug 21 2026 2pm

const MILESTONES: CalendarItem[] = [
  {
    id: "ms-nom-open",
    title: "Nominations Open",
    date: new Date(2026, 4, 1),
    type: "milestone",
  },
  {
    id: "ms-nom-close",
    title: "Nominations Close (2pm)",
    date: NOMINATION_DEADLINE,
    type: "milestone",
  },
  {
    id: "ms-advance",
    title: "Advance Voting Begins",
    date: new Date(2026, 9, 16),
    type: "milestone",
  },
  {
    id: "ms-election",
    title: "Election Day",
    date: ELECTION_DATE,
    type: "milestone",
  },
];

const EVENT_TYPES = [
  "canvass",
  "fundraiser",
  "training",
  "gotv",
  "rally",
  "phone_bank",
  "debate",
  "town_hall",
  "sign_install",
  "office_hours",
  "volunteer_social",
  "other",
] as const;

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  canvass: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-[#0A2342]" },
  fundraiser: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-[#1D9E75]" },
  training: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-[#EF9F27]" },
  gotv: { bg: "bg-red-100", text: "text-red-700", dot: "bg-[#E24B4A]" },
  rally: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  phone_bank: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  debate: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  town_hall: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
  sign_install: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  office_hours: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  volunteer_social: { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  other: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  shift: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  task: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  milestone: { bg: "bg-red-50", text: "text-red-800", dot: "bg-[#E24B4A]" },
};

function getItemColor(item: CalendarItem) {
  if (item.type === "milestone") return TYPE_COLORS.milestone;
  if (item.type === "shift") return TYPE_COLORS.shift;
  if (item.type === "task") return TYPE_COLORS.task;
  return TYPE_COLORS[item.eventType ?? "other"] ?? TYPE_COLORS.other;
}

// ─── Shimmer ────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-20 flex-1 rounded-xl" />
        ))}
      </div>
      <Shimmer className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Shimmer key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CalendarClient({ campaignId }: { campaignId: string }) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);

  // Filters
  const [filterTypes, setFilterTypes] = useState<Set<CalendarItemType>>(
    new Set<CalendarItemType>(["event", "shift", "task", "milestone"])
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showPast, setShowPast] = useState(true);

  // ─── Data fetching ─────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, shRes, tkRes] = await Promise.all([
        fetch(`/api/events?campaignId=${campaignId}&includePast=true`),
        fetch(`/api/volunteers/shifts?campaignId=${campaignId}`),
        fetch(`/api/tasks?campaignId=${campaignId}&pageSize=500`),
      ]);

      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.data ?? []);
      }
      if (shRes.ok) {
        const d = await shRes.json();
        setShifts(d.data ?? []);
      }
      if (tkRes.ok) {
        const d = await tkRes.json();
        setTasks(d.data ?? d.items ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Unified items ────────────────────────────────────────────────────

  const allItems = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];

    for (const ev of events) {
      items.push({
        id: ev.id,
        title: ev.name,
        date: parseISO(ev.eventDate),
        type: "event",
        eventType: ev.eventType,
        location: ev.location,
        attendees: ev.totals?.goingCount,
        capacity: ev.capacity ?? undefined,
        status: ev.status,
        description: ev.description,
        raw: ev,
      });
    }

    for (const sh of shifts) {
      items.push({
        id: sh.id,
        title: sh.name,
        date: parseISO(sh.shiftDate),
        endTime: sh.endTime,
        type: "shift",
        location: sh.meetingLocation,
        attendees: sh.signups.length,
        capacity: sh.maxVolunteers,
        raw: sh,
      });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      items.push({
        id: t.id,
        title: t.title,
        date: parseISO(t.dueDate),
        type: "task",
        status: t.status,
        raw: t,
      });
    }

    items.push(...MILESTONES);

    return items;
  }, [events, shifts, tasks]);

  const filteredItems = useMemo(() => {
    const now = startOfDay(new Date());
    return allItems.filter((item) => {
      if (!filterTypes.has(item.type)) return false;
      if (!showPast && isBefore(item.date, now) && !isToday(item.date)) return false;
      return true;
    });
  }, [allItems, filterTypes, showPast]);

  const itemsForDay = useCallback(
    (day: Date) => filteredItems.filter((i) => isSameDay(i.date, day)),
    [filteredItems]
  );

  // ─── Election countdown ────────────────────────────────────────────────

  const daysToElection = differenceInCalendarDays(ELECTION_DATE, new Date());

  // ─── Navigation ────────────────────────────────────────────────────────

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };
  const goPrev = () =>
    setCurrentDate((d) => (view === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  const goNext = () =>
    setCurrentDate((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));

  // ─── Create event handler ──────────────────────────────────────────────

  const handleCreateEvent = async (data: {
    name: string;
    eventDate: string;
    location: string;
    eventType: string;
    capacity: string;
    description: string;
  }) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name: data.name,
        eventDate: data.eventDate,
        location: data.location,
        eventType: data.eventType,
        capacity: data.capacity ? Number(data.capacity) : null,
        description: data.description || null,
        status: "scheduled",
      }),
    });
    if (res.ok) {
      setShowCreateModal(false);
      setCreateDate(null);
      fetchData();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <CountdownBar days={daysToElection} />
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Election countdown */}
      <CountdownBar days={daysToElection} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <ToolbarBtn
            active={view === "month"}
            onClick={() => setView("month")}
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Month"
          />
          <ToolbarBtn
            active={view === "week"}
            onClick={() => setView("week")}
            icon={<Columns className="w-4 h-4" />}
            label="Week"
          />
          <ToolbarBtn
            active={view === "agenda"}
            onClick={() => setView("agenda")}
            icon={<List className="w-4 h-4" />}
            label="Agenda"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 ml-2">
          {view === "week"
            ? `${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
            : format(currentDate, "MMMM yyyy")}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateDate(selectedDay ?? new Date());
              setShowCreateModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Show:</span>
                {(
                  [
                    ["event", "Events"],
                    ["shift", "Shifts"],
                    ["task", "Tasks"],
                    ["milestone", "Milestones"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setFilterTypes((prev) => {
                        const next = new Set<CalendarItemType>(prev);
                        next.has(key) ? next.delete(key) : next.add(key);
                        return next;
                      })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
                      filterTypes.has(key)
                        ? "bg-[#0A2342] text-white"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <label className="flex items-center gap-2 text-sm text-gray-600 ml-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPast}
                    onChange={(e) => setShowPast(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  Show past items
                </label>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              selectedDay={selectedDay}
              itemsForDay={itemsForDay}
              onSelectDay={setSelectedDay}
              onClickItem={setDetailItem}
              onCreateOnDay={(d) => {
                setCreateDate(d);
                setShowCreateModal(true);
              }}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              itemsForDay={itemsForDay}
              onClickItem={setDetailItem}
              onCreateOnDay={(d) => {
                setCreateDate(d);
                setShowCreateModal(true);
              }}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              items={filteredItems}
              onClickItem={setDetailItem}
            />
          )}
        </div>

        {/* Sidebar (desktop) */}
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
          <SidebarPanel
            selectedDay={selectedDay}
            itemsForDay={itemsForDay}
            filteredItems={filteredItems}
            onClickItem={setDetailItem}
          />
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateEventModal
          defaultDate={createDate}
          onClose={() => {
            setShowCreateModal(false);
            setCreateDate(null);
          }}
          onSubmit={handleCreateEvent}
        />
      )}

      {/* Detail modal */}
      {detailItem && (
        <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

// ─── Countdown Bar ──────────────────────────────────────────────────────────

function CountdownBar({ days }: { days: number }) {
  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-[#0A2342] text-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-3">
        <Flag className="w-5 h-5 text-[#EF9F27]" />
        <span className="font-semibold">
          {days > 0 ? `${days} days to Election Day` : days === 0 ? "Election Day!" : "Election has passed"}
        </span>
        <span className="text-white/70 text-sm">Oct 26, 2026</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/70">
        <span>Nominations: May 1 - Aug 21</span>
        <span>Advance Voting: Oct 16</span>
      </div>
    </motion.div>
  );
}

// ─── Toolbar Button ─────────────────────────────────────────────────────────

function ToolbarBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]",
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── Month View ─────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  selectedDay,
  itemsForDay,
  onSelectDay,
  onClickItem,
  onCreateOnDay,
}: {
  currentDate: Date;
  selectedDay: Date | null;
  itemsForDay: (day: Date) => CalendarItem[];
  onSelectDay: (d: Date) => void;
  onClickItem: (item: CalendarItem) => void;
  onCreateOnDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });

  return (
    <Card className="overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = itemsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const today = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => onSelectDay(day)}
              className={cn(
                "min-h-[100px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors group",
                !inMonth && "bg-gray-50/50",
                selected && "bg-blue-50 ring-1 ring-inset ring-blue-200",
                today && !selected && "bg-amber-50/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-[#0A2342] text-white",
                    !today && !inMonth && "text-gray-300",
                    !today && inMonth && "text-gray-700"
                  )}
                >
                  {format(day, "d")}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateOnDay(day);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-opacity min-h-[44px] min-w-[44px] -m-2"
                  aria-label="Create event"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => {
                  const color = getItemColor(item);
                  return (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickItem(item);
                      }}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight font-medium truncate min-h-[22px]",
                        color.bg,
                        color.text
                      )}
                    >
                      {item.title}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-gray-400 pl-1">
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Week View ──────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END = 22;

function WeekView({
  currentDate,
  itemsForDay,
  onClickItem,
  onCreateOnDay,
}: {
  currentDate: Date;
  itemsForDay: (day: Date) => CalendarItem[];
  onClickItem: (item: CalendarItem) => void;
  onCreateOnDay: (d: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate),
  });

  const nowHour = new Date().getHours();
  const nowMinute = new Date().getMinutes();
  const todayInWeek = days.findIndex((d) => isToday(d));

  return (
    <Card className="overflow-auto max-h-[calc(100vh-280px)]">
      {/* Column headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="border-r border-gray-100" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "px-2 py-2 text-center border-r border-gray-100",
              isToday(day) && "bg-blue-50"
            )}
          >
            <div className="text-xs text-gray-500">{format(day, "EEE")}</div>
            <div
              className={cn(
                "text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto",
                isToday(day) && "bg-[#0A2342] text-white"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
        {/* Current time indicator */}
        {todayInWeek >= 0 &&
          nowHour >= HOUR_START &&
          nowHour < HOUR_END && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{
                top: `${((nowHour - HOUR_START) * 60 + nowMinute) * (48 / 60)}px`,
              }}
            >
              <div
                className="h-0.5 bg-[#E24B4A]"
                style={{
                  marginLeft: `calc(60px + ${todayInWeek} * (100% - 60px) / 7)`,
                  width: `calc((100% - 60px) / 7)`,
                }}
              />
            </div>
          )}

        {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => {
          const hour = HOUR_START + i;
          return (
            <React.Fragment key={hour}>
              <div className="h-12 border-r border-b border-gray-100 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-gray-400">
                  {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </span>
              </div>
              {days.map((day) => {
                const dayItems = itemsForDay(day);
                const hourItems = dayItems.filter((item) => {
                  const h = item.date.getHours();
                  return h === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "h-12 border-r border-b border-gray-100 relative group cursor-pointer",
                      isToday(day) && "bg-blue-50/30"
                    )}
                    onClick={() => onCreateOnDay(day)}
                  >
                    {hourItems.map((item) => {
                      const color = getItemColor(item);
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={{ scale: 1.03 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClickItem(item);
                          }}
                          className={cn(
                            "absolute inset-x-0.5 top-0.5 bottom-0.5 rounded px-1 text-[10px] font-medium truncate text-left min-h-[44px] -mb-8",
                            color.bg,
                            color.text
                          )}
                        >
                          {item.title}
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Agenda View ────────────────────────────────────────────────────────────

function AgendaView({
  items,
  onClickItem,
}: {
  items: CalendarItem[];
  onClickItem: (item: CalendarItem) => void;
}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [items]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of sorted) {
      const key = format(item.date, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [sorted]);

  if (grouped.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<CalendarIcon className="w-12 h-12" />}
          title="No items to show"
          description="Create events, shifts, or tasks to see them here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, dayItems]) => {
        const date = parseISO(dateKey);
        const past = isBefore(date, startOfDay(new Date())) && !isToday(date);

        return (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "text-sm font-semibold",
                  isToday(date) ? "text-[#0A2342]" : past ? "text-gray-400" : "text-gray-700"
                )}
              >
                {isToday(date) ? "Today" : format(date, "EEEE, MMM d, yyyy")}
              </div>
              {isToday(date) && (
                <Badge variant="info">Today</Badge>
              )}
            </div>
            <Card>
              <div className="divide-y divide-gray-100">
                {dayItems.map((item) => {
                  const color = getItemColor(item);
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={() => onClickItem(item)}
                      className={cn(
                        "w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors min-h-[44px]",
                        past && "opacity-50"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                              color.bg,
                              color.text
                            )}
                          >
                            {item.type === "event"
                              ? item.eventType ?? "event"
                              : item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(item.date, "h:mm a")}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                          )}
                          {item.attendees !== undefined && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.attendees}
                              {item.capacity ? `/${item.capacity}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Sidebar Panel ──────────────────────────────────────────────────────────

function SidebarPanel({
  selectedDay,
  itemsForDay,
  filteredItems,
  onClickItem,
}: {
  selectedDay: Date | null;
  itemsForDay: (day: Date) => CalendarItem[];
  filteredItems: CalendarItem[];
  onClickItem: (item: CalendarItem) => void;
}) {
  const day = selectedDay ?? new Date();
  const dayItems = itemsForDay(day);

  // Quick stats
  const now = new Date();
  const weekEnd = endOfWeek(now);
  const eventsThisWeek = filteredItems.filter(
    (i) => i.type === "event" && i.date >= startOfWeek(now) && i.date <= weekEnd
  ).length;
  const shiftsToFill = filteredItems.filter(
    (i) =>
      i.type === "shift" &&
      i.date >= now &&
      i.attendees !== undefined &&
      i.capacity !== undefined &&
      i.attendees < i.capacity
  ).length;
  const overdueTasks = filteredItems.filter(
    (i) => i.type === "task" && isBefore(i.date, startOfDay(now)) && i.status !== "done"
  ).length;

  return (
    <>
      {/* Selected day detail */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            {isToday(day) ? "Today" : format(day, "EEEE, MMM d")}
          </h3>
        </div>
        <div className="p-3">
          {dayItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No items this day</p>
          ) : (
            <div className="space-y-2">
              {dayItems.map((item) => {
                const color = getItemColor(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => onClickItem(item)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(item.date, "h:mm a")}
                        {item.location ? ` - ${item.location}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Quick stats */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">This Week</h3>
        <div className="space-y-2">
          <StatRow
            icon={<CalendarIcon className="w-4 h-4 text-blue-500" />}
            label="Events"
            value={eventsThisWeek}
          />
          <StatRow
            icon={<Users className="w-4 h-4 text-violet-500" />}
            label="Shifts to fill"
            value={shiftsToFill}
            warn={shiftsToFill > 0}
          />
          <StatRow
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            label="Overdue tasks"
            value={overdueTasks}
            warn={overdueTasks > 0}
          />
        </div>
      </Card>

      {/* Adoni button */}
      <Button variant="outline" className="w-full gap-2">
        <Sparkles className="w-4 h-4 text-[#EF9F27]" />
        Ask Adoni about this week
      </Button>
    </>
  );
}

function StatRow({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          warn ? "text-[#E24B4A]" : "text-gray-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Create Event Modal ─────────────────────────────────────────────────────

function CreateEventModal({
  defaultDate,
  onClose,
  onSubmit,
}: {
  defaultDate: Date | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    eventDate: string;
    location: string;
    eventType: string;
    capacity: string;
    description: string;
  }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(
    defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("canvass");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !eventDate || !location.trim()) return;
    setSubmitting(true);
    await onSubmit({ name, eventDate, location, eventType, capacity, description });
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title="Create Event" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label required>Title</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Door Knocking — Ward 12"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Date & Time</Label>
            <Input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <Label required>Type</Label>
            <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!name || !eventDate || !location}>
            Create Event
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Item Detail Modal ──────────────────────────────────────────────────────

function ItemDetailModal({
  item,
  onClose,
}: {
  item: CalendarItem;
  onClose: () => void;
}) {
  const color = getItemColor(item);

  return (
    <Modal open onClose={onClose} title={item.title} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-1 rounded text-xs font-medium", color.bg, color.text)}>
            {item.type === "event" ? item.eventType ?? "Event" : item.type}
          </span>
          {item.status && (
            <Badge
              variant={
                item.status === "done" || item.status === "completed"
                  ? "success"
                  : item.status === "cancelled"
                    ? "danger"
                    : "default"
              }
            >
              {item.status}
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{format(item.date, "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
          </div>
          {item.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{item.location}</span>
            </div>
          )}
          {item.attendees !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>
                {item.attendees} attendees{item.capacity ? ` / ${item.capacity} capacity` : ""}
              </span>
            </div>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
            {item.description}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
