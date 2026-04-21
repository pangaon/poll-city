"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Clock, CheckCircle2, PlayCircle, Users,
  Calendar, MapPin, Layers, BookOpen, Search, Ban, Radio,
  Package, ChevronDown, ChevronUp, Route, Trash2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
  StatCard, Tabs, TabsList, TabsTrigger, TabsContent, FeatureGuide,
} from "@/components/ui";
import { toast } from "sonner";
import type { FieldShiftStatus, FieldProgramStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MaterialItem { name: string; qty: number }

export interface LitDropRow {
  id: string;
  campaignId: string;
  fieldProgramId: string | null;
  name: string;
  status: FieldShiftStatus;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingPoint: string | null;
  meetingAddress: string | null;
  maxCapacity: number | null;
  ward: string | null;
  pollNumber: string | null;
  turfId: string | null;
  routeId: string | null;
  leadUserId: string | null;
  notes: string | null;
  materialsJson: Record<string, unknown> | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { assignments: number; attempts: number };
  leadUser: { id: string; name: string | null } | null;
  fieldProgram: { id: string; name: string } | null;
  turf: { id: string; name: string } | null;
  route: { id: string; name: string } | null;
}

export interface LitProgramRow {
  id: string;
  name: string;
  programType: string;
  status: FieldProgramStatus;
  goalDoors: number | null;
}

interface CompletionState {
  id: string;
  note: string;
  usedQtys: Record<number, number>;
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialShifts: LitDropRow[];
  programs: LitProgramRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FieldShiftStatus, {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMaterials(json: Record<string, unknown> | null): MaterialItem[] {
  if (!json) return [];
  const items = json.items;
  if (Array.isArray(items)) {
    return items.filter(
      (i): i is MaterialItem =>
        typeof i === "object" && i !== null &&
        typeof (i as MaterialItem).name === "string" &&
        typeof (i as MaterialItem).qty === "number",
    );
  }
  const desc = json.description;
  if (typeof desc === "string" && desc.trim()) {
    return [{ name: desc, qty: 0 }];
  }
  return [];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LitDropsClient({ campaignId, campaignName, initialShifts, programs }: Props) {
  const [shifts, setShifts] = useState<LitDropRow[]>(initialShifts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FieldShiftStatus | "all">("all");
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState("runs");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<CompletionState | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    scheduledDate: "",
    startTime: "09:00",
    endTime: "13:00",
    fieldProgramId: "",
    createProgram: false,
    programName: "",
    meetingPoint: "",
    meetingAddress: "",
    maxCapacity: "",
    ward: "",
    pollNumber: "",
    notes: "",
  });
  const [formItems, setFormItems] = useState<MaterialItem[]>([]);
  const [saving, setSaving] = useState(false);

  const filtered = shifts.filter((s) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.ward ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: shifts.length,
    active: shifts.filter((s) => s.status === "in_progress" || s.status === "open").length,
    completed: shifts.filter((s) => s.status === "completed").length,
    totalDeliveries: shifts.reduce((sum, s) => sum + s._count.attempts, 0),
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.scheduledDate || !form.startTime || !form.endTime) {
      toast.error("Name, date, and times are required");
      return;
    }
    setSaving(true);
    try {
      const validItems = formItems.filter((i) => i.name.trim());
      const res = await fetch("/api/field/lit-drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          scheduledDate: form.scheduledDate,
          startTime: form.startTime,
          endTime: form.endTime,
          fieldProgramId: form.createProgram ? undefined : (form.fieldProgramId || undefined),
          createProgram: form.createProgram,
          programName: form.createProgram ? form.programName : undefined,
          meetingPoint: form.meetingPoint || undefined,
          meetingAddress: form.meetingAddress || undefined,
          maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
          ward: form.ward || undefined,
          pollNumber: form.pollNumber || undefined,
          notes: form.notes || undefined,
          ...(validItems.length > 0 ? { materialsJson: { items: validItems } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create lit drop run");
        return;
      }
      setShifts((prev) => [data.data, ...prev]);
      setShowDrawer(false);
      setForm({
        name: "", scheduledDate: "", startTime: "09:00", endTime: "13:00",
        fieldProgramId: "", createProgram: false, programName: "",
        meetingPoint: "", meetingAddress: "", maxCapacity: "", ward: "",
        pollNumber: "", notes: "",
      });
      setFormItems([]);
      toast.success("Lit drop run created");
    } catch {
      toast.error("Network error — please retry");
    } finally {
      setSaving(false);
    }
  }

  async function patchShift(shiftId: string, body: Record<string, unknown>) {
    const prev = shifts;
    setShifts((s) => s.map((r) => r.id === shiftId ? { ...r, ...body } : r));
    try {
      const res = await fetch(`/api/field/lit-drops/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...body }),
      });
      if (!res.ok) {
        setShifts(prev);
        toast.error("Failed to update run");
      }
    } catch {
      setShifts(prev);
      toast.error("Network error");
    }
  }

  function startCompleting(shift: LitDropRow) {
    const items = parseMaterials(shift.materialsJson);
    setCompleting({
      id: shift.id,
      note: "",
      usedQtys: Object.fromEntries(items.map((_, i) => [i, 0])),
    });
  }

  async function confirmComplete(shift: LitDropRow) {
    if (!completing) return;
    const items = parseMaterials(shift.materialsJson);
    const updatedItems = items.map((item, i) => ({
      ...item,
      used: completing.usedQtys[i] ?? 0,
    }));
    const updatedMaterials = shift.materialsJson
      ? { ...shift.materialsJson, items: updatedItems, completedAt: new Date().toISOString() }
      : { items: updatedItems, completedAt: new Date().toISOString() };

    await patchShift(shift.id, {
      status: "completed",
      ...(completing.note.trim() ? { notes: completing.note.trim() } : {}),
      ...(items.length > 0 ? { materialsJson: updatedMaterials } : {}),
    });
    setCompleting(null);
    toast.success("Run marked complete");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <FeatureGuide
        featureKey="field-lit-drops"
        title="What is a Lit Drop?"
        description="A literature drop (lit drop) is when volunteers deliver campaign materials — brochures, flyers, door hangers — to households without knocking. Faster than canvassing, ideal for reaching high-density areas quickly."
        bullets={[
          "Create a lit drop program and assign routes to teams",
          "Track which streets have been covered and by whom",
          "Useful for blanketing an area before a major canvass push",
        ]}
      />
      <PageHeader
        title="Literature Drops"
        description={`Manage lit drop runs for ${campaignName}`}
        actions={
          <Button onClick={() => setShowDrawer(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lit Drop Run
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={stats.total} icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Active" value={stats.active} icon={<Radio className="h-5 w-5" />} color="blue" />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard label="Doors Hit" value={stats.totalDeliveries} icon={<BookOpen className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="runs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="runs">Runs ({shifts.length})</TabsTrigger>
          <TabsTrigger value="programs">Programs ({programs.length})</TabsTrigger>
        </TabsList>

        {/* ── Runs Tab ───────────────────────────────────────────────── */}
        <TabsContent value="runs">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search runs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FieldShiftStatus | "all")}
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No lit drop runs"
              description="Create your first literature drop run to start tracking delivery."
              action={<Button onClick={() => setShowDrawer(true)}><Plus className="h-4 w-4 mr-2" />New Run</Button>}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((shift) => {
                const cfg = STATUS_CONFIG[shift.status];
                const isExpanded = expandedId === shift.id;
                const isCompleting = completing?.id === shift.id;
                const materials = parseMaterials(shift.materialsJson);

                return (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardContent className="p-0">
                        {/* ── Run header — click to expand ─────────── */}
                        <button
                          className="w-full text-left p-4"
                          onClick={() => setExpandedId(isExpanded ? null : shift.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{shift.name}</span>
                                <Badge variant={cfg.variant} className="flex items-center gap-1 shrink-0">
                                  {cfg.icon}{cfg.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(shift.scheduledDate).toLocaleDateString("en-CA")}
                                  {" "}
                                  {shift.startTime}–{shift.endTime}
                                </span>
                                {shift.ward && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Ward {shift.ward}
                                    {shift.pollNumber ? ` · Poll ${shift.pollNumber}` : ""}
                                  </span>
                                )}
                                {shift.fieldProgram && (
                                  <span className="flex items-center gap-1">
                                    <Layers className="h-3 w-3" />
                                    {shift.fieldProgram.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {shift._count.assignments} assigned
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {shift._count.attempts} stops recorded
                                </span>
                                {shift.leadUser && (
                                  <span>Lead: {shift.leadUser.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-muted-foreground">
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />
                              }
                            </div>
                          </div>
                        </button>

                        {/* ── Expanded detail panel ─────────────────── */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              className="overflow-hidden border-t"
                            >
                              <div className="p-4 space-y-3 bg-muted/20">

                                {/* Meeting point */}
                                {(shift.meetingPoint || shift.meetingAddress) && (
                                  <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                    <div>
                                      {shift.meetingPoint && (
                                        <p className="font-medium text-sm">{shift.meetingPoint}</p>
                                      )}
                                      {shift.meetingAddress && (
                                        <p className="text-xs text-muted-foreground">{shift.meetingAddress}</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Route + Turf */}
                                {(shift.route || shift.turf) && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Route className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {shift.route && (
                                        <span className="font-medium text-[#1D9E75]">{shift.route.name}</span>
                                      )}
                                      {shift.turf && (
                                        <span className="text-xs text-muted-foreground">Turf: {shift.turf.name}</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Materials */}
                                {materials.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Materials</p>
                                      <div className="space-y-1">
                                        {materials.map((item, i) => {
                                          const used = (shift.materialsJson?.items as Array<MaterialItem & { used?: number }>)?.[i]?.used;
                                          return (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                              <span>{item.name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {item.qty > 0 && `×${item.qty}`}
                                                {used !== undefined && used > 0 && ` · ${used} used`}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Notes */}
                                {shift.notes && (
                                  <p className="text-xs text-muted-foreground border-t pt-2">{shift.notes}</p>
                                )}

                                {/* Action buttons */}
                                {!isCompleting && (
                                  <div className="flex items-center gap-2 pt-1 border-t">
                                    {shift.status === "draft" && (
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void patchShift(shift.id, { status: "open" }); }}>
                                        Open for Volunteers
                                      </Button>
                                    )}
                                    {shift.status === "open" && (
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void patchShift(shift.id, { status: "in_progress" }); }}>
                                        Start Run
                                      </Button>
                                    )}
                                    {shift.status === "in_progress" && (
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startCompleting(shift); }}>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        Mark Complete
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Completion confirm panel */}
                                {isCompleting && completing && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="border rounded-lg p-3 space-y-3 bg-background"
                                  >
                                    <p className="text-sm font-medium">Confirm completion</p>

                                    {materials.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Units delivered per item</p>
                                        {materials.map((item, i) => (
                                          <div key={i} className="flex items-center gap-3">
                                            <span className="text-sm flex-1">{item.name}</span>
                                            <Input
                                              type="number"
                                              min={0}
                                              max={item.qty || undefined}
                                              placeholder="0"
                                              value={completing.usedQtys[i] || ""}
                                              onChange={(e) => setCompleting((c) =>
                                                c ? { ...c, usedQtys: { ...c.usedQtys, [i]: Number(e.target.value) } } : c
                                              )}
                                              className="w-24"
                                            />
                                            <span className="text-xs text-muted-foreground w-12">
                                              {item.qty > 0 ? `/ ${item.qty}` : ""}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <Textarea
                                      placeholder="Completion notes (doors covered, issues, remaining materials...)"
                                      rows={2}
                                      value={completing.note}
                                      onChange={(e) => setCompleting((c) => c ? { ...c, note: e.target.value } : c)}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCompleting(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => void confirmComplete(shift)}>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        Confirm Complete
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Programs Tab ───────────────────────────────────────────── */}
        <TabsContent value="programs">
          {programs.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              title="No lit drop programs"
              description="Programs group multiple lit drop runs under one campaign objective. Create your first program when you schedule a lit drop run."
              action={
                <Button onClick={() => { setActiveTab("runs"); setShowDrawer(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Schedule a Lit Drop Run
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {programs.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Status: {p.status}
                        {p.goalDoors ? ` · Goal: ${p.goalDoors} doors` : ""}
                      </p>
                    </div>
                    <Badge variant="info">Lit Drop</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create Drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">New Lit Drop Run</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowDrawer(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <FormField label="Run Name *">
                    <Input
                      placeholder="e.g. Ward 20 Saturday Morning Drop"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-4">
                    <FormField label="Date *">
                      <Input
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                        required
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Start Time *">
                        <Input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                          required
                        />
                      </FormField>
                      <FormField label="End Time *">
                        <Input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                          required
                        />
                      </FormField>
                    </div>
                  </div>

                  <FormField label="Program">
                    <Select
                      value={form.createProgram ? "__new__" : (form.fieldProgramId || "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__new__") {
                          setForm((f) => ({ ...f, createProgram: true, fieldProgramId: "" }));
                        } else {
                          setForm((f) => ({ ...f, createProgram: false, fieldProgramId: v }));
                        }
                      }}
                    >
                      <option value="">No program</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="__new__">+ Create new program</option>
                    </Select>
                  </FormField>

                  {form.createProgram && (
                    <FormField label="New Program Name">
                      <Input
                        placeholder="e.g. Spring Lit Drop Campaign"
                        value={form.programName}
                        onChange={(e) => setForm((f) => ({ ...f, programName: e.target.value }))}
                      />
                    </FormField>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Ward">
                      <Input
                        placeholder="20"
                        value={form.ward}
                        onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Poll">
                      <Input
                        placeholder="42"
                        value={form.pollNumber}
                        onChange={(e) => setForm((f) => ({ ...f, pollNumber: e.target.value }))}
                      />
                    </FormField>
                  </div>

                  <FormField label="Meeting Point">
                    <Input
                      placeholder="Corner of Main & King"
                      value={form.meetingPoint}
                      onChange={(e) => setForm((f) => ({ ...f, meetingPoint: e.target.value }))}
                    />
                  </FormField>

                  <FormField label="Meeting Address">
                    <Input
                      placeholder="123 Main Street"
                      value={form.meetingAddress}
                      onChange={(e) => setForm((f) => ({ ...f, meetingAddress: e.target.value }))}
                    />
                  </FormField>

                  <FormField label="Max Volunteers">
                    <Input
                      type="number"
                      min={1}
                      placeholder="10"
                      value={form.maxCapacity}
                      onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                    />
                  </FormField>

                  {/* Structured materials list */}
                  <FormField label="Materials">
                    <div className="space-y-2">
                      {formItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => setFormItems((prev) =>
                              prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it)
                            )}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Qty"
                            value={item.qty || ""}
                            onChange={(e) => setFormItems((prev) =>
                              prev.map((it, idx) => idx === i ? { ...it, qty: Number(e.target.value) } : it)
                            )}
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormItems((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormItems((prev) => [...prev, { name: "", qty: 0 }])}
                        className="w-full"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Material Item
                      </Button>
                    </div>
                  </FormField>

                  <FormField label="Notes">
                    <Textarea
                      placeholder="Any special instructions..."
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDrawer(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Create Run
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
