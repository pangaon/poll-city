"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map as MapIcon, Plus, X, Lock, CheckCircle2, Clock,
  AlertCircle, PlayCircle, Archive, ChevronRight,
  BarChart3, Route,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui";
import { toast } from "sonner";
import Link from "next/link";
import type { RouteStatus, FieldProgramType } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteRow {
  id: string;
  name: string;
  status: RouteStatus;
  ward: string | null;
  pollNumber: string | null;
  totalStops: number;
  totalDoors: number;
  estimatedMinutes: number | null;
  isLocked: boolean;
  notes: string | null;
  fieldProgram: { id: string; name: string; programType: FieldProgramType } | null;
  turf: { id: string; name: string } | null;
  _count: { targets: number; shifts: number; attempts: number };
}

interface Program {
  id: string;
  name: string;
  programType: FieldProgramType;
}

interface Turf {
  id: string;
  name: string;
  ward: string | null;
}

interface DensityRow {
  poll: string;
  contactCount: number;
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialRoutes: RouteRow[];
  programs: Program[];
  turfs: Turf[];
  density: DensityRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RouteStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "default", icon: <Clock className="h-3 w-3" /> },
  published: { label: "Published", variant: "info", icon: <CheckCircle2 className="h-3 w-3" /> },
  assigned: { label: "Assigned", variant: "info", icon: <CheckCircle2 className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "warning", icon: <PlayCircle className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  locked: { label: "Locked", variant: "danger", icon: <Lock className="h-3 w-3" /> },
  archived: { label: "Archived", variant: "default", icon: <Archive className="h-3 w-3" /> },
};

const PROGRAM_TYPE_LABELS: Record<FieldProgramType, string> = {
  canvass: "Canvass",
  lit_drop: "Lit Drop",
  phone_bank: "Phone Bank",
  sign_install: "Sign Install",
  sign_remove: "Sign Removal",
  gotv: "GOTV",
  event_outreach: "Event Outreach",
  advance_vote: "Advance Vote",
  hybrid: "Hybrid",
};

// ── Create Drawer ──────────────────────────────────────────────────────────────

interface CreateForm {
  name: string;
  fieldProgramId: string;
  turfId: string;
  ward: string;
  pollNumber: string;
  oddEven: string;
  estimatedMinutes: string;
  notes: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  fieldProgramId: "",
  turfId: "",
  ward: "",
  pollNumber: "",
  oddEven: "all",
  estimatedMinutes: "",
  notes: "",
};

function CreateDrawer({
  open,
  onClose,
  onCreated,
  campaignId,
  programs,
  turfs,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: RouteRow) => void;
  campaignId: string;
  programs: Program[];
  turfs: Turf[];
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set(key: keyof CreateForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Route name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/field/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name.trim(),
          fieldProgramId: form.fieldProgramId || null,
          turfId: form.turfId || null,
          ward: form.ward || null,
          pollNumber: form.pollNumber || null,
          oddEven: form.oddEven,
          estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create route");
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
              <h2 className="text-lg font-semibold text-gray-900">New Route</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FormField label="Route Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Ward 3 ID Pass #1"
                  autoFocus
                />
              </FormField>

              {programs.length > 0 && (
                <FormField label="Field Program">
                  <Select
                    value={form.fieldProgramId}
                    onChange={(e) => set("fieldProgramId", e.target.value)}
                  >
                    <option value="">— No program —</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({PROGRAM_TYPE_LABELS[p.programType]})
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              {turfs.length > 0 && (
                <FormField label="Turf">
                  <Select
                    value={form.turfId}
                    onChange={(e) => set("turfId", e.target.value)}
                  >
                    <option value="">— No turf —</option>
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}{t.ward ? ` (${t.ward})` : ""}</option>
                    ))}
                  </Select>
                </FormField>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Ward">
                  <Input
                    value={form.ward}
                    onChange={(e) => set("ward", e.target.value)}
                    placeholder="e.g. Ward 3"
                  />
                </FormField>
                <FormField label="Poll Number">
                  <Input
                    value={form.pollNumber}
                    onChange={(e) => set("pollNumber", e.target.value)}
                    placeholder="e.g. 042"
                  />
                </FormField>
              </div>

              <FormField label="Side of Street">
                <Select value={form.oddEven} onChange={(e) => set("oddEven", e.target.value)}>
                  <option value="all">Both sides</option>
                  <option value="odd">Odd only (North/West)</option>
                  <option value="even">Even only (South/East)</option>
                </Select>
              </FormField>

              <FormField label="Estimated Walk Time (minutes)">
                <Input
                  type="number"
                  min="0"
                  value={form.estimatedMinutes}
                  onChange={(e) => set("estimatedMinutes", e.target.value)}
                  placeholder="e.g. 75"
                />
              </FormField>

              <FormField label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any notes about this route..."
                  className="min-h-[60px]"
                />
              </FormField>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="flex-1">
                  Create Route
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Route Card ────────────────────────────────────────────────────────────────

function RouteCard({ route }: { route: RouteRow }) {
  const status = STATUS_CONFIG[route.status];
  const targetCount = route._count.targets;

  function balanceLabel() {
    if (targetCount === 0) return null;
    if (targetCount > 80) return { text: "Oversized", color: "text-red-500" };
    if (targetCount < 40) return { text: "Undersized", color: "text-amber-500" };
    return { text: "Balanced", color: "text-emerald-500" };
  }

  const balance = balanceLabel();

  return (
    <Link href={`/field/routes/${route.id}`}>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <Card className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">{route.name}</span>
                  {route.isLocked && <Lock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                  <Badge variant={status.variant}>
                    <span className="flex items-center gap-1">{status.icon} {status.label}</span>
                  </Badge>
                  {route.fieldProgram && (
                    <Badge variant="default">{route.fieldProgram.name}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                  {route.pollNumber && <span>Poll {route.pollNumber}</span>}
                  {route.ward && <span>{route.ward}</span>}
                  {route.turf && <span className="text-blue-600">{route.turf.name}</span>}
                  <span className="flex items-center gap-1">
                    <Route className="h-3 w-3" />
                    {targetCount} door{targetCount !== 1 ? "s" : ""}
                  </span>
                  {route.estimatedMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{route.estimatedMinutes} min
                    </span>
                  )}
                  {balance && (
                    <span className={`font-medium ${balance.color}`}>{balance.text}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Density View ──────────────────────────────────────────────────────────────

function DensityView({ density, routes }: { density: DensityRow[]; routes: RouteRow[] }) {
  // Count routes per poll
  const routesPerPoll = new Map<string, number>();
  for (const r of routes) {
    if (r.pollNumber) {
      routesPerPoll.set(r.pollNumber, (routesPerPoll.get(r.pollNumber) ?? 0) + 1);
    }
  }

  const maxCount = Math.max(...density.map((d) => d.contactCount), 1);

  if (density.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-10 w-10" />}
        title="No poll data available"
        description="Add contacts with poll numbers to see target density."
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Contacts per poll — use this to prioritize which polls need routes first.
        Polls shown in red have no route assigned yet.
      </p>
      <div className="space-y-2">
        {density.slice(0, 50).map((d) => {
          const pct = Math.round((d.contactCount / maxCount) * 100);
          const hasRoute = routesPerPoll.has(d.poll);
          return (
            <div key={d.poll} className="flex items-center gap-3">
              <span className={`text-xs font-mono w-20 flex-shrink-0 ${hasRoute ? "text-gray-600" : "text-red-500 font-semibold"}`}>
                Poll {d.poll}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${hasRoute ? "bg-blue-400" : "bg-red-400"}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">
                {d.contactCount.toLocaleString()} contacts
                {hasRoute && <span className="text-emerald-500 ml-1">✓</span>}
              </span>
            </div>
          );
        })}
      </div>
      {density.length > 50 && (
        <p className="text-xs text-gray-400 mt-3">Showing top 50 of {density.length} polls</p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STATUS_ORDER: RouteStatus[] = [
  "in_progress", "assigned", "published", "draft", "locked", "completed", "archived",
];

export default function RoutesClient({
  campaignId, campaignName, initialRoutes, programs, turfs, density,
}: Props) {
  const [routes, setRoutes] = useState<RouteRow[]>(initialRoutes);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  function handleCreated(r: RouteRow) {
    setRoutes((prev) => [r, ...prev]);
  }

  const filtered = routes.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchProgram = programFilter === "all" || r.fieldProgram?.id === programFilter;
    return matchStatus && matchProgram;
  });

  // Sort by status priority
  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    return ai - bi || a.name.localeCompare(b.name);
  });

  const inProgressCount = routes.filter((r) => r.status === "in_progress").length;
  const overdueCount = routes.filter((r) => r._count.targets > 80).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="Field Routes"
        description={`${campaignName} · ${routes.length} route${routes.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            New Route
          </Button>
        }
      />

      {/* Alert: oversized routes */}
      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {overdueCount} route{overdueCount !== 1 ? "s are" : " is"} oversized (&gt;80 doors).
            Run optimize to get split recommendations.
          </span>
        </motion.div>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <Route className="h-4 w-4 mr-1.5" />
            Route Board
          </TabsTrigger>
          <TabsTrigger value="density">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Target Density
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {(["all", ...STATUS_ORDER.filter((s) => routes.some((r) => r.status === s))] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    statusFilter === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_CONFIG[s as RouteStatus].label}
                </button>
              ))}
            </div>
            {programs.length > 1 && (
              <Select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                wrapperClassName="w-48"
              >
                <option value="all">All programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            )}
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              icon={<MapIcon className="h-10 w-10" />}
              title={routes.length === 0 ? "No routes yet" : "No routes match this filter"}
              description={
                routes.length === 0
                  ? "Create your first route to start assigning canvassers to specific areas. Aim for 40–80 doors per route."
                  : undefined
              }
              action={
                routes.length === 0 ? (
                  <Button onClick={() => setDrawerOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create First Route
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {sorted.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <RouteCard route={r} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="density">
          <DensityView density={density} routes={routes} />
        </TabsContent>
      </Tabs>

      <CreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        campaignId={campaignId}
        programs={programs}
        turfs={turfs}
      />
    </div>
  );
}
