"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Clock, CheckCircle2, PlayCircle, Users,
  ChevronRight, AlertCircle, BookOpen, MessageSquare,
  Calendar, MapPin, UserCheck, Trash2, Ban, Radio,
  Search, Zap,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
  StatCard, Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  FieldShiftType, FieldShiftStatus, FieldProgramType,
  ScriptTemplateType, FollowUpActionType, FollowUpActionStatus,
  FieldAttemptOutcome,
} from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShiftRow {
  id: string;
  campaignId: string;
  fieldProgramId: string | null;
  shiftType: FieldShiftType;
  name: string;
  description: string | null;
  status: FieldShiftStatus;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingPoint: string | null;
  meetingAddress: string | null;
  maxCapacity: number | null;
  minCapacity: number | null;
  ward: string | null;
  pollNumber: string | null;
  turfId: string | null;
  routeId: string | null;
  leadUserId: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { assignments: number; attempts: number };
  leadUser: { id: string; name: string | null } | null;
  fieldProgram: { id: string; name: string } | null;
  turf: { id: string; name: string } | null;
  route: { id: string; name: string } | null;
}

interface ScriptRow {
  id: string;
  name: string;
  scriptType: ScriptTemplateType;
  language: string;
  version: number;
  isActive: boolean;
  description: string | null;
  targetSupportLevels: string[];
  createdAt: string;
}

interface FollowUpRow {
  id: string;
  followUpType: FollowUpActionType;
  status: FollowUpActionStatus;
  priority: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  assignedTo: { id: string; name: string | null } | null;
}

interface Program { id: string; name: string; programType: FieldProgramType }

interface Props {
  campaignId: string;
  campaignName: string;
  initialShifts: ShiftRow[];
  programs: Program[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_STATUS_CONFIG: Record<FieldShiftStatus, {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
}> = {
  draft:       { label: "Draft",       variant: "default",  icon: <Clock className="h-3 w-3" /> },
  open:        { label: "Open",        variant: "info",     icon: <Radio className="h-3 w-3" /> },
  full:        { label: "Full",        variant: "warning",  icon: <Users className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "warning",  icon: <PlayCircle className="h-3 w-3" /> },
  completed:   { label: "Completed",   variant: "success",  icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled:   { label: "Cancelled",   variant: "danger",   icon: <Ban className="h-3 w-3" /> },
};

const SHIFT_TYPE_LABELS: Record<FieldShiftType, string> = {
  canvassing:   "Door Canvass",
  literature:   "Lit Drop",
  sign_install: "Sign Install",
  sign_remove:  "Sign Removal",
  event_field:  "Event Field",
  office:       "Office",
  gotv:         "GOTV",
  poll_day:     "Poll Day",
};

const SCRIPT_TYPE_LABELS: Record<ScriptTemplateType, string> = {
  id_script:       "ID Script",
  persuasion:      "Persuasion",
  gotv:            "GOTV",
  sign_ask:        "Sign Ask",
  donor_ask:       "Donor Ask",
  volunteer_ask:   "Volunteer Ask",
  general:         "General",
  follow_up:       "Follow-Up",
};

const FOLLOW_UP_TYPE_LABELS: Record<FollowUpActionType, string> = {
  revisit:            "Revisit",
  sign_ops:           "Sign Ops",
  donor_referral:     "Donor Referral",
  volunteer_referral: "Volunteer Referral",
  crm_cleanup:        "CRM Cleanup",
  bad_data:           "Bad Data",
  lit_missed:         "Lit Missed",
  building_retry:     "Building Retry",
  gotv_target:        "GOTV Target",
  press_opportunity:  "Press Opportunity",
  other:              "Other",
};

const FOLLOW_UP_STATUS_CONFIG: Record<FollowUpActionStatus, {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "info";
}> = {
  pending:     { label: "Pending",     variant: "warning" },
  assigned:    { label: "Assigned",    variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed:   { label: "Completed",   variant: "success" },
  dismissed:   { label: "Dismissed",   variant: "default" },
};

const OUTCOME_CONFIG: Record<FieldAttemptOutcome, {
  label: string;
  color: string;
  textColor: string;
  group: "positive" | "contact" | "away" | "data" | "negative";
}> = {
  supporter:           { label: "Supporter",          color: "bg-[#1D9E75]",   textColor: "text-white",    group: "positive" },
  volunteer_interest:  { label: "Volunteer Interest",  color: "bg-teal-500",    textColor: "text-white",    group: "positive" },
  donor_interest:      { label: "Donor Interest",      color: "bg-blue-500",    textColor: "text-white",    group: "positive" },
  sign_requested:      { label: "Sign Request",        color: "bg-[#0A2342]",   textColor: "text-white",    group: "positive" },
  contacted:           { label: "Contacted",           color: "bg-gray-400",    textColor: "text-white",    group: "contact" },
  undecided:           { label: "Undecided",           color: "bg-[#EF9F27]",   textColor: "text-white",    group: "contact" },
  follow_up:           { label: "Follow Up",           color: "bg-blue-400",    textColor: "text-white",    group: "contact" },
  no_answer:           { label: "No Answer",           color: "bg-gray-300",    textColor: "text-gray-700", group: "away" },
  not_home:            { label: "Not Home",            color: "bg-gray-200",    textColor: "text-gray-700", group: "away" },
  moved:               { label: "Moved",               color: "bg-orange-400",  textColor: "text-white",    group: "data" },
  bad_data:            { label: "Bad Data",            color: "bg-orange-500",  textColor: "text-white",    group: "data" },
  inaccessible:        { label: "Inaccessible",        color: "bg-orange-300",  textColor: "text-gray-800", group: "data" },
  refused:             { label: "Refused",             color: "bg-[#E24B4A]",   textColor: "text-white",    group: "negative" },
  hostile:             { label: "Hostile",             color: "bg-red-700",     textColor: "text-white",    group: "negative" },
  opposition:          { label: "Opposition",          color: "bg-red-600",     textColor: "text-white",    group: "negative" },
  do_not_return:       { label: "Do Not Return",       color: "bg-red-900",     textColor: "text-white",    group: "negative" },
};

const OUTCOME_GROUPS: Array<{ label: string; outcomes: FieldAttemptOutcome[] }> = [
  { label: "Positive", outcomes: ["supporter", "volunteer_interest", "donor_interest", "sign_requested"] },
  { label: "Soft Contact", outcomes: ["contacted", "undecided", "follow_up"] },
  { label: "Not Home", outcomes: ["no_answer", "not_home"] },
  { label: "Data Issue", outcomes: ["moved", "bad_data", "inaccessible"] },
  { label: "Hard No", outcomes: ["refused", "hostile", "opposition", "do_not_return"] },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Create Shift Drawer ────────────────────────────────────────────────────────

function CreateShiftDrawer({
  campaignId,
  programs,
  onClose,
  onCreate,
}: {
  campaignId: string;
  programs: Program[];
  onClose: () => void;
  onCreate: (shift: ShiftRow) => void;
}) {
  const [name, setName] = useState("");
  const [shiftType, setShiftType] = useState<FieldShiftType>("canvassing");
  const [fieldProgramId, setFieldProgramId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [meetingAddress, setMeetingAddress] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [ward, setWard] = useState("");
  const [pollNumber, setPollNumber] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Shift name is required"); return; }
    if (!scheduledDate) { toast.error("Scheduled date is required"); return; }
    if (!startTime || !endTime) { toast.error("Start and end time are required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/field/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: name.trim(),
          shiftType,
          fieldProgramId: fieldProgramId || undefined,
          scheduledDate,
          startTime,
          endTime,
          meetingPoint: meetingPoint.trim() || undefined,
          meetingAddress: meetingAddress.trim() || undefined,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : undefined,
          ward: ward.trim() || undefined,
          pollNumber: pollNumber.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to create shift");
        return;
      }
      const data = await res.json() as { data: ShiftRow };
      toast.success(`Shift "${data.data.name}" created`);
      onCreate(data.data);
      onClose();
    } catch {
      toast.error("Failed to create shift");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Create Shift</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <FormField label="Shift Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Saturday AM Canvass — Poll 14"
          />
        </FormField>

        <FormField label="Shift Type">
          <Select value={shiftType} onChange={(e) => setShiftType(e.target.value as FieldShiftType)}>
            {(Object.entries(SHIFT_TYPE_LABELS) as [FieldShiftType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Field Program">
          <Select value={fieldProgramId} onChange={(e) => setFieldProgramId(e.target.value)}>
            <option value="">— No program —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Date" required>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Time" required>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </FormField>
          <FormField label="End Time" required>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Meeting Point">
          <Input
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            placeholder="e.g. Tim Hortons on Main St"
          />
        </FormField>

        <FormField label="Meeting Address">
          <Input
            value={meetingAddress}
            onChange={(e) => setMeetingAddress(e.target.value)}
            placeholder="123 Main St, Toronto"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ward">
            <Input
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="e.g. Ward 20"
            />
          </FormField>
          <FormField label="Poll Number">
            <Input
              value={pollNumber}
              onChange={(e) => setPollNumber(e.target.value)}
              placeholder="e.g. 014"
            />
          </FormField>
        </div>

        <FormField label="Max Volunteers">
          <Input
            type="number"
            min="1"
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
            placeholder="Leave blank for unlimited"
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this shift…"
            className="min-h-[60px]"
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes, access instructions…"
            className="min-h-[60px]"
          />
        </FormField>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleCreate} loading={saving}>
          <Plus className="h-4 w-4" />
          Create Shift
        </Button>
      </div>
    </motion.div>
  );
}

// ── Edit Status Drawer ─────────────────────────────────────────────────────────

function EditShiftDrawer({
  shift,
  campaignId,
  onClose,
  onUpdate,
  onDelete,
  onLogOutcome,
}: {
  shift: ShiftRow;
  campaignId: string;
  onClose: () => void;
  onUpdate: (s: ShiftRow) => void;
  onDelete: (id: string) => void;
  onLogOutcome: () => void;
}) {
  const [status, setStatus] = useState<FieldShiftStatus>(shift.status);
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validStatuses: FieldShiftStatus[] = ["draft", "open", "full", "in_progress", "completed", "cancelled"];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/field/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to update shift");
        return;
      }
      const data = await res.json() as { data: ShiftRow };
      toast.success("Shift updated");
      onUpdate({ ...shift, ...data.data });
      onClose();
    } catch {
      toast.error("Failed to update shift");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/field/shifts/${shift.id}?campaignId=${campaignId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to delete shift");
        return;
      }
      toast.success(`Shift "${shift.name}" deleted`);
      onDelete(shift.id);
      onClose();
    } catch {
      toast.error("Failed to delete shift");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{shift.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {SHIFT_TYPE_LABELS[shift.shiftType]} · {new Date(shift.scheduledDate).toLocaleDateString("en-CA")}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{shift._count.assignments}</p>
            <p className="text-xs text-gray-500 mt-0.5">Volunteers</p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{shift._count.attempts}</p>
            <p className="text-xs text-gray-500 mt-0.5">Outcomes Logged</p>
          </div>
        </div>

        {/* Log Outcome CTA */}
        {shift.status !== "cancelled" && shift.status !== "completed" && (
          <Button
            className="w-full bg-[#1D9E75] hover:bg-[#17896a] border-[#1D9E75] text-white"
            onClick={onLogOutcome}
          >
            <Zap className="h-4 w-4" />
            Log Outcome at a Door
          </Button>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{new Date(shift.scheduledDate).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{shift.startTime} – {shift.endTime}</span>
          </div>
          {shift.meetingPoint && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{shift.meetingPoint}</span>
            </div>
          )}
          {shift.leadUser && (
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <span>Lead: {shift.leadUser.name}</span>
            </div>
          )}
          {shift.fieldProgram && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <span>{shift.fieldProgram.name}</span>
            </div>
          )}
          {(shift.turf || shift.route) && (
            <div className="flex items-center gap-2 flex-wrap gap-y-1">
              <MapPin className="h-4 w-4 text-gray-400" />
              {shift.turf && <Badge variant="default">{shift.turf.name}</Badge>}
              {shift.route && <Badge variant="info">{shift.route.name}</Badge>}
            </div>
          )}
        </div>

        <FormField label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as FieldShiftStatus)}>
            {validStatuses.map((s) => (
              <option key={s} value={s}>{SHIFT_STATUS_CONFIG[s].label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes…"
            className="min-h-[80px]"
          />
        </FormField>

        {/* Capacity */}
        {shift.maxCapacity && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <span className="font-medium">{shift._count.assignments}</span> / {shift.maxCapacity} volunteers assigned
            {shift._count.assignments >= shift.maxCapacity && (
              <span className="ml-2 text-amber-600 font-medium">Full</span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 space-y-3">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>

        {!confirmDelete ? (
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Shift
          </Button>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-sm text-red-700 font-medium">
              Delete &ldquo;{shift.name}&rdquo;? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={handleDelete} loading={deleting}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Shift Card ─────────────────────────────────────────────────────────────────

function ShiftCard({ shift, onClick }: { shift: ShiftRow; onClick: () => void }) {
  const statusCfg = SHIFT_STATUS_CONFIG[shift.status];
  const date = new Date(shift.scheduledDate);
  const isToday = new Date().toDateString() === date.toDateString();
  const isPast = date < new Date() && shift.status !== "completed";

  return (
    <motion.div whileHover={{ y: -1 }} transition={SPRING}>
      <Card
        className={cn(
          "cursor-pointer hover:border-blue-300 hover:shadow-md transition-all",
          isToday && "border-l-4 border-l-[#1D9E75]",
          isPast && shift.status === "in_progress" && "border-l-4 border-l-amber-400",
        )}
        onClick={onClick}
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-gray-900 truncate">{shift.name}</span>
                <Badge variant={statusCfg.variant}>
                  <span className="flex items-center gap-1">{statusCfg.icon} {statusCfg.label}</span>
                </Badge>
                <Badge variant="default">{SHIFT_TYPE_LABELS[shift.shiftType]}</Badge>
                {isToday && <Badge variant="success">Today</Badge>}
              </div>

              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {date.toLocaleDateString("en-CA")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {shift.startTime}–{shift.endTime}
                </span>
                {shift.fieldProgram && (
                  <span className="text-[#0A2342] font-medium">{shift.fieldProgram.name}</span>
                )}
                {shift.meetingPoint && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {shift.meetingPoint}
                  </span>
                )}
                {shift.ward && <span>{shift.ward}</span>}
                {shift.pollNumber && <span>Poll {shift.pollNumber}</span>}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {shift._count.assignments}
                  {shift.maxCapacity ? ` / ${shift.maxCapacity}` : ""} volunteers
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {shift._count.attempts} outcomes logged
                </span>
                {shift.leadUser && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {shift.leadUser.name}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Outcome Capture Drawer ─────────────────────────────────────────────────────

interface ContactResult {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
}

function OutcomeCaptureDrawer({
  campaignId,
  shift,
  onClose,
  onLogged,
}: {
  campaignId: string;
  shift: ShiftRow;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<FieldAttemptOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (contactQuery.length < 2) { setContactResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const sp = new URLSearchParams({ campaignId, search: contactQuery, pageSize: "6" });
        const res = await fetch(`/api/contacts?${sp}`);
        if (res.ok) {
          const json = await res.json() as { data: ContactResult[] };
          setContactResults(json.data ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [contactQuery, campaignId]);

  async function handleLog() {
    if (!selectedOutcome) { toast.error("Select an outcome first"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/field/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          shiftId: shift.id,
          fieldProgramId: shift.fieldProgramId ?? undefined,
          routeId: shift.routeId ?? undefined,
          contactId: selectedContact?.id ?? undefined,
          outcome: selectedOutcome,
          outcomeNotes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to log outcome");
        return;
      }
      toast.success(`${OUTCOME_CONFIG[selectedOutcome].label} logged`);
      setSelectedContact(null);
      setContactQuery("");
      setContactResults([]);
      setSelectedOutcome(null);
      setNotes("");
      onLogged();
    } catch {
      toast.error("Failed to log outcome");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Log Outcome</h2>
          <p className="text-xs text-gray-500 mt-0.5">{shift.name}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Optional contact search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contact <span className="font-normal text-gray-400 text-xs">(optional)</span>
          </label>
          {selectedContact ? (
            <div className="flex items-center justify-between rounded-lg border border-[#1D9E75] bg-green-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedContact.firstName} {selectedContact.lastName}
                </p>
                {selectedContact.address1 && (
                  <p className="text-xs text-gray-500 mt-0.5">{selectedContact.address1}</p>
                )}
              </div>
              <button
                onClick={() => { setSelectedContact(null); setContactQuery(""); setContactResults([]); }}
                className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder="Search by name or address…"
                className="pl-9"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner className="h-4 w-4 text-gray-400" />
                </div>
              )}
              {contactResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {contactResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedContact(c); setContactQuery(""); setContactResults([]); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                      {c.address1 && <p className="text-xs text-gray-500">{c.address1}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outcome groups — one tap */}
        {OUTCOME_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.outcomes.map((outcome) => {
                const cfg = OUTCOME_CONFIG[outcome];
                const isSelected = selectedOutcome === outcome;
                return (
                  <button
                    key={outcome}
                    onClick={() => setSelectedOutcome(isSelected ? null : outcome)}
                    className={cn(
                      "px-3 py-3 rounded-lg text-sm font-medium transition-all text-left leading-tight",
                      cfg.color,
                      cfg.textColor,
                      isSelected
                        ? "ring-2 ring-offset-2 ring-gray-800 shadow-md"
                        : "opacity-75 hover:opacity-100 hover:shadow-sm",
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Notes */}
        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Home weekends only, interested in a sign…"
            className="min-h-[60px]"
          />
        </FormField>
      </div>

      <div className="px-6 py-4 border-t border-gray-100">
        <Button
          className="w-full"
          onClick={handleLog}
          loading={saving}
          disabled={!selectedOutcome}
        >
          <Zap className="h-4 w-4" />
          {selectedOutcome
            ? `Log — ${OUTCOME_CONFIG[selectedOutcome].label}`
            : "Select an Outcome Above"}
        </Button>
        {selectedOutcome && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Resets after logging — stay in the drawer to log multiple doors
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Scripts Tab ────────────────────────────────────────────────────────────────

function ScriptsTab({ campaignId }: { campaignId: string }) {
  const [scripts, setScripts] = useState<ScriptRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/field/scripts?campaignId=${campaignId}`);
        if (res.ok) {
          const json = await res.json() as { data: ScriptRow[] };
          setScripts(json.data);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [campaignId]);

  function handleCreated(script: ScriptRow) {
    setScripts((prev) => [script, ...(prev ?? [])]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{scripts?.length ?? 0} scripts</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Script
        </Button>
      </div>

      {!scripts?.length ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-gray-300" />}
          title="No scripts yet"
          description="Create canvassing scripts to guide your volunteers through every door."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create First Script
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => (
            <Card key={script.id} className="hover:border-blue-200 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-gray-900">{script.name}</span>
                      <Badge variant="info">{SCRIPT_TYPE_LABELS[script.scriptType]}</Badge>
                      {!script.isActive && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap">
                      <span>v{script.version}</span>
                      <span>{script.language.toUpperCase()}</span>
                      {script.description && <span className="truncate max-w-[240px]">{script.description}</span>}
                      {script.targetSupportLevels.length > 0 && (
                        <span>Targets: {script.targetSupportLevels.join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Script Drawer */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              key="backdrop-script"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setShowCreate(false)}
            />
            <CreateScriptDrawer
              key="drawer-script"
              campaignId={campaignId}
              onClose={() => setShowCreate(false)}
              onCreate={handleCreated}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Create Script Drawer ───────────────────────────────────────────────────────

function CreateScriptDrawer({
  campaignId,
  onClose,
  onCreate,
}: {
  campaignId: string;
  onClose: () => void;
  onCreate: (script: ScriptRow) => void;
}) {
  const [name, setName] = useState("");
  const [scriptType, setScriptType] = useState<ScriptTemplateType>("id_script");
  const [description, setDescription] = useState("");
  const [intro, setIntro] = useState("");
  const [mainBody, setMainBody] = useState("");
  const [closing, setClosing] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Script name is required"); return; }
    if (!intro.trim()) { toast.error("Opening text is required"); return; }
    setSaving(true);
    try {
      const contentJson = {
        sections: [
          { id: "intro", title: "Opening", text: intro.trim() },
          ...(mainBody.trim() ? [{ id: "body", title: "Main Message", text: mainBody.trim() }] : []),
          ...(closing.trim() ? [{ id: "closing", title: "Closing", text: closing.trim() }] : []),
        ],
      };
      const res = await fetch("/api/field/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: name.trim(),
          scriptType,
          description: description.trim() || undefined,
          contentJson,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast.error(err.error ?? "Failed to create script");
        return;
      }
      const data = await res.json() as { data: ScriptRow };
      toast.success(`Script "${data.data.name}" created`);
      onCreate(data.data);
      onClose();
    } catch {
      toast.error("Failed to create script");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={SPRING}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Create Script</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <FormField label="Script Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. General ID Script — English"
          />
        </FormField>

        <FormField label="Script Type">
          <Select value={scriptType} onChange={(e) => setScriptType(e.target.value as ScriptTemplateType)}>
            {(Object.entries(SCRIPT_TYPE_LABELS) as [ScriptTemplateType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use this script…"
          />
        </FormField>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Script Sections</p>

          <FormField label="Opening" required>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder={"Hi, my name is [name] and I'm volunteering for [candidate]. Do you have a moment?"}
              className="min-h-[80px]"
            />
          </FormField>

          <div className="mt-4">
            <FormField label="Main Message">
              <Textarea
                value={mainBody}
                onChange={(e) => setMainBody(e.target.value)}
                placeholder="The key message — local issues, why your candidate, what you're asking for…"
                className="min-h-[80px]"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Closing">
              <Textarea
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                placeholder={"Thanks for your time! Can we count on your support on election day?"}
                className="min-h-[60px]"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleCreate} loading={saving}>
          <Plus className="h-4 w-4" />
          Create Script
        </Button>
      </div>
    </motion.div>
  );
}

// ── Follow-Ups Tab ─────────────────────────────────────────────────────────────

function FollowUpsTab({ campaignId }: { campaignId: string }) {
  const [followUps, setFollowUps] = useState<FollowUpRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FollowUpActionStatus | "">("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ campaignId });
        if (statusFilter) sp.set("status", statusFilter);
        const res = await fetch(`/api/field/follow-ups?${sp}`);
        if (res.ok) {
          const json = await res.json() as { data: FollowUpRow[] };
          setFollowUps(json.data);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [campaignId, statusFilter]);

  async function handleComplete(id: string) {
    try {
      const res = await fetch("/api/field/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, followUpId: id, status: "completed" }),
      });
      if (res.ok) {
        setFollowUps((prev) =>
          prev?.map((f) => f.id === id ? { ...f, status: "completed" as FollowUpActionStatus } : f) ?? null,
        );
        toast.success("Follow-up marked complete");
      }
    } catch {
      toast.error("Failed to update follow-up");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FollowUpActionStatus | "")}
          className="w-48"
        >
          <option value="">All statuses</option>
          {(Object.keys(FOLLOW_UP_STATUS_CONFIG) as FollowUpActionStatus[]).map((s) => (
            <option key={s} value={s}>{FOLLOW_UP_STATUS_CONFIG[s].label}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-500">{followUps?.length ?? 0} follow-ups</span>
      </div>

      {!followUps?.length ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-gray-300" />}
          title="No follow-ups"
          description="Follow-up actions are created automatically when outcomes like revisit, sign request, or volunteer interest are logged."
        />
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => {
            const statusCfg = FOLLOW_UP_STATUS_CONFIG[fu.status];
            const isOverdue = fu.dueDate && new Date(fu.dueDate) < new Date() && fu.status !== "completed" && fu.status !== "dismissed";
            return (
              <Card key={fu.id} className={cn(isOverdue && "border-red-200")}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {FOLLOW_UP_TYPE_LABELS[fu.followUpType]}
                        </span>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        {isOverdue && (
                          <Badge variant="danger">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Overdue
                            </span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap">
                        {fu.contact && (
                          <span>{fu.contact.firstName} {fu.contact.lastName}</span>
                        )}
                        {fu.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {new Date(fu.dueDate).toLocaleDateString("en-CA")}
                          </span>
                        )}
                        {fu.assignedTo && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {fu.assignedTo.name}
                          </span>
                        )}
                        {fu.notes && <span className="truncate max-w-[240px]">{fu.notes}</span>}
                      </div>
                    </div>
                    {fu.status !== "completed" && fu.status !== "dismissed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleComplete(fu.id)}
                        className="flex-shrink-0"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RunsClient({
  campaignId,
  campaignName,
  initialShifts,
  programs,
}: Props) {
  const [shifts, setShifts] = useState<ShiftRow[]>(initialShifts);
  const [showCreate, setShowCreate] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [showOutcomeCapture, setShowOutcomeCapture] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FieldShiftStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<FieldShiftType | "">("");

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const total = shifts.length;
    const active = shifts.filter((s) => s.status === "in_progress" || s.status === "open").length;
    const todayShifts = shifts.filter((s) => new Date(s.scheduledDate).toDateString() === today).length;
    const completed = shifts.filter((s) => s.status === "completed").length;
    const totalAttempts = shifts.reduce((acc, s) => acc + s._count.attempts, 0);
    return { total, active, todayShifts, completed, totalAttempts };
  }, [shifts]);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (typeFilter && s.shiftType !== typeFilter) return false;
      return true;
    });
  }, [shifts, statusFilter, typeFilter]);

  function handleCreate(shift: ShiftRow) {
    setShifts((prev) => [shift, ...prev]);
  }

  function handleUpdate(updated: ShiftRow) {
    setShifts((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  function handleDelete(id: string) {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }

  function handleOutcomeLogged() {
    // Increment attempt count on the active shift (optimistic update)
    if (editingShift) {
      const updated = {
        ...editingShift,
        _count: { ...editingShift._count, attempts: editingShift._count.attempts + 1 },
      };
      setEditingShift(updated);
      setShifts((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Canvassing Runs"
          description={campaignName}
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New Shift
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 mb-8">
          <StatCard label="Total Shifts" value={stats.total} />
          <StatCard label="Today" value={stats.todayShifts} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Total Outcomes" value={stats.totalAttempts} />
        </div>

        <Tabs defaultValue="shifts">
          <TabsList className="mb-6">
            <TabsTrigger value="shifts">
              Shifts ({shifts.length})
            </TabsTrigger>
            <TabsTrigger value="scripts">
              Scripts
            </TabsTrigger>
            <TabsTrigger value="follow-ups">
              Follow-Ups
            </TabsTrigger>
          </TabsList>

          {/* ── Shifts Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="shifts">
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FieldShiftStatus | "")}
                className="w-44"
              >
                <option value="">All statuses</option>
                {(Object.keys(SHIFT_STATUS_CONFIG) as FieldShiftStatus[]).map((s) => (
                  <option key={s} value={s}>{SHIFT_STATUS_CONFIG[s].label}</option>
                ))}
              </Select>

              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FieldShiftType | "")}
                className="w-44"
              >
                <option value="">All types</option>
                {(Object.entries(SHIFT_TYPE_LABELS) as [FieldShiftType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>

              {(statusFilter || typeFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStatusFilter(""); setTypeFilter(""); }}
                  className="text-gray-400"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}

              <span className="text-sm text-gray-500 ml-auto">
                {filtered.length} shift{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8 text-gray-300" />}
                title={shifts.length === 0 ? "No shifts yet" : "No shifts match your filters"}
                description={
                  shifts.length === 0
                    ? "Create your first canvassing shift to get your team into the field."
                    : "Try adjusting the filters above."
                }
                action={
                  shifts.length === 0 ? (
                    <Button onClick={() => setShowCreate(true)}>
                      <Plus className="h-4 w-4" />
                      Create First Shift
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClick={() => setEditingShift(shift)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Scripts Tab ────────────────────────────────────────────────── */}
          <TabsContent value="scripts">
            <ScriptsTab campaignId={campaignId} />
          </TabsContent>

          {/* ── Follow-Ups Tab ─────────────────────────────────────────────── */}
          <TabsContent value="follow-ups">
            <FollowUpsTab campaignId={campaignId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              key="backdrop-create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setShowCreate(false)}
            />
            <CreateShiftDrawer
              key="drawer-create"
              campaignId={campaignId}
              programs={programs}
              onClose={() => setShowCreate(false)}
              onCreate={handleCreate}
            />
          </>
        )}

        {editingShift && (
          <>
            <motion.div
              key="backdrop-edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => { setEditingShift(null); setShowOutcomeCapture(false); }}
            />
            <EditShiftDrawer
              key="drawer-edit"
              shift={editingShift}
              campaignId={campaignId}
              onClose={() => { setEditingShift(null); setShowOutcomeCapture(false); }}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onLogOutcome={() => setShowOutcomeCapture(true)}
            />
            {showOutcomeCapture && (
              <OutcomeCaptureDrawer
                key="drawer-outcome"
                campaignId={campaignId}
                shift={editingShift}
                onClose={() => setShowOutcomeCapture(false)}
                onLogged={handleOutcomeLogged}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
