"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, User, MapPin, AlertTriangle,
  Search, Filter, ChevronRight, Flag, Zap,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  Input, PageHeader, Select, StatCard, Tabs,
  TabsContent, TabsList, TabsTrigger,
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

// ── Main component ────────────────────────────────────────────────────────────

export default function FollowUpsClient({ campaignId, campaignName, initialFollowUps }: Props) {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>(initialFollowUps);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FollowUpActionType | "all">("all");
  const [activeTab, setActiveTab] = useState("all");

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
    total: followUps.length,
    high: followUps.filter((f) => f.priority === "high").length,
    gotv: followUps.filter((f) => f.followUpType === "gotv_target").length,
    overdue: followUps.filter((f) => f.dueDate && new Date(f.dueDate) < new Date()).length,
  };

  async function updateStatus(id: string, status: FollowUpActionStatus) {
    const prev = followUps;
    setFollowUps((f) => {
      if (status === "completed" || status === "dismissed") {
        return f.filter((r) => r.id !== id);
      }
      return f.map((r) => r.id === id ? { ...r, status } : r);
    });
    try {
      const res = await fetch(`/api/field/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status }),
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Follow-Ups"
        description={`Outstanding actions from canvassing for ${campaignName}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Open" value={stats.total} icon={<Flag className="h-5 w-5" />} />
        <StatCard label="High Priority" value={stats.high} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatCard label="GOTV Targets" value={stats.gotv} icon={<Zap className="h-5 w-5" />} color="green" />
        <StatCard label="Overdue" value={stats.overdue} icon={<Clock className="h-5 w-5" />} color={stats.overdue > 0 ? "red" : undefined} />
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
                const name = f.contact
                  ? `${f.contact.firstName} ${f.contact.lastName}`
                  : f.household?.address1 ?? "Unknown";

                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className={isOverdue ? "border-[#E24B4A]/40" : ""}>
                      <CardContent className="p-4">
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
                              {f.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {f.assignedTo.name}
                                </span>
                              )}
                              {f.dueDate && (
                                <span className={cn("flex items-center gap-1", isOverdue ? "text-[#E24B4A]" : "")}>
                                  <Clock className="h-3 w-3" />
                                  Due {new Date(f.dueDate).toLocaleDateString("en-CA")}
                                </span>
                              )}
                            </div>
                            {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
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
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
