"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Pause, PlayCircle, Archive,
  Route, Target, Users, BarChart3, Calendar, Lock,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FieldProgramStatus, FieldProgramType, RouteStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteRow {
  id: string;
  name: string;
  status: RouteStatus;
  isLocked: boolean;
  totalStops: number;
  estimatedMinutes: number | null;
  pollNumber: string | null;
  ward: string | null;
  _count: { targets: number; shifts: number };
}

interface ProgramDetail {
  id: string;
  name: string;
  programType: FieldProgramType;
  status: FieldProgramStatus;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  goalDoors: number | null;
  goalContacts: number | null;
  goalSupporters: number | null;
  targetWard: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { routes: number; targets: number; shifts: number; attempts: number };
  createdBy: { id: string; name: string | null };
  routes: RouteRow[];
}

interface Props {
  programId: string;
  campaignId: string;
  campaignName: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_TYPE_LABELS: Record<FieldProgramType, string> = {
  canvass:        "Door Canvass",
  lit_drop:       "Literature Drop",
  phone_bank:     "Phone Bank",
  sign_install:   "Sign Install",
  sign_remove:    "Sign Removal",
  gotv:           "GOTV",
  event_outreach: "Event Outreach",
  advance_vote:   "Advance Vote",
  hybrid:         "Hybrid",
};

const STATUS_CONFIG: Record<FieldProgramStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  planning:  { label: "Planning",  variant: "info"    },
  active:    { label: "Active",    variant: "success" },
  paused:    { label: "Paused",    variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  archived:  { label: "Archived",  variant: "default" },
};

const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft:       { label: "Draft",       variant: "default"  },
  published:   { label: "Published",   variant: "info"     },
  assigned:    { label: "Assigned",    variant: "info"     },
  in_progress: { label: "In Progress", variant: "warning"  },
  completed:   { label: "Completed",   variant: "success"  },
  locked:      { label: "Locked",      variant: "danger"   },
  archived:    { label: "Archived",    variant: "default"  },
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Goal progress bar ─────────────────────────────────────────────────────────

function GoalBar({ label, actual, goal }: { label: string; actual: number; goal: number }) {
  const pct = goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-blue-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span className="font-medium">{label}</span>
        <span>
          {actual.toLocaleString()} / {goal.toLocaleString()}
          <span className="text-gray-400 ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProgramDetailClient({ programId, campaignId, campaignName }: Props) {
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const loadProgram = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/field/programs/${programId}?campaignId=${campaignId}`);
      const json = await res.json() as { data: ProgramDetail } | { error: string };
      if (!res.ok) throw new Error((json as { error: string }).error ?? "Failed to load program");
      setProgram((json as { data: ProgramDetail }).data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load program");
    } finally {
      setLoading(false);
    }
  }, [programId, campaignId]);

  useEffect(() => { void loadProgram(); }, [loadProgram]);

  async function handleStatusChange(status: FieldProgramStatus) {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/field/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status, isActive: status === "active" }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const json = await res.json() as { data: ProgramDetail };
      setProgram((prev) => prev ? { ...prev, status: json.data.status, isActive: json.data.isActive } : prev);
      toast.success(`Program ${STATUS_CONFIG[status].label.toLowerCase()}`);
    } catch {
      toast.error("Failed to update program status");
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner />
      </div>
    );
  }

  if (!program) {
    return <div className="p-6 text-center text-gray-500">Program not found.</div>;
  }

  const statusCfg = STATUS_CONFIG[program.status];
  const attsCount = program._count.attempts;
  const routesCount = program._count.routes;

  // Compute "doors knocked" estimate from attempts for goal progress
  const doorsKnocked = attsCount;
  const contacted = 0; // would need a separate query — show route completion instead
  // Show goal bars only when goals exist
  const hasGoals = program.goalDoors || program.goalContacts || program.goalSupporters;

  function formatDate(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/field/programs" className="mt-0.5 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{program.name}</h1>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            <Badge variant="default">{PROGRAM_TYPE_LABELS[program.programType]}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {campaignName}
            {program.targetWard && ` · ${program.targetWard}`}
            {(program.startDate || program.endDate) && (
              <> · {formatDate(program.startDate) ?? "?"} – {formatDate(program.endDate) ?? "ongoing"}</>
            )}
          </p>
          {program.description && (
            <p className="text-sm text-gray-600 mt-1">{program.description}</p>
          )}
        </div>
      </div>

      {/* Status lifecycle actions */}
      {program.status !== "archived" && (
        <div className="flex items-center gap-3 flex-wrap">
          {program.status === "planning" && (
            <Button onClick={() => handleStatusChange("active")} loading={transitioning}>
              <PlayCircle className="h-4 w-4" />
              Activate Program
            </Button>
          )}
          {program.status === "active" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("paused")}
                loading={transitioning}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("completed")}
                loading={transitioning}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </>
          )}
          {program.status === "paused" && (
            <>
              <Button onClick={() => handleStatusChange("active")} loading={transitioning}>
                <PlayCircle className="h-4 w-4" />
                Resume
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("completed")}
                loading={transitioning}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </>
          )}
          {program.status === "completed" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("archived")}
              loading={transitioning}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Routes",   value: routesCount, icon: <Route className="h-4 w-4" />   },
          { label: "Targets",  value: program._count.targets,  icon: <Target className="h-4 w-4" />  },
          { label: "Shifts",   value: program._count.shifts,   icon: <Users className="h-4 w-4" />   },
          { label: "Attempts", value: attsCount, icon: <BarChart3 className="h-4 w-4" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-gray-400">{icon}</span>
              <div>
                <p className="text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Goal progress */}
      {hasGoals && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Goal Progress</h2>
            {program.goalDoors && (
              <GoalBar label="Doors Knocked" actual={doorsKnocked} goal={program.goalDoors} />
            )}
            {program.goalContacts && (
              <GoalBar label="Contacts Made" actual={contacted} goal={program.goalContacts} />
            )}
            {program.goalSupporters && (
              <GoalBar label="Supporters Identified" actual={0} goal={program.goalSupporters} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Routes list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Routes ({routesCount})
          </h2>
          <Link
            href="/field/routes"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Manage routes →
          </Link>
        </div>

        {program.routes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Route className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No routes assigned to this program yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Create routes in the Routes tab and link them to this program.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {program.routes.map((route) => {
              const rCfg = ROUTE_STATUS_CONFIG[route.status];
              return (
                <motion.div key={route.id} layout transition={SPRING}>
                  <Link href={`/field/routes/${route.id}`}>
                    <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {route.name}
                              </span>
                              {route.isLocked && (
                                <Lock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                              )}
                              <Badge variant={rCfg.variant}>{rCfg.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                              {route.pollNumber && <span>Poll {route.pollNumber}</span>}
                              {route.ward && <span>{route.ward}</span>}
                              <span className="flex items-center gap-1">
                                <Route className="h-3 w-3" />
                                {route._count.targets} door{route._count.targets !== 1 ? "s" : ""}
                              </span>
                              {route.estimatedMinutes && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  ~{route.estimatedMinutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
