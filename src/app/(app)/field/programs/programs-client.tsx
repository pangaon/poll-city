"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, X, Calendar, Target, Route, Users,
  ChevronRight, CheckCircle2, Pause, ArchiveIcon, Clock,
  TrendingUp, PlayCircle, DoorOpen,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
} from "@/components/ui";
import { toast } from "sonner";
import Link from "next/link";
import type { FieldProgramType, FieldProgramStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgramCounts {
  routes: number;
  targets: number;
  shifts: number;
  attempts: number;
}

export interface Program {
  id: string;
  campaignId: string;
  name: string;
  programType: FieldProgramType;
  status: FieldProgramStatus;
  description: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  goalDoors: number | null;
  goalContacts: number | null;
  goalSupporters: number | null;
  targetPolls: string[];
  targetWard: string | null;
  isActive: boolean;
  createdAt: string;
  _count: ProgramCounts;
  createdBy: { id: string; name: string | null };
  contactedCount: number;
  supporterCount: number;
  completedRoutes: number;
}

interface Turf {
  id: string;
  name: string;
  ward: string | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialPrograms: Program[];
  turfs: Turf[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_TYPE_LABELS: Record<FieldProgramType, string> = {
  canvass: "Door Canvass",
  lit_drop: "Literature Drop",
  phone_bank: "Phone Bank",
  sign_install: "Sign Install",
  sign_remove: "Sign Removal",
  gotv: "GOTV",
  event_outreach: "Event Outreach",
  advance_vote: "Advance Vote",
  hybrid: "Hybrid",
};

const STATUS_CONFIG: Record<FieldProgramStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info"; icon: React.ReactNode }> = {
  planning: { label: "Planning", variant: "info", icon: <Clock className="h-3 w-3" /> },
  active: { label: "Active", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  paused: { label: "Paused", variant: "warning", icon: <Pause className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  archived: { label: "Archived", variant: "default", icon: <ArchiveIcon className="h-3 w-3" /> },
};

// ── Goal Bar ──────────────────────────────────────────────────────────────────

function GoalBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = Math.min(100, goal > 0 ? Math.round((value / goal) * 100) : 0);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>
          {value.toLocaleString()} / {goal.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ── Create Drawer ──────────────────────────────────────────────────────────────

interface CreateForm {
  name: string;
  programType: FieldProgramType;
  description: string;
  startDate: string;
  endDate: string;
  goalDoors: string;
  goalContacts: string;
  goalSupporters: string;
  targetWard: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  programType: "canvass",
  description: "",
  startDate: "",
  endDate: "",
  goalDoors: "",
  goalContacts: "",
  goalSupporters: "",
  targetWard: "",
};

function CreateDrawer({
  open,
  onClose,
  onCreated,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Program) => void;
  campaignId: string;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set(key: keyof CreateForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/field/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name.trim(),
          programType: form.programType,
          description: form.description || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          goalDoors: form.goalDoors ? parseInt(form.goalDoors, 10) : null,
          goalContacts: form.goalContacts ? parseInt(form.goalContacts, 10) : null,
          goalSupporters: form.goalSupporters ? parseInt(form.goalSupporters, 10) : null,
          targetWard: form.targetWard || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create program");
      }
      const { data } = await res.json();
      toast.success(`${data.name} created`);
      onCreated(data);
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">New Field Program</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FormField label="Program Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Ward 3 ID Pass #1"
                  autoFocus
                />
              </FormField>

              <FormField label="Program Type">
                <Select
                  value={form.programType}
                  onChange={(e) => set("programType", e.target.value as FieldProgramType)}
                >
                  {Object.entries(PROGRAM_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What is this program trying to accomplish?"
                  className="min-h-[80px]"
                />
              </FormField>

              <FormField label="Target Ward">
                <Input
                  value={form.targetWard}
                  onChange={(e) => set("targetWard", e.target.value)}
                  placeholder="e.g. Ward 3"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </FormField>
                <FormField label="End Date">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Goal: Doors">
                  <Input
                    type="number"
                    min="0"
                    value={form.goalDoors}
                    onChange={(e) => set("goalDoors", e.target.value)}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Goal: Contacts">
                  <Input
                    type="number"
                    min="0"
                    value={form.goalContacts}
                    onChange={(e) => set("goalContacts", e.target.value)}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Goal: Supporters">
                  <Input
                    type="number"
                    min="0"
                    value={form.goalSupporters}
                    onChange={(e) => set("goalSupporters", e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="flex-1">
                  Create Program
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Program Card ──────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  onStatusChange,
}: {
  program: Program;
  onStatusChange: (id: string, status: FieldProgramStatus) => void;
}) {
  const status = STATUS_CONFIG[program.status];
  const typeLabel = PROGRAM_TYPE_LABELS[program.programType];
  const hasGoals = program.goalDoors ?? program.goalContacts ?? program.goalSupporters;

  function formatDate(d: Date | string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  }

  async function toggleStatus(e: React.MouseEvent, nextStatus: FieldProgramStatus) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/field/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: program.createdBy.id ? undefined : undefined, status: nextStatus }),
      });
      if (res.ok) onStatusChange(program.id, nextStatus);
      else toast.error("Could not update status");
    } catch {
      toast.error("Could not update status");
    }
  }

  return (
    <Link href={`/field/programs/${program.id}`}>
      <motion.div whileHover={{ y: -1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <Card className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">{program.name}</span>
                  <Badge variant={status.variant}>
                    <span className="flex items-center gap-1">{status.icon} {status.label}</span>
                  </Badge>
                  <Badge variant="default">{typeLabel}</Badge>
                  {program.targetWard && (
                    <span className="text-xs text-gray-400">{program.targetWard}</span>
                  )}
                </div>
                {program.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{program.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Route className="h-3.5 w-3.5" />
                    {program._count.routes} route{program._count.routes !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <DoorOpen className="h-3.5 w-3.5" />
                    {program._count.attempts.toLocaleString()} doors
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {program._count.shifts} shift{program._count.shifts !== 1 ? "s" : ""}
                  </span>
                  {program.contactedCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {program.contactedCount.toLocaleString()} contacts
                    </span>
                  )}
                  {(program.startDate || program.endDate) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(program.startDate) ?? "?"} – {formatDate(program.endDate) ?? "ongoing"}
                    </span>
                  )}
                </div>

                {/* Goal progress bars */}
                {hasGoals && (
                  <div className="mt-3 space-y-1.5">
                    {program.goalDoors && (
                      <GoalBar
                        label="Doors"
                        value={program._count.attempts}
                        goal={program.goalDoors}
                        color="#0A2342"
                      />
                    )}
                    {program.goalContacts && (
                      <GoalBar
                        label="Contacts"
                        value={program.contactedCount}
                        goal={program.goalContacts}
                        color="#1D9E75"
                      />
                    )}
                    {program.goalSupporters && (
                      <GoalBar
                        label="Supporters"
                        value={program.supporterCount}
                        goal={program.goalSupporters}
                        color="#EF9F27"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                {program.status === "active" && (
                  <button
                    onClick={(e) => toggleStatus(e, "paused")}
                    className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 px-2 py-1 rounded border border-amber-200 hover:border-amber-300 transition-colors"
                  >
                    <Pause className="h-3 w-3" /> Pause
                  </button>
                )}
                {program.status === "paused" && (
                  <button
                    onClick={(e) => toggleStatus(e, "active")}
                    className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 hover:border-emerald-300 transition-colors"
                  >
                    <PlayCircle className="h-3 w-3" /> Resume
                  </button>
                )}
                {program.status === "planning" && (
                  <button
                    onClick={(e) => toggleStatus(e, "active")}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    <PlayCircle className="h-3 w-3" /> Activate
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProgramsClient({ campaignId, campaignName, initialPrograms, turfs }: Props) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function handleCreated(p: Program) {
    setPrograms((prev) => [{ ...p, contactedCount: 0, supporterCount: 0 }, ...prev]);
  }

  function handleStatusChange(id: string, status: FieldProgramStatus) {
    setPrograms((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    toast.success(`Program ${status}`);
  }

  const filtered = statusFilter === "all"
    ? programs
    : programs.filter((p) => p.status === statusFilter);

  const activeCount = programs.filter((p) => p.status === "active").length;
  const planningCount = programs.filter((p) => p.status === "planning").length;
  const totalDoors = programs.reduce((s, p) => s + p._count.attempts, 0);
  const totalContacts = programs.reduce((s, p) => s + p.contactedCount, 0);
  const contactRate = totalDoors > 0 ? Math.round((totalContacts / totalDoors) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="Field Programs"
        description={`${campaignName} · ${programs.length} program${programs.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            New Program
          </Button>
        }
      />

      {/* Analytics summary */}
      {programs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-[#0A2342]">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Active</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-gray-700">{totalDoors.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">Doors Knocked</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-[#1D9E75]">{totalContacts.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">Contacts Made</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-[#EF9F27]">{contactRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> Contact Rate
            </div>
          </div>
        </div>
      )}

      {/* Status filter */}
      {programs.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {(["all", "planning", "active", "paused", "completed", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s === "all" ? `All (${programs.length})` : STATUS_CONFIG[s as FieldProgramStatus].label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title={programs.length === 0 ? "No field programs yet" : "No programs match this filter"}
          description={
            programs.length === 0
              ? "Create your first field program to start organizing canvassing routes, literature drops, and GOTV operations."
              : undefined
          }
          action={
            programs.length === 0 ? (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                Create First Program
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <ProgramCard program={p} onStatusChange={handleStatusChange} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        campaignId={campaignId}
      />
    </div>
  );
}
