"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Shield, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import {
  Badge, Card, CardContent, EmptyState, Input, PageHeader, Select,
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
  created:         { label: "Created",         variant: "info" },
  updated:         { label: "Updated",         variant: "default" },
  deleted:         { label: "Deleted",         variant: "danger" },
  assigned:        { label: "Assigned",        variant: "info" },
  started:         { label: "Started",         variant: "warning" },
  completed:       { label: "Completed",       variant: "success" },
  cancelled:       { label: "Cancelled",       variant: "danger" },
  checked_in:      { label: "Checked In",      variant: "success" },
  checked_out:     { label: "Checked Out",     variant: "default" },
  outcome_recorded:{ label: "Outcome",         variant: "success" },
  override:        { label: "Override",        variant: "warning" },
  reassigned:      { label: "Reassigned",      variant: "info" },
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

export default function FieldAuditClient({ campaignName, logs }: Props) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<FieldAuditAction | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = logs.filter((l) => {
    const matchSearch = !search ||
      (l.actor?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || l.entityType === entityFilter;
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchEntity && matchAction;
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const uniqueEntityTypes = Array.from(new Set(logs.map((l) => l.entityType)));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Audit Log"
        description={`All field operations changes for ${campaignName}`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by actor or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
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
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {logs.length} audit entries
      </p>

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
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
    </div>
  );
}
