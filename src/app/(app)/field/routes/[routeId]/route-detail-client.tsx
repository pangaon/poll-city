"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Lock, LockOpen, CheckCircle2, Clock, PlayCircle,
  Archive, Route, AlertCircle, Zap, Users, Calendar, MapPin,
  BarChart3, UserCheck,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RouteStatus, FieldProgramType, FieldTargetStatus } from "@prisma/client";
import type { CanvasserPin } from "@/components/maps/turf-map";

const RouteGpsMap = dynamic(
  () => import("@/components/maps/turf-map"),
  { ssr: false, loading: () => <div className="h-56 bg-gray-100 rounded-lg animate-pulse" /> },
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface OutcomeRow { outcome: string; count: number; isContact: boolean }

interface GpsPoint {
  lat: number;
  lng: number;
  attemptedAt: string;
  canvasserId: string;
  canvasserName: string;
}

interface ShiftAssignment {
  id: string;
  status: string;
  checkedInAt: string | null;
  user: { id: string; name: string | null; email: string } | null;
}

interface ShiftRow {
  id: string;
  name: string;
  shiftType: string;
  status: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  _count: { assignments: number };
  assignments: ShiftAssignment[];
}

interface RouteDetail {
  id: string;
  name: string;
  status: RouteStatus;
  isLocked: boolean;
  ward: string | null;
  pollNumber: string | null;
  oddEven: string;
  estimatedMinutes: number | null;
  routeDistance: number | null;
  notes: string | null;
  fieldProgram: { id: string; name: string; programType: FieldProgramType } | null;
  turf: { id: string; name: string; ward: string | null } | null;
  _count: { targets: number; shifts: number; attempts: number };
  targetStats: Record<string, number>;
  completionPct: number;
  outcomeBreakdown: OutcomeRow[];
  gpsTrail: GpsPoint[];
  shifts: ShiftRow[];
}

interface TargetRow {
  id: string;
  sortOrder: number;
  status: FieldTargetStatus;
  priority: string;
  notes: string | null;
  contact: {
    id: string;
    name: string | null;
    address: string | null;
    unit: string | null;
    poll: string | null;
    supportLevel: string | null;
    doNotContact: boolean;
    accessibilityFlag: boolean;
    skipHouse: boolean;
  } | null;
  lastAttempt: { id: string; outcome: string; attemptedAt: string; outcomeNotes: string | null } | null;
}

interface Props {
  routeId: string;
  campaignId: string;
  campaignName: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft:       { label: "Draft",       variant: "default"  },
  published:   { label: "Published",   variant: "info"     },
  assigned:    { label: "Assigned",    variant: "info"     },
  in_progress: { label: "In Progress", variant: "warning"  },
  completed:   { label: "Completed",   variant: "success"  },
  locked:      { label: "Locked",      variant: "danger"   },
  archived:    { label: "Archived",    variant: "default"  },
};

const TARGET_STATUS_CONFIG: Record<FieldTargetStatus, { label: string; color: string }> = {
  pending:      { label: "Pending",      color: "text-gray-500 bg-gray-100"       },
  in_progress:  { label: "In Progress",  color: "text-blue-600 bg-blue-50"        },
  contacted:    { label: "Contacted",    color: "text-blue-700 bg-blue-100"       },
  no_answer:    { label: "No Answer",    color: "text-gray-600 bg-gray-100"       },
  not_home:     { label: "Not Home",     color: "text-gray-600 bg-gray-100"       },
  refused:      { label: "Refused",      color: "text-red-700 bg-red-100"         },
  moved:        { label: "Moved",        color: "text-amber-700 bg-amber-100"     },
  inaccessible: { label: "No Access",    color: "text-orange-700 bg-orange-100"   },
  revisit:      { label: "Revisit",      color: "text-purple-700 bg-purple-100"   },
  complete:     { label: "Complete",     color: "text-emerald-700 bg-emerald-100" },
};

const SUPPORT_LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  strong_support: { label: "Strong",     color: "text-emerald-700 bg-emerald-100" },
  support:        { label: "Support",    color: "text-blue-700 bg-blue-100"       },
  undecided:      { label: "Undecided",  color: "text-gray-600 bg-gray-100"       },
  oppose:         { label: "Oppose",     color: "text-orange-700 bg-orange-100"   },
  strong_oppose:  { label: "Strong Opp", color: "text-red-700 bg-red-100"        },
};

const OUTCOME_COLOR: Record<string, string> = {
  contacted:          "#1D9E75",
  supporter:          "#0A2342",
  undecided:          "#6366f1",
  volunteer_interest: "#EF9F27",
  donor_interest:     "#f59e0b",
  sign_requested:     "#14b8a6",
  follow_up:          "#8b5cf6",
  no_answer:          "#9ca3af",
  not_home:           "#d1d5db",
  refused:            "#E24B4A",
  hostile:            "#dc2626",
  moved:              "#6b7280",
  bad_data:           "#6b7280",
  inaccessible:       "#6b7280",
};

const OUTCOME_LABEL: Record<string, string> = {
  contacted:          "Contacted",
  supporter:          "Supporter",
  undecided:          "Undecided",
  volunteer_interest: "Volunteer Interest",
  donor_interest:     "Donor Interest",
  sign_requested:     "Sign Requested",
  follow_up:          "Follow-Up",
  no_answer:          "No Answer",
  not_home:           "Not Home",
  refused:            "Refused",
  hostile:            "Hostile",
  moved:              "Moved",
  bad_data:           "Bad Data",
  inaccessible:       "Inaccessible",
};

const NEXT_STATUS: Partial<Record<RouteStatus, { status: RouteStatus; label: string }>> = {
  draft:       { status: "published",   label: "Publish"  },
  published:   { status: "assigned",    label: "Assign"   },
  assigned:    { status: "in_progress", label: "Start"    },
  in_progress: { status: "completed",   label: "Complete" },
  completed:   { status: "archived",    label: "Archive"  },
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function completionColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60)  return "bg-amber-400";
  if (pct > 0)    return "bg-blue-500";
  return "bg-gray-200";
}

// ── Outcome Chart ─────────────────────────────────────────────────────────────

function OutcomeChart({ breakdown }: { breakdown: OutcomeRow[] }) {
  const total = breakdown.reduce((s, r) => s + r.count, 0);
  return (
    <div className="space-y-2">
      {breakdown.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        const color = OUTCOME_COLOR[row.outcome] ?? "#9ca3af";
        return (
          <div key={row.outcome} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{OUTCOME_LABEL[row.outcome] ?? row.outcome}</span>
              <span className="font-medium text-gray-700">{row.count.toLocaleString()} ({pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RouteDetailClient({ routeId, campaignId, campaignName }: Props) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [updatingTarget, setUpdatingTarget] = useState<string | null>(null);

  const loadRoute = useCallback(async () => {
    setLoading(true);
    try {
      const [routeRes, targetsRes] = await Promise.all([
        fetch(`/api/field/routes/${routeId}?campaignId=${campaignId}`),
        fetch(`/api/field/routes/${routeId}/targets?campaignId=${campaignId}`),
      ]);
      const [routeJson, targetsJson] = await Promise.all([
        routeRes.json() as Promise<{ data: RouteDetail }>,
        targetsRes.json() as Promise<{ data: TargetRow[] }>,
      ]);
      if (!routeRes.ok) throw new Error((routeJson as unknown as { error: string }).error ?? "Failed to load route");
      setRoute(routeJson.data);
      setTargets(targetsJson.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load route");
    } finally {
      setLoading(false);
    }
  }, [routeId, campaignId]);

  useEffect(() => { void loadRoute(); }, [loadRoute]);

  async function handleAdvanceStatus() {
    if (!route) return;
    const next = NEXT_STATUS[route.status];
    if (!next) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/field/routes/${routeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status: next.status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const json = await res.json() as { data: RouteDetail };
      setRoute((prev) => prev ? { ...prev, status: json.data.status } : prev);
      toast.success(`Route marked as ${ROUTE_STATUS_CONFIG[next.status].label}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleToggleLock() {
    if (!route) return;
    setLocking(true);
    try {
      const res = await fetch(`/api/field/routes/${routeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, isLocked: !route.isLocked }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json() as { data: RouteDetail };
      setRoute((prev) => prev ? { ...prev, isLocked: json.data.isLocked } : prev);
      toast.success(json.data.isLocked ? "Route locked" : "Route unlocked");
    } catch {
      toast.error("Failed to toggle lock");
    } finally {
      setLocking(false);
    }
  }

  async function handleTargetStatus(target: TargetRow, status: FieldTargetStatus) {
    setTargets((prev) => prev.map((t) => t.id === target.id ? { ...t, status } : t));
    setUpdatingTarget(target.id);
    try {
      const res = await fetch(`/api/field/routes/${routeId}/targets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, targetId: target.id, status }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setTargets((prev) => prev.map((t) => t.id === target.id ? { ...t, status: target.status } : t));
      toast.error("Failed to update target");
    } finally {
      setUpdatingTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-6 text-center text-gray-500">Route not found.</div>
    );
  }

  const statusCfg = ROUTE_STATUS_CONFIG[route.status];
  const nextAction = NEXT_STATUS[route.status];
  const done = (route.targetStats["contacted"] ?? 0) +
    (route.targetStats["refused"] ?? 0) +
    (route.targetStats["moved"] ?? 0) +
    (route.targetStats["inaccessible"] ?? 0) +
    (route.targetStats["complete"] ?? 0) +
    (route.targetStats["no_answer"] ?? 0) +
    (route.targetStats["not_home"] ?? 0) +
    (route.targetStats["revisit"] ?? 0) +
    (route.targetStats["in_progress"] ?? 0);
  const total = Object.values(route.targetStats).reduce((a, b) => a + b, 0);

  const totalAttempts = route._count.attempts;
  const contactedCount = route.outcomeBreakdown
    .filter((r) => r.isContact)
    .reduce((s, r) => s + r.count, 0);
  const supporterCount = route.outcomeBreakdown
    .find((r) => r.outcome === "supporter")?.count ?? 0;
  const contactRate = totalAttempts > 0 ? Math.round((contactedCount / totalAttempts) * 100) : 0;

  const gpsCanvassers: CanvasserPin[] = route.gpsTrail.map((g) => ({
    userId: g.canvasserId,
    name: g.canvasserName,
    lat: g.lat,
    lng: g.lng,
    updatedAt: g.attemptedAt,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/field/routes" className="mt-0.5 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{route.name}</h1>
            {route.isLocked && <Lock className="h-4 w-4 text-red-400" />}
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            {route.fieldProgram && (
              <Badge variant="default">{route.fieldProgram.name}</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {campaignName}
            {route.ward && ` · ${route.ward}`}
            {route.pollNumber && ` · Poll ${route.pollNumber}`}
            {route.turf && ` · ${route.turf.name}`}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Doors",        value: total,            icon: <Route className="h-4 w-4" />,     color: "#0A2342" },
          { label: "Attempts",     value: totalAttempts,    icon: <Zap className="h-4 w-4" />,       color: "#6366f1" },
          { label: "Contacts",     value: contactedCount,   icon: <UserCheck className="h-4 w-4" />, color: "#1D9E75" },
          { label: "Supporters",   value: supporterCount,   icon: <CheckCircle2 className="h-4 w-4" />, color: "#EF9F27" },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <span style={{ color }}>{icon}</span>
              <div>
                <p className="text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Route className="h-4 w-4 text-gray-400" />
              {total} door{total !== 1 ? "s" : ""}
              {route.estimatedMinutes && (
                <span className="text-gray-400 ml-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />~{route.estimatedMinutes} min
                </span>
              )}
              {route.routeDistance && (
                <span className="text-gray-400 ml-2">{route.routeDistance} km</span>
              )}
            </span>
            <span className="font-semibold text-gray-900">{route.completionPct}% complete</span>
          </div>
          {total > 0 && (
            <>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${route.completionPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${completionColor(route.completionPct)}`}
                />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500 flex-wrap">
                {Object.entries(route.targetStats).map(([status, count]) => {
                  if (count === 0) return null;
                  const cfg = TARGET_STATUS_CONFIG[status as FieldTargetStatus];
                  if (!cfg) return null;
                  return (
                    <span key={status}>
                      <span className={cn("inline-block rounded-full px-1.5 py-0.5 font-medium mr-1", cfg.color)}>
                        {cfg.label}
                      </span>
                      {count}
                    </span>
                  );
                })}
              </div>
              {totalAttempts > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center border-t border-gray-100 pt-3">
                  {[
                    { label: "Contact Rate", value: `${contactRate}%` },
                    { label: "Shifts Used",  value: route._count.shifts },
                    { label: "Odd/Even",     value: route.oddEven === "all" ? "All" : route.oddEven === "odd" ? "Odd" : "Even" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-sm font-semibold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action bar */}
      {route.status !== "archived" && (
        <div className="flex items-center gap-3 flex-wrap">
          {nextAction && (
            <Button
              onClick={handleAdvanceStatus}
              loading={advancing}
              disabled={route.isLocked && route.status !== "completed"}
            >
              {route.status === "in_progress" && <CheckCircle2 className="h-4 w-4" />}
              {route.status === "draft" && <PlayCircle className="h-4 w-4" />}
              {route.status === "completed" && <Archive className="h-4 w-4" />}
              {nextAction.label}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleToggleLock}
            loading={locking}
            className={cn(
              route.isLocked
                ? "border-red-300 text-red-600 hover:bg-red-50"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            {route.isLocked ? (
              <><LockOpen className="h-4 w-4" /> Unlock</>
            ) : (
              <><Lock className="h-4 w-4" /> Lock Route</>
            )}
          </Button>
          {route.isLocked && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Locked — only notes and status can change
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {route.notes && (
        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          {route.notes}
        </div>
      )}

      {/* GPS Trail Map */}
      {gpsCanvassers.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              GPS Trail ({gpsCanvassers.length} recorded point{gpsCanvassers.length !== 1 ? "s" : ""})
            </h2>
            <RouteGpsMap canvassers={gpsCanvassers} showRoute={false} height="280px" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              GPS Trail
            </h2>
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <MapPin className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No GPS data recorded for this route yet</p>
              <p className="text-xs mt-1 text-gray-400">GPS trail appears when canvassers submit attempts with location enabled</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outcome breakdown */}
      {route.outcomeBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                Outcome Breakdown
              </h2>
              <span className="text-xs text-gray-400">{totalAttempts.toLocaleString()} total attempts</span>
            </div>
            <OutcomeChart breakdown={route.outcomeBreakdown} />
          </CardContent>
        </Card>
      )}

      {/* Assigned Shifts */}
      {route.shifts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            Assigned Shifts ({route.shifts.length})
          </h2>
          <div className="space-y-2">
            {route.shifts.map((shift) => {
              const checkedIn = shift.assignments.filter((a) => a.checkedInAt).length;
              return (
                <motion.div key={shift.id} layout transition={SPRING}>
                  <Card>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{shift.name}</span>
                            <Badge variant={shift.status === "active" ? "success" : shift.status === "completed" ? "default" : "info"}>
                              {shift.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(shift.scheduledDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                              {" "}{shift.startTime}–{shift.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {shift._count.assignments} assigned
                              {checkedIn > 0 && `, ${checkedIn} checked in`}
                            </span>
                          </div>
                          {shift.assignments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {shift.assignments.slice(0, 8).map((a) => (
                                <span
                                  key={a.id}
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    a.checkedInAt ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600",
                                  )}
                                >
                                  {a.user?.name ?? a.user?.email ?? "Unknown"}
                                </span>
                              ))}
                              {shift.assignments.length > 8 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                                  +{shift.assignments.length - 8} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Targets list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Walk List ({total}) — {done} contacted or resolved
        </h2>

        {targets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No targets assigned to this route yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {targets.map((target) => {
                const tCfg = TARGET_STATUS_CONFIG[target.status];
                const contact = target.contact;
                const supportCfg = contact?.supportLevel
                  ? SUPPORT_LEVEL_CONFIG[contact.supportLevel]
                  : null;

                return (
                  <motion.div
                    key={target.id}
                    layout
                    transition={SPRING}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-white hover:border-gray-300 transition-colors",
                      target.status !== "pending" ? "border-gray-100" : "border-gray-200",
                      contact?.doNotContact ? "opacity-60" : "",
                    )}
                  >
                    <span className="text-xs font-mono text-gray-400 w-6 flex-shrink-0 pt-0.5">
                      {target.sortOrder > 0 ? `#${target.sortOrder}` : "—"}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {contact?.name ?? "Unknown contact"}
                        </span>
                        {contact?.doNotContact && (
                          <span className="text-xs text-red-500 font-medium">DNC</span>
                        )}
                        {contact?.accessibilityFlag && (
                          <span className="text-xs text-blue-500">♿</span>
                        )}
                        {supportCfg && (
                          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", supportCfg.color)}>
                            {supportCfg.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[contact?.address, contact?.unit].filter(Boolean).join(" ")}
                      </p>
                      {target.lastAttempt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last: {target.lastAttempt.outcome.replace(/_/g, " ")}
                          {target.lastAttempt.outcomeNotes && ` — ${target.lastAttempt.outcomeNotes}`}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <select
                        value={target.status}
                        onChange={(e) =>
                          handleTargetStatus(target, e.target.value as FieldTargetStatus)
                        }
                        disabled={updatingTarget === target.id || route.isLocked}
                        className={cn(
                          "text-xs rounded-full px-2 py-1 border-0 font-medium focus:ring-1 focus:ring-blue-400 cursor-pointer",
                          tCfg.color,
                          (updatingTarget === target.id || route.isLocked) ? "opacity-50 cursor-not-allowed" : "",
                        )}
                      >
                        {Object.entries(TARGET_STATUS_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
