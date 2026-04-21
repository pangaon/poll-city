"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, Plus, Users, ChevronLeft, ChevronRight,
  CheckCircle2, UserPlus, List, Bell, X,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label,
  Textarea, Badge, EmptyState, PageHeader, Modal, Select, FieldHelp,
} from "@/components/ui";
import { toast } from "sonner";

/* ─── types ─────────────────────────────────────────────────────────── */
interface ShiftSignup {
  id: string;
  status: string;
  checkedInAt: string | null;
  volunteerProfile: {
    id: string;
    user: { id: string; name: string | null; email: string | null } | null;
    contact: { id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string | null } | null;
  };
}

interface Shift {
  id: string;
  name: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  targetTurfArea: string | null;
  maxVolunteers: number;
  minVolunteers: number;
  notes: string | null;
  checkInCode: string;
  signups: ShiftSignup[];
}

interface Props { campaignId: string }

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function signupName(s: ShiftSignup): string {
  if (s.volunteerProfile.user?.name) return s.volunteerProfile.user.name;
  const c = s.volunteerProfile.contact;
  if (c) return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Volunteer";
  return "Volunteer";
}

function formatTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const min = m[2];
  if (h === 0) return `12:${min} AM`;
  if (h < 12) return `${h}:${min} AM`;
  if (h === 12) return `12:${min} PM`;
  return `${h - 12}:${min} PM`;
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDates(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VolunteerShiftsClient({ campaignId }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [showSignup, setShowSignup] = useState<Shift | null>(null);
  const [showCheckin, setShowCheckin] = useState<Shift | null>(null);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinSignupId, setCheckinSignupId] = useState("");
  const [form, setForm] = useState({
    name: "", shiftDate: "", startTime: "17:00", endTime: "20:00",
    meetingLocation: "", targetTurfArea: "", maxVolunteers: "10", minVolunteers: "3", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/volunteers/shifts?campaignId=${campaignId}`);
      const data = await res.json();
      if (res.ok) setShifts(data.data ?? []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const key = dateKey(new Date(s.shiftDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [shifts]);

  async function createShift() {
    if (!form.name.trim() || !form.shiftDate || !form.meetingLocation.trim()) {
      toast.error("Please fill in name, date, and location");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/volunteers/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          campaignId,
          maxVolunteers: Number(form.maxVolunteers),
          minVolunteers: Number(form.minVolunteers),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast.success("Shift created");
      setShowCreate(false);
      setForm({ name: "", shiftDate: "", startTime: "17:00", endTime: "20:00", meetingLocation: "", targetTurfArea: "", maxVolunteers: "10", minVolunteers: "3", notes: "" });
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function signup(shiftId: string) {
    try {
      const res = await fetch(`/api/volunteers/shifts/${shiftId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast.success("Signed up for shift!");
      setShowSignup(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function checkin() {
    if (!showCheckin || !checkinCode || !checkinSignupId) return;
    try {
      const res = await fetch(`/api/volunteers/shifts/${showCheckin.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInCode: checkinCode, signupId: checkinSignupId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      toast.success(`Checked in! ${data.meta?.creditedHours ?? 0} hours credited`);
      setShowCheckin(null);
      setCheckinCode(""); setCheckinSignupId("");
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function sendReminders() {
    const toastId = toast.loading("Sending shift reminders…");
    try {
      const res = await fetch("/api/volunteers/shifts/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send reminders", { id: toastId });
        return;
      }
      const { sent, shiftsChecked, skipped } = data.data ?? {};
      if (sent === 0) {
        toast.info(
          skipped > 0
            ? `No shifts in the next 24 hours with email addresses (${skipped} skipped).`
            : `No shifts starting in the next 24 hours.`,
          { id: toastId }
        );
      } else {
        toast.success(`Sent ${sent} reminder email${sent !== 1 ? "s" : ""} across ${shiftsChecked} upcoming shift${shiftsChecked !== 1 ? "s" : ""}`, { id: toastId });
      }
    } catch { toast.error("Network error — reminders not sent", { id: toastId }); }
  }

  function navCalendar(dir: -1 | 1) {
    const d = new Date(calendarDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCalendarDate(d);
  }

  const weekDates = getWeekDates(calendarDate);
  const monthCells = view === "month" ? getMonthDates(calendarDate.getFullYear(), calendarDate.getMonth()) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 pb-12">
      <PageHeader
        title="Volunteer Shifts"
        description="Schedule shifts, manage signups, and track check-ins"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={sendReminders} className="min-h-[44px]"><Bell className="w-4 h-4" /> Reminders</Button>
            <Button onClick={() => setShowCreate(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 min-h-[44px]"><Plus className="w-4 h-4" /> New Shift</Button>
          </div>
        }
      />

      {/* View toggle + navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navCalendar(-1)} className="min-h-[44px]"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
            {view === "week"
              ? `${weekDates[0].toLocaleDateString("en-CA", { month: "short", day: "numeric" })} - ${weekDates[6].toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`
              : calendarDate.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navCalendar(1)} className="min-h-[44px]"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <Card className="p-8">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      ) : view === "week" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDates.map((d, i) => (
              <div key={i} className="px-2 py-2 text-center border-r border-gray-100 last:border-r-0">
                <p className="text-xs text-gray-500 font-medium">{DAYS[d.getDay()]}</p>
                <p className={`text-sm font-bold ${dateKey(d) === dateKey(new Date()) ? "text-[#1D9E75]" : "text-gray-900"}`}>
                  {d.getDate()}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[200px]">
            {weekDates.map((d, i) => {
              const dayShifts = shiftsByDate.get(dateKey(d)) ?? [];
              return (
                <div key={i} className="border-r border-gray-100 last:border-r-0 p-1 space-y-1">
                  <AnimatePresence>
                    {dayShifts.map((s) => (
                      <motion.button
                        key={s.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={spring}
                        onClick={() => setShowSignup(s)}
                        className="w-full text-left p-1.5 rounded-md bg-[#0A2342]/5 hover:bg-[#0A2342]/10 transition-colors"
                      >
                        <p className="text-xs font-medium text-[#0A2342] truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-500">{formatTime(s.startTime)}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users className="w-2.5 h-2.5 text-gray-400" />
                          <span className={`text-[10px] ${s.signups.length >= s.maxVolunteers ? "text-red-500" : "text-gray-500"}`}>
                            {s.signups.length}/{s.maxVolunteers}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((d, i) => {
              const dayShifts = d ? (shiftsByDate.get(dateKey(d)) ?? []) : [];
              const isToday = d && dateKey(d) === dateKey(new Date());
              return (
                <div key={i} className={`min-h-[80px] border-r border-b border-gray-100 p-1 ${d ? "" : "bg-gray-50/50"}`}>
                  {d && (
                    <>
                      <p className={`text-xs font-medium mb-1 ${isToday ? "text-[#1D9E75] font-bold" : "text-gray-600"}`}>{d.getDate()}</p>
                      {dayShifts.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setShowSignup(s)}
                          className="w-full text-left p-1 rounded bg-[#0A2342]/5 hover:bg-[#0A2342]/10 mb-0.5"
                        >
                          <p className="text-[10px] font-medium text-[#0A2342] truncate">{s.name}</p>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {shifts.length === 0 && !loading && (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No shifts scheduled"
          description="Create your first shift to start organizing volunteers"
          action={<Button onClick={() => setShowCreate(true)} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Create Shift</Button>}
        />
      )}

      {/* Create Shift Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Shift" size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required className="inline-flex items-center gap-1">Shift Name <FieldHelp content="A descriptive name for this shift so volunteers know what they are signing up for." example="Evening Canvass — Ward 5 North" /></Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Evening Canvass — Ward 5 North" className="min-h-[44px]" />
            </div>
            <div>
              <Label required className="inline-flex items-center gap-1">Date <FieldHelp content="The date this shift takes place. Shifts appear on the calendar on this date." /></Label>
              <Input type="date" value={form.shiftDate} onChange={(e) => setForm((s) => ({ ...s, shiftDate: e.target.value }))} className="min-h-[44px]" />
            </div>
            <div>
              <Label required className="inline-flex items-center gap-1">Start Time <FieldHelp content="When volunteers should arrive and be ready to begin. Reminder emails use this time." example="17:00 (5:00 PM)" /></Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))} className="min-h-[44px]" />
            </div>
            <div>
              <Label required className="inline-flex items-center gap-1">End Time <FieldHelp content="When the shift wraps up. Used to calculate hours credited to each volunteer." /></Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))} className="min-h-[44px]" />
            </div>
          </div>
          <div>
            <Label required className="inline-flex items-center gap-1">Meeting Location <FieldHelp content="Where volunteers should gather before heading out. Be specific — include an address or landmark." example="45 Elm St, Unit 2 (community centre side entrance)" /></Label>
            <Input value={form.meetingLocation} onChange={(e) => setForm((s) => ({ ...s, meetingLocation: e.target.value }))} placeholder="e.g. 45 Elm St — community centre side entrance" className="min-h-[44px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="inline-flex items-center gap-1">Target Turf <FieldHelp content="The streets or area this shift will canvass. Shown to volunteers so they know where they are going." example="Maple Ave to Oak St, north of King" /></Label>
              <Input value={form.targetTurfArea} onChange={(e) => setForm((s) => ({ ...s, targetTurfArea: e.target.value }))} placeholder="e.g. Maple Ave to Oak St" className="min-h-[44px]" />
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Max Volunteers <FieldHelp content="The maximum number of volunteers who can sign up. The shift is marked full once this is reached." example="12" /></Label>
              <Input type="number" value={form.maxVolunteers} onChange={(e) => setForm((s) => ({ ...s, maxVolunteers: e.target.value }))} className="min-h-[44px]" />
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Min Volunteers <FieldHelp content="The minimum number of volunteers needed for this shift to run. Used to flag under-staffed shifts." example="3" /></Label>
              <Input type="number" value={form.minVolunteers} onChange={(e) => setForm((s) => ({ ...s, minVolunteers: e.target.value }))} className="min-h-[44px]" />
            </div>
          </div>
          <div>
            <Label className="inline-flex items-center gap-1">Notes <FieldHelp content="Instructions or context for volunteers joining this shift. Shown on the shift detail page." example="Park on Elm St. Bring your phone and wear comfortable shoes. Pizza after!" /></Label>
            <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="e.g. Bring your phone and wear comfortable shoes. Park on Elm St." />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={createShift} loading={saving} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Create Shift</Button>
          </div>
        </div>
      </Modal>

      {/* Shift Detail / Signup Modal */}
      <Modal open={!!showSignup} onClose={() => setShowSignup(null)} title={showSignup?.name ?? "Shift Details"} size="lg">
        {showSignup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-[#0A2342]" />
                {new Date(showSignup.shiftDate).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-[#0A2342]" />
                {formatTime(showSignup.startTime)} - {formatTime(showSignup.endTime)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                <MapPin className="w-4 h-4 text-[#0A2342]" />
                {showSignup.meetingLocation}
              </div>
            </div>

            {showSignup.notes && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{showSignup.notes}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={showSignup.signups.length >= showSignup.maxVolunteers ? "danger" : "success"}>
                  {showSignup.signups.length} / {showSignup.maxVolunteers} signed up
                </Badge>
                <Badge variant="info">Code: {showSignup.checkInCode}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => signup(showSignup.id)} disabled={showSignup.signups.length >= showSignup.maxVolunteers} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
                  <UserPlus className="w-4 h-4" /> Sign Up
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowCheckin(showSignup); setShowSignup(null); }} className="min-h-[44px]">
                  <CheckCircle2 className="w-4 h-4" /> Check In
                </Button>
              </div>
            </div>

            {/* Signups list */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Signups ({showSignup.signups.length})</p>
              {showSignup.signups.length === 0 ? (
                <p className="text-sm text-gray-400">No one has signed up yet</p>
              ) : (
                <div className="space-y-1">
                  {showSignup.signups.map((su) => (
                    <div key={su.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0A2342] text-white flex items-center justify-center text-[10px] font-bold">
                          {signupName(su).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{signupName(su)}</span>
                      </div>
                      <Badge variant={su.status === "attended" ? "success" : su.status === "cancelled" ? "danger" : "default"}>
                        {su.status === "signed_up" ? "Signed Up" : su.status === "attended" ? "Attended" : su.status === "no_show" ? "No Show" : "Cancelled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Check-in Modal */}
      <Modal open={!!showCheckin} onClose={() => { setShowCheckin(null); setCheckinCode(""); setCheckinSignupId(""); }} title="Check In Volunteer">
        {showCheckin && (
          <div className="space-y-4">
            <div>
              <Label required className="inline-flex items-center gap-1">Check-in Code <FieldHelp content="The 4-character code displayed on the shift detail page. Each shift has a unique code to verify attendance." tip="The shift leader can find this code on the shift card." /></Label>
              <Input
                value={checkinCode}
                onChange={(e) => setCheckinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A3K9"
                className="min-h-[44px] font-mono text-center text-lg tracking-widest"
              />
            </div>
            <div>
              <Label required className="inline-flex items-center gap-1">Select Volunteer <FieldHelp content="Choose the volunteer who is checking in. Only volunteers who signed up for this shift are shown." /></Label>
              <Select value={checkinSignupId} onChange={(e) => setCheckinSignupId(e.target.value)} className="min-h-[44px]">
                <option value="">Choose a signup...</option>
                {showCheckin.signups
                  .filter((su) => su.status === "signed_up")
                  .map((su) => (
                    <option key={su.id} value={su.id}>{signupName(su)}</option>
                  ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => { setShowCheckin(null); setCheckinCode(""); setCheckinSignupId(""); }} className="min-h-[44px]">Cancel</Button>
              <Button onClick={checkin} disabled={!checkinCode || !checkinSignupId} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
                <CheckCircle2 className="w-4 h-4" /> Confirm Check-in
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
