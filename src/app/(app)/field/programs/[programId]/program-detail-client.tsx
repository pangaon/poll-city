"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Pause, PlayCircle, Archive,
  Route, Target, Users, BarChart3, Calendar, Lock, TrendingUp,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
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

interface OutcomeRow { outcome: string; count: number; isContact: boolean }
interface DailyStat  { date: string; attempts: number; contacts: number }
interface Canvasser  { id: string; name: string | null; email: string; attempts: number }
interface RouteCount { routeId: string; count: number }

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
  outcomeBreakdown: OutcomeRow[];
  dailyStats: DailyStat[];
  canvasserRoster: Canvasser[];
  routeAttemptCounts: RouteCount[];
}

interface Props {
  programId: string;
  campaignId: string;
  campaignName: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_TYPE_LABELS: Record<FieldProgramType, string> = {
  canvass: "Door Canvass", lit_drop: "Literature Drop", phone_bank: "Phone Bank",
  sign_install: "Sign Install", sign_remove: "Sign Removal", gotv: "GOTV",
  event_outreach: "Event Outreach", advance_vote: "Advance Vote", hybrid: "Hybrid",
};

const STATUS_CONFIG: Record<FieldProgramStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  planning:  { label: "Planning",  variant: "info"    },
  active:    { label: "Active",    variant: "success" },
  paused:    { label: "Paused",    variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  archived:  { label: "Archived",  variant: "default" },
};

const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", variant: "default" }, published: { label: "Published", variant: "info" },
  assigned: { label: "Assigned", variant: "info" }, in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" }, locked: { label: "Locked", variant: "danger" },
  archived: { label: "Archived", variant: "default" },
};

const OUTCOME_LABELS: Record<string, string> = {
  contacted: "Contacted", no_answer: "No Answer", not_home: "Not Home",
  moved: "Moved", refused: "Refused", hostile: "Hostile",
  supporter: "Supporter", undecided: "Undecided", opposition: "Opposition",
  volunteer_interest: "Volunteer Interest", donor_interest: "Donor Interest",
  sign_requested: "Sign Request", follow_up: "Follow Up",
  bad_data: "Bad Data", inaccessible: "Inaccessible", do_not_return: "Do Not Return",
};

const OUTCOME_COLOURS: Record<string, string> = {
  contacted: "bg-blue-500", supporter: "bg-emerald-500", volunteer_interest: "bg-purple-500",
  donor_interest: "bg-amber-500", sign_requested: "bg-teal-500", undecided: "bg-sky-400",
  follow_up: "bg-indigo-400", no_answer: "bg-gray-300", not_home: "bg-gray-300",
  refused: "bg-red-400", hostile: "bg-red-600", opposition: "bg-orange-500",
  moved: "bg-gray-400", bad_data: "bg-gray-400", inaccessible: "bg-gray-400", do_not_return: "bg-red-300",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
type Tab = "overview" | "analytics" | "team";

// ── Goal Bar ──────────────────────────────────────────────────────────────────

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
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ program }: { program: ProgramDetail }) {
  const contactedCount = program.outcomeBreakdown
    .filter((o) => o.isContact).reduce((s, o) => s + o.count, 0);
  const supporterCount = program.outcomeBreakdown
    .find((o) => o.outcome === "supporter")?.count ?? 0;
  const completedRoutes = program.routes.filter((r) => r.status === "completed").length;
  const hasGoals = program.goalDoors || program.goalContacts || program.goalSupporters;

  return (
    <div className="space-y-5">
      {hasGoals && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Goal Progress</h3>
            {program.goalDoors && (
              <GoalBar label="Doors Knocked" actual={program._count.attempts} goal={program.goalDoors} />
            )}
            {program.goalContacts && (
              <GoalBar label="Contacts Made" actual={contactedCount} goal={program.goalContacts} />
            )}
            {program.goalSupporters && (
              <GoalBar label="Supporters Identified" actual={supporterCount} goal={program.goalSupporters} />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {([
          { label: "Routes",     value: program._count.routes,  sub: `${completedRoutes} done` },
          { label: "Knocked",    value: program._count.attempts },
          { label: "Contacted",  value: contactedCount },
          { label: "Supporters", value: supporterCount },
        ] as { label: string; value: number; sub?: string }[]).map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Routes ({program._count.routes})</h3>
          <Link href="/field/routes" className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
            Manage routes →
          </Link>
        </div>
        {program.routes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Route className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No routes assigned to this program yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create routes in the Routes tab and link them here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {program.routes.map((route) => {
              const rCfg = ROUTE_STATUS_CONFIG[route.status];
              const knocked = program.routeAttemptCounts.find((r) => r.routeId === route.id)?.count ?? 0;
              return (
                <motion.div key={route.id} layout transition={SPRING}>
                  <Link href={`/field/routes/${route.id}`}>
                    <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{route.name}</span>
                              {route.isLocked && <Lock className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                              <Badge variant={rCfg.variant}>{rCfg.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                              {route.pollNumber && <span>Poll {route.pollNumber}</span>}
                              {route.ward && <span>{route.ward}</span>}
                              <span>{route._count.targets} doors</span>
                              {knocked > 0 && (
                                <span className="text-blue-600 font-medium">{knocked} knocked</span>
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

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ program }: { program: ProgramDetail }) {
  const totalAttempts = program._count.attempts;
  const maxOutcome = Math.max(...program.outcomeBreakdown.map((o) => o.count), 1);

  const routeActivity = program.routes
    .map((r) => ({
      ...r,
      attempts: program.routeAttemptCounts.find((rc) => rc.routeId === r.id)?.count ?? 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);
  const maxRouteAttempts = Math.max(...routeActivity.map((r) => r.attempts), 1);

  const last14 = program.dailyStats.slice(-14);
  const maxDaily = Math.max(...last14.map((d) => d.attempts), 1);

  const contactedCount = program.outcomeBreakdown
    .filter((o) => o.isContact).reduce((s, o) => s + o.count, 0);
  const supporterCount = program.outcomeBreakdown
    .find((o) => o.outcome === "supporter")?.count ?? 0;

  return (
    <div className="space-y-5">
      {/* Outcome breakdown */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Outcome Breakdown
            <span className="text-gray-400 font-normal ml-2">({totalAttempts.toLocaleString()} total)</span>
          </h3>
          {program.outcomeBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No attempts recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {program.outcomeBreakdown.map(({ outcome, count }) => {
                const pct = Math.round((count / maxOutcome) * 100);
                const barColor = OUTCOME_COLOURS[outcome] ?? "bg-gray-300";
                return (
                  <div key={outcome} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-36 shrink-0 truncate">
                      {OUTCOME_LABELS[outcome] ?? outcome}
                    </span>
                    <div className="flex-1 h-5 rounded bg-gray-50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full ${barColor} rounded`}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-10 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily activity */}
      {last14.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Daily Activity (last 14 days)</h3>
            <div className="flex items-end gap-1" style={{ height: "80px" }}>
              {last14.map((d) => {
                const hPct = Math.max(Math.round((d.attempts / maxDaily) * 100), 4);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end group">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${hPct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="w-full bg-blue-400 rounded-t group-hover:bg-blue-600 transition-colors"
                      style={{ height: `${hPct}%` }}
                      title={`${d.date}: ${d.attempts} doors`}
                    />
                    <span className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route heat map */}
      {routeActivity.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Route Activity</h3>
            <div className="space-y-2">
              {routeActivity.map((r) => {
                const pct = r.attempts > 0 ? Math.round((r.attempts / maxRouteAttempts) * 100) : 0;
                const completion = r._count.targets > 0
                  ? Math.round((r.attempts / r._count.targets) * 100)
                  : 0;
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-40 shrink-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{r.name}</p>
                      {(r.pollNumber || r.ward) && (
                        <p className="text-[10px] text-gray-400">
                          {r.pollNumber ? `Poll ${r.pollNumber}` : r.ward}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 h-4 rounded bg-gray-50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full rounded ${r.attempts > 0 ? "bg-emerald-400" : "bg-gray-100"}`}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-24 text-right shrink-0">
                      {r.attempts > 0
                        ? <>{r.attempts} / {r._count.targets} <span className="text-gray-400">({completion}%)</span></>
                        : <span className="text-gray-300">not started</span>
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary rates */}
      {totalAttempts > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                {
                  label: "Contact Rate",
                  value: `${totalAttempts > 0 ? Math.round((contactedCount / totalAttempts) * 100) : 0}%`,
                  sub: "answered the door",
                },
                {
                  label: "Support Rate",
                  value: `${totalAttempts > 0 ? Math.round((supporterCount / totalAttempts) * 100) : 0}%`,
                  sub: "identified as supporter",
                },
                {
                  label: "Avg / Shift",
                  value: program._count.shifts > 0
                    ? Math.round(totalAttempts / program._count.shifts).toString()
                    : "—",
                  sub: "doors per shift",
                },
              ].map(({ label, value, sub }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab({ program }: { program: ProgramDetail }) {
  if (program.canvasserRoster.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No canvassers have recorded activity yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Assign volunteers to shifts linked to this program to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAttempts = program._count.attempts;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {program.canvasserRoster.length} canvasser{program.canvasserRoster.length !== 1 ? "s" : ""} active
      </p>
      {program.canvasserRoster.map((c, i) => {
        const sharePct = totalAttempts > 0 ? Math.round((c.attempts / totalAttempts) * 100) : 0;
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: i * 0.04 }}
          >
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-700">
                      {(c.name ?? c.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name ?? c.email}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{c.attempts.toLocaleString()} doors</p>
                    <p className="text-xs text-gray-400">{sharePct}% of program</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sharePct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProgramDetailClient({ programId, campaignId, campaignName }: Props) {
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
      const json = await res.json() as { data: { status: FieldProgramStatus; isActive: boolean } };
      setProgram((prev) => prev ? { ...prev, status: json.data.status, isActive: json.data.isActive } : prev);
      toast.success(`Program ${STATUS_CONFIG[status].label.toLowerCase()}`);
    } catch {
      toast.error("Failed to update program status");
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Spinner /></div>;
  }

  if (!program) {
    return <div className="p-6 text-center text-gray-500">Program not found.</div>;
  }

  const statusCfg = STATUS_CONFIG[program.status];

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",  label: "Overview",  icon: <Target className="h-3.5 w-3.5" />    },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "team",      label: "Team",      icon: <Users className="h-3.5 w-3.5" />     },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

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
          {program.description && (
            <p className="text-sm text-gray-600 mt-1">{program.description}</p>
          )}
        </div>
      </div>

      {/* Top stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Routes",   value: program._count.routes,   icon: <Route className="h-4 w-4" />       },
          { label: "Targets",  value: program._count.targets,  icon: <Target className="h-4 w-4" />      },
          { label: "Shifts",   value: program._count.shifts,   icon: <Calendar className="h-4 w-4" />    },
          { label: "Attempts", value: program._count.attempts, icon: <TrendingUp className="h-4 w-4" />  },
        ] as { label: string; value: number; icon: React.ReactNode }[]).map(({ label, value, icon }) => (
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

      {/* Status actions */}
      {program.status !== "archived" && (
        <div className="flex items-center gap-3 flex-wrap">
          {program.status === "planning" && (
            <Button onClick={() => handleStatusChange("active")} loading={transitioning}>
              <PlayCircle className="h-4 w-4" /> Activate Program
            </Button>
          )}
          {program.status === "active" && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange("paused")} loading={transitioning}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <Pause className="h-4 w-4" /> Pause
              </Button>
              <Button variant="outline" onClick={() => handleStatusChange("completed")} loading={transitioning}>
                <CheckCircle2 className="h-4 w-4" /> Mark Complete
              </Button>
            </>
          )}
          {program.status === "paused" && (
            <>
              <Button onClick={() => handleStatusChange("active")} loading={transitioning}>
                <PlayCircle className="h-4 w-4" /> Resume
              </Button>
              <Button variant="outline" onClick={() => handleStatusChange("completed")} loading={transitioning}>
                <CheckCircle2 className="h-4 w-4" /> Mark Complete
              </Button>
            </>
          )}
          {program.status === "completed" && (
            <Button variant="outline" onClick={() => handleStatusChange("archived")} loading={transitioning}>
              <Archive className="h-4 w-4" /> Archive
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={SPRING}
        >
          {activeTab === "overview"  && <OverviewTab  program={program} />}
          {activeTab === "analytics" && <AnalyticsTab program={program} />}
          {activeTab === "team"      && <TeamTab      program={program} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
