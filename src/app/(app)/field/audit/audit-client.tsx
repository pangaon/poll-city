"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Shield, Clock, User, ChevronDown, ChevronUp,
  Download, BarChart2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, Input, PageHeader, Select,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FieldAuditAction } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditRow {
  id: string;
  campaignId: string;
  entityType: string;
  entityId: string;
  action: FieldAuditAction;
  oldValueJson: Record<string, unknown> | null;
  newValueJson: Record<string, unknown> | null;
  actorUserId: string | null;
  source: string;
  createdAt: string;
  actor: { id: string; name: string | null } | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  logs: AuditRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<FieldAuditAction, { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }> = {
  created:          { label: "Created",         variant: "info" },
  updated:          { label: "Updated",         variant: "default" },
  deleted:          { label: "Deleted",         variant: "danger" },
  assigned:         { label: "Assigned",        variant: "info" },
  started:          { label: "Started",         variant: "warning" },
  completed:        { label: "Completed",       variant: "success" },
  cancelled:        { label: "Cancelled",       variant: "danger" },
  checked_in:       { label: "Checked In",      variant: "success" },
  checked_out:      { label: "Checked Out",     variant: "default" },
  outcome_recorded: { label: "Outcome",         variant: "success" },
  override:         { label: "Override",        variant: "warning" },
  reassigned:       { label: "Reassigned",      variant: "info" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  field_program:  "Program",
  route:          "Route",
  field_target:   "Target",
  field_shift:    "Shift",
  field_attempt:  "Attempt",
  follow_up:      "Follow-Up",
  field_team:     "Team",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldAuditClient({ campaignId, campaignName, logs }: Props) {
  const [view, setView] = useState<"log" | "canvassers">("log");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<FieldAuditAction | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => logs.filter((l) => {
    const matchSearch = !search ||
      (l.actor?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || l.entityType === entityFilter;
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const d = new Date(l.createdAt);
    const matchFrom = !fromDate || d >= new Date(fromDate);
    const matchTo   = !toDate   || d <= new Date(toDate + "T23:59:59");
    return matchSearch && matchEntity && matchAction && matchFrom && matchTo;
  }), [logs, search, entityFilter, actionFilter, fromDate, toDate]);

  const canvasserStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; byAction: Partial<Record<FieldAuditAction, number>> }>();
    for (const l of logs) {
      const key = l.actor?.id ?? "system";
      const name = l.actor?.name ?? "System";
      const existing = map.get(key) ?? { name, total: 0, byAction: {} };
      existing.total++;
      existing.byAction[l.action] = (existing.byAction[l.action] ?? 0) + 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [logs]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch(""); setEntityFilter("all"); setActionFilter("all");
    setFromDate(""); setToDate("");
  }

  function handleExport() {
    const header = ["Date", "Actor", "Action", "Entity Type", "Entity ID", "Source"];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString("en-CA"),
      l.actor?.name ?? "System",
      l.action,
      ENTITY_TYPE_LABELS[l.entityType] ?? l.entityType,
      l.entityId,
      l.source,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `field-audit-${campaignId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const uniqueEntityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType))),
    [logs],
  );

  const hasFilters = search || entityFilter !== "all" || actionFilter !== "all" || fromDate || toDate;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Audit Log"
        description={`All field operations changes for ${campaignName}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView(view === "log" ? "canvassers" : "log")}>
              <BarChart2 className="h-4 w-4 mr-1.5" />
              {view === "log" ? "By Canvasser" : "Log View"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Canvasser comparison ─────────────────────────────────────────────── */}
      {view === "canvassers" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Action breakdown by canvasser — all {logs.length} audit entries
          </p>
          {canvasserStats.length === 0 ? (
            <EmptyState
              icon={<User className="h-8 w-8" />}
              title="No activity recorded"
              description="Canvasser activity will appear here."
            />
          ) : (
            <div className="space-y-2">
              {canvasserStats.map((cs, idx) => (
                <Card key={cs.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                        <span className="font-medium text-sm">{cs.name}</span>
                      </div>
                      <Badge variant="info" className="text-xs">{cs.total} actions</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(cs.byAction) as [FieldAuditAction, number][])
                        .sort(([, a], [, b]) => b - a)
                        .map(([action, count]) => (
                          <span
                            key={action}
                            className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full"
                          >
                            {ACTION_CONFIG[action]?.label ?? action}
                            <span className="font-semibold">{count}</span>
                          </span>
                        ))}
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D9E75] rounded-full"
                        style={{ width: `${Math.round((cs.total / (canvasserStats[0]?.total ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Log view ─────────────────────────────────────────────────────────── */}
      {view === "log" && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Actor or entity…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="all">All entities</option>
              {uniqueEntityTypes.map((t) => (
                <option key={t} value={t}>{ENTITY_TYPE_LABELS[t] ?? t}</option>
              ))}
            </Select>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as FieldAuditAction | "all")}
            >
              <option value="all">All actions</option>
              {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="To date"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {logs.length} entries
            </p>
            {hasFilters && (
              <button
                className="text-xs text-blue-500 hover:underline"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-8 w-8" />}
              title="No audit entries"
              description="Field operation changes will appear here as they happen."
            />
          ) : (
            <div className="space-y-1.5">
              {filtered.map((log) => {
                const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, variant: "default" as const };
                const isExpanded = expanded.has(log.id);
                const hasDetails = log.oldValueJson || log.newValueJson;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={cfg.variant} className="text-xs shrink-0">{cfg.label}</Badge>
                              <span className="text-xs font-medium">
                                {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {log.entityId.slice(-8)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {log.actor && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />{log.actor.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(log.createdAt).toLocaleString("en-CA")}
                              </span>
                              <span className="capitalize text-muted-foreground/70">{log.source}</span>
                            </div>
                          </div>
                          {hasDetails && (
                            <button
                              className="text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => toggleExpand(log.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && hasDetails && (
                          <div className="mt-2 border-t pt-2 space-y-1">
                            {log.oldValueJson && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">Before:</p>
                                <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                                  {JSON.stringify(log.oldValueJson, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValueJson && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">After:</p>
                                <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                                  {JSON.stringify(log.newValueJson, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
