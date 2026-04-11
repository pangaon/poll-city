"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Lock, LockOpen, CheckCircle2, Clock, PlayCircle,
  Archive, Route, AlertCircle, Zap,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RouteStatus, FieldProgramType, FieldTargetStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// Status lifecycle: next action for each status
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
    // Optimistic
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
      // Revert
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

      {/* Stats + progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Route className="h-4 w-4 text-gray-400" />
                {total} door{total !== 1 ? "s" : ""}
              </span>
              {route.estimatedMinutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  ~{route.estimatedMinutes} min
                </span>
              )}
              {route.routeDistance && (
                <span>{route.routeDistance} km</span>
              )}
              <span className="font-semibold text-gray-900">{route.completionPct}% done</span>
            </div>
          </div>
          {total > 0 && (
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${route.completionPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${completionColor(route.completionPct)}`}
              />
            </div>
          )}
          {total > 0 && (
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

      {/* Targets list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Doors ({total}) — {done} contacted or resolved
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
                    {/* Order */}
                    <span className="text-xs font-mono text-gray-400 w-6 flex-shrink-0 pt-0.5">
                      {target.sortOrder > 0 ? `#${target.sortOrder}` : "—"}
                    </span>

                    {/* Contact info */}
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

                    {/* Status selector */}
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
