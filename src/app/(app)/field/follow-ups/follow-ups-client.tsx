"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, User, MapPin, AlertTriangle,
  Search, ChevronRight, Flag, Zap, UserPlus, X,
  MessageSquare, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  Input, PageHeader, Select, StatCard, Tabs,
  TabsContent, TabsList, TabsTrigger, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FollowUpActionType, FollowUpActionStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FollowUpRow {
  id: string;
  campaignId: string;
  contactId: string | null;
  householdId: string | null;
  followUpType: FollowUpActionType;
  status: FollowUpActionStatus;
  priority: string;
  dueDate: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; firstName: string; lastName: string; address1: string | null } | null;
  household: { id: string; address1: string } | null;
  assignedTo: { id: string; name: string | null } | null;
  fieldAttempt: { id: string; outcome: string; createdAt: string } | null;
}

interface CanvasserOption { id: string; name: string | null }

interface Props {
  campaignId: string;
  campaignName: string;
  initialFollowUps: FollowUpRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<FollowUpActionType, { label: string; variant: "default" | "info" | "warning" | "success" | "danger" }> = {
  revisit:            { label: "Revisit",        variant: "info" },
  sign_ops:           { label: "Sign Ops",       variant: "warning" },
  donor_referral:     { label: "Donor",          variant: "success" },
  volunteer_referral: { label: "Volunteer",      variant: "success" },
  crm_cleanup:        { label: "CRM Cleanup",    variant: "default" },
  bad_data:           { label: "Bad Data",       variant: "danger" },
  lit_missed:         { label: "Lit Missed",     variant: "warning" },
  building_retry:     { label: "Retry",          variant: "info" },
  gotv_target:        { label: "GOTV",           variant: "success" },
  press_opportunity:  { label: "Press",          variant: "warning" },
  other:              { label: "Other",          variant: "default" },
};

const STATUS_CONFIG: Record<FollowUpActionStatus, {
  label: string;
  variant: "default" | "info" | "warning" | "success" | "danger";
}> = {
  pending:     { label: "Pending",     variant: "warning" },
  assigned:    { label: "Assigned",    variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed:   { label: "Completed",  variant: "success" },
  dismissed:   { label: "Dismissed",  variant: "default" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: "High",   color: "text-[#E24B4A]" },
  medium: { label: "Medium", color: "text-[#EF9F27]" },
  low:    { label: "Low",    color: "text-muted-foreground" },
};

const SCRIPTS: Partial<Record<FollowUpActionType, string>> = {
  revisit:
    "Hi [name], I came by the other day and missed you. I'm canvassing in the neighbourhood for [candidate]. Do you have a moment to chat about the election?",
  sign_ops:
    "Hi [name], we have you down as a supporter! We'd love to put a lawn sign at your property — does that work for you?",
  donor_referral:
    "Hi [name], we know you've been a strong supporter. We're in the final push and every contribution makes a real difference.",
  volunteer_referral:
    "Hi [name], we're looking for people like you to help on the ground. Even a few hours on election day would mean a lot — interested?",
  gotv_target:
    "Hi [name], election day is coming up. Can we count on your vote? Would you like a reminder or a ride to the polls?",
  lit_missed:
    "Hi [name], we missed your unit when we were in the neighbourhood. I have some material on [candidate]'s platform I'd like to share.",
  building_retry:
    "Hi [name], we tried your building recently and couldn't get through the intercom. Happy to leave materials in the lobby if easier.",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function FollowUpsClient({ campaignId, campaignName, initialFollowUps }: Props) {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>(initialFollowUps);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FollowUpActionType | "all">("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scriptOpen, setScriptOpen] = useState<string | null>(null);

  // Assign modal
  const [assignTarget, setAssignTarget] = useState<FollowUpRow | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Bulk reassign modal
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkUserId, setBulkUserId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Canvassers
  const [canvassers, setCanvassers] = useState<CanvasserOption[]>([]);

  useEffect(() => {
    fetch(`/api/field/teams?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((json) => {
        const members: CanvasserOption[] = [];
        const seen = new Set<string>();
        for (const team of json.data ?? []) {
          for (const m of team.members ?? []) {
            if (m.user && !seen.has(m.user.id)) {
              seen.add(m.user.id);
              members.push({ id: m.user.id, name: m.user.name });
            }
          }
        }
        setCanvassers(members.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
      })
      .catch(() => {/* non-fatal */});
  }, [campaignId]);

  const filtered = followUps.filter((f) => {
    const name = f.contact
      ? `${f.contact.firstName} ${f.contact.lastName}`
      : f.household?.address1 ?? "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || f.followUpType === typeFilter;
    const matchTab =
      activeTab === "all" ||
      (activeTab === "gotv" && f.followUpType === "gotv_target") ||
      (activeTab === "signs" && f.followUpType === "sign_ops") ||
      (activeTab === "revisit" && (f.followUpType === "revisit" || f.followUpType === "building_retry")) ||
      (activeTab === "lit" && f.followUpType === "lit_missed");
    return matchSearch && matchType && matchTab;
  });

  const stats = {
    total:  followUps.length,
    high:   followUps.filter((f) => f.priority === "high").length,
    gotv:   followUps.filter((f) => f.followUpType === "gotv_target").length,
    overdue: followUps.filter((f) => f.dueDate && new Date(f.dueDate) < new Date()).length,
  };

  async function updateStatus(id: string, status: FollowUpActionStatus) {
    const prev = followUps;
    setFollowUps((f) => {
      if (status === "completed" || status === "dismissed") return f.filter((r) => r.id !== id);
      return f.map((r) => r.id === id ? { ...r, status } : r);
    });
    try {
      const res = await fetch("/api/field/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, followUpId: id, status }),
      });
      if (!res.ok) {
        setFollowUps(prev);
        toast.error("Failed to update");
      } else {
        toast.success(status === "completed" ? "Marked complete" : "Updated");
      }
    } catch {
      setFollowUps(prev);
      toast.error("Network error");
    }
  }

  async function handleAssign() {
    if (!assignTarget || !assignUserId) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/field/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          followUpId: assignTarget.id,
          assignedToId: assignUserId,
          status: "assigned",
        }),
      });
      if (!res.ok) { toast.error("Failed to assign"); return; }
      const assignedUser = canvassers.find((c) => c.id === assignUserId) ?? null;
      setFollowUps((f) =>
        f.map((r) =>
          r.id === assignTarget.id
            ? { ...r, status: "assigned", assignedTo: assignedUser ? { id: assignedUser.id, name: assignedUser.name } : null }
            : r
        )
      );
      toast.success("Assigned to canvasser");
      setAssignTarget(null);
      setAssignUserId("");
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleBulkAssign() {
    if (!bulkUserId || selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch("/api/field/follow-ups", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId, followUpId: id, assignedToId: bulkUserId, status: "assigned" }),
          })
        )
      );
      const assignedUser = canvassers.find((c) => c.id === bulkUserId) ?? null;
      setFollowUps((f) =>
        f.map((r) =>
          selectedIds.has(r.id)
            ? { ...r, status: "assigned", assignedTo: assignedUser ? { id: assignedUser.id, name: assignedUser.name } : null }
            : r
        )
      );
      toast.success(`Assigned ${selectedIds.size} follow-ups`);
      setSelectedIds(new Set());
      setBulkAssignOpen(false);
      setBulkUserId("");
    } catch {
      toast.error("Bulk assign failed");
    } finally {
      setBulkAssigning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((f) => selectedIds.has(f.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((f) => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((f) => next.add(f.id));
        return next;
      });
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Follow-Ups"
        description={`Outstanding actions from canvassing for ${campaignName}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Open"     value={stats.total}  icon={<Flag className="h-5 w-5" />} />
        <StatCard label="High Priority"  value={stats.high}   icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatCard label="GOTV Targets"   value={stats.gotv}   icon={<Zap className="h-5 w-5" />} color="green" />
        <StatCard label="Overdue"        value={stats.overdue} icon={<Clock className="h-5 w-5" />} color={stats.overdue > 0 ? "red" : undefined} />
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({followUps.length})</TabsTrigger>
          <TabsTrigger value="gotv">GOTV ({stats.gotv})</TabsTrigger>
          <TabsTrigger value="revisit">Revisit</TabsTrigger>
          <TabsTrigger value="signs">Signs</TabsTrigger>
          <TabsTrigger value="lit">Lit Missed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {/* Search + type filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FollowUpActionType | "all")}
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedIds.size} selected
              </span>
              <Button size="sm" onClick={() => setBulkAssignOpen(true)}>
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Reassign
              </Button>
              <button
                className="text-sm text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}

          {/* Select all row */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="rounded border-input"
              />
              <span className="text-xs text-muted-foreground">
                Select all {filtered.length}
              </span>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="No open follow-ups"
              description="All field follow-ups are cleared. Great work."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((f) => {
                const typeCfg = TYPE_CONFIG[f.followUpType];
                const statusCfg = STATUS_CONFIG[f.status];
                const priorityCfg = PRIORITY_CONFIG[f.priority] ?? PRIORITY_CONFIG.medium;
                const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
                const isSelected = selectedIds.has(f.id);
                const name = f.contact
                  ? `${f.contact.firstName} ${f.contact.lastName}`
                  : f.household?.address1 ?? "Unknown";
                const script = SCRIPTS[f.followUpType];
                const showScript = scriptOpen === f.id;

                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className={cn(isOverdue && "border-[#E24B4A]/40", isSelected && "border-blue-400/60 bg-blue-50/5")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(f.id)}
                            className="mt-0.5 rounded border-input shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{name}</span>
                                  <Badge variant={typeCfg.variant} className="text-xs">{typeCfg.label}</Badge>
                                  <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
                                  <span className={cn("text-xs font-medium", priorityCfg.color)}>
                                    {priorityCfg.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  {(f.contact?.address1 || f.household?.address1) && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {f.contact?.address1 ?? f.household?.address1}
                                    </span>
                                  )}
                                  {f.assignedTo ? (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {f.assignedTo.name ?? "Unknown"}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/50 italic">Unassigned</span>
                                  )}
                                  {f.dueDate && (
                                    <span className={cn("flex items-center gap-1", isOverdue && "text-[#E24B4A]")}>
                                      <Clock className="h-3 w-3" />
                                      Due {new Date(f.dueDate).toLocaleDateString("en-CA")}
                                    </span>
                                  )}
                                </div>
                                {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                {script && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground"
                                    onClick={() => setScriptOpen(showScript ? null : f.id)}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                    Script
                                    {showScript ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setAssignTarget(f); setAssignUserId(f.assignedTo?.id ?? ""); }}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                                  Assign
                                </Button>
                                {f.status === "pending" && (
                                  <Button size="sm" variant="outline" onClick={() => updateStatus(f.id, "in_progress")}>
                                    Start
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[#1D9E75] border-[#1D9E75] hover:bg-[#1D9E75] hover:text-white"
                                  onClick={() => updateStatus(f.id, "completed")}
                                >
                                  Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground"
                                  onClick={() => updateStatus(f.id, "dismissed")}
                                >
                                  Skip
                                </Button>
                              </div>
                            </div>

                            {/* Script panel */}
                            <AnimatePresence>
                              {showScript && script && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">
                                      Suggested Script
                                    </p>
                                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed italic">
                                      &ldquo;{script}&rdquo;
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {assignTarget && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAssignTarget(null)}
            />
            <motion.div
              className="fixed inset-x-4 bottom-4 sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-96 bg-background border rounded-xl shadow-2xl z-50 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Assign Follow-Up</h3>
                <Button variant="ghost" size="icon" onClick={() => setAssignTarget(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-1 text-sm text-muted-foreground">
                {assignTarget.contact
                  ? `${assignTarget.contact.firstName} ${assignTarget.contact.lastName}`
                  : assignTarget.household?.address1 ?? "Unknown"}
              </div>
              <Badge variant={TYPE_CONFIG[assignTarget.followUpType].variant} className="text-xs mb-4">
                {TYPE_CONFIG[assignTarget.followUpType].label}
              </Badge>

              {canvassers.length > 0 ? (
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                >
                  <option value="">Select canvasser…</option>
                  {canvassers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="User ID"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="mb-4"
                />
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setAssignTarget(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!assignUserId || assigning}
                  onClick={handleAssign}
                >
                  {assigning ? <Spinner className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Assign
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bulk Reassign Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {bulkAssignOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBulkAssignOpen(false)}
            />
            <motion.div
              className="fixed inset-x-4 bottom-4 sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-96 bg-background border rounded-xl shadow-2xl z-50 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Bulk Reassign</h3>
                <Button variant="ghost" size="icon" onClick={() => setBulkAssignOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Reassign {selectedIds.size} follow-up{selectedIds.size !== 1 ? "s" : ""} to a single canvasser.
              </p>

              {canvassers.length > 0 ? (
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                  value={bulkUserId}
                  onChange={(e) => setBulkUserId(e.target.value)}
                >
                  <option value="">Select canvasser…</option>
                  {canvassers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="User ID"
                  value={bulkUserId}
                  onChange={(e) => setBulkUserId(e.target.value)}
                  className="mb-4"
                />
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setBulkAssignOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!bulkUserId || bulkAssigning}
                  onClick={handleBulkAssign}
                >
                  {bulkAssigning ? <Spinner className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Reassign {selectedIds.size}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
