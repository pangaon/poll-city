"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bell, CheckCircle2, Clock,
  RefreshCw, Shield, Siren, TrendingUp, ChevronRight,
  Globe, User, Zap, FileText,
} from "lucide-react";
import { Button } from "@/components/ui";
import type {
  RepAlertSeverity, RepAlertSentiment, RepAlertSourceType,
  RepIssueStatus, RepIssueCategory, RepRecActionType, RepRecUrgency,
} from "@prisma/client";
import { STATUS_DISPLAY, CATEGORY_DISPLAY, URGENCY_RANK } from "@/lib/reputation/types";

interface Summary {
  newAlerts: number;
  criticalAlerts: number;
  openIssues: number;
  overdueIssues: number;
  escalatedIssues: number;
  pendingActions: number;
  recentAlerts: RecentAlert[];
}

interface RecentAlert {
  id: string;
  title: string;
  severity: RepAlertSeverity;
  sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType;
  detectedAt: string;
}

interface Recommendation {
  id: string;
  actionType: RepRecActionType;
  urgencyLevel: RepRecUrgency;
  reasoning: string;
}

interface Issue {
  id: string;
  title: string;
  category: RepIssueCategory;
  severity: RepAlertSeverity;
  status: RepIssueStatus;
  impactScore: number;
  openedAt: string;
  slaDeadline: string | null;
  geography: string | null;
  owner: { id: string; name: string | null; email: string } | null;
  alertLinks: { alertId: string }[];
  recommendations: Recommendation[];
  responseActions: { id: string; status: string }[];
}

interface Props { campaignId: string; }

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const SEV: Record<RepAlertSeverity, { label: string; color: string; border: string; dot: string }> = {
  critical: { label: "Critical", color: RED,       border: "border-red-200",    dot: "bg-red-500" },
  high:     { label: "High",     color: AMBER,     border: "border-amber-200",  dot: "bg-amber-500" },
  medium:   { label: "Medium",   color: "#6366f1", border: "border-indigo-200", dot: "bg-indigo-500" },
  low:      { label: "Low",      color: GREEN,     border: "border-emerald-200", dot: "bg-emerald-500" },
};

const URGENCY_LABEL: Record<RepRecUrgency, string> = {
  immediate:   "Immediate",
  within_hour: "Within Hour",
  within_day:  "Within Day",
  this_week:   "This Week",
  monitor:     "Monitor",
};

const URGENCY_COLOR: Record<RepRecUrgency, string> = {
  immediate:   RED,
  within_hour: AMBER,
  within_day:  "#6366f1",
  this_week:   GREEN,
  monitor:     "#9ca3af",
};

const ACTION_LABEL: Record<RepRecActionType, string> = {
  no_action:               "No Action",
  internal_note:           "Internal Note",
  media_response:          "Media Response",
  publish_response_page:   "Publish Response Page",
  send_supporter_briefing: "Supporter Briefing",
  escalate:                "Escalate",
  suppress_outbound:       "Suppress Outbound",
  send_sms:                "Send SMS",
  send_email_blast:        "Send Email Blast",
  post_social:             "Post Social",
  create_task:             "Create Task",
};

const STATUS_COLOR: Record<RepIssueStatus, string> = {
  open:        AMBER,
  triaged:     "#6366f1",
  in_progress: NAVY,
  escalated:   RED,
  resolved:    GREEN,
  archived:    "#9ca3af",
};

function getUrgencyRank(u: RepRecUrgency): number {
  const r: number = URGENCY_RANK[u];
  return r;
}

export default function CommandCenterClient({ campaignId }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const issuesQs = new URLSearchParams({ campaignId, limit: "50" });
    if (statusFilter) issuesQs.set("status", statusFilter);

    const [sumRes, issuesRes] = await Promise.all([
      fetch(`/api/reputation/summary?campaignId=${campaignId}`),
      fetch(`/api/reputation/issues?${issuesQs}`),
    ]);

    if (sumRes.ok) setSummary(await sumRes.json());
    if (issuesRes.ok) {
      const data = await issuesRes.json();
      setIssues(data.issues ?? []);
    }
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...issues].sort((a, b) => {
    const aU = a.recommendations[0] ? getUrgencyRank(a.recommendations[0].urgencyLevel) : 0;
    const bU = b.recommendations[0] ? getUrgencyRank(b.recommendations[0].urgencyLevel) : 0;
    return bU - aU;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: NAVY }} />
              Reputation Command Center
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Issue triage, recommendations, and response coordination</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => router.push(`/reputation/alerts?campaignId=${campaignId}`)}
              className="gap-1">
              <Bell className="w-3.5 h-3.5" /> Alerts
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { label: "New Alerts",      value: summary.newAlerts,       color: AMBER,     icon: Bell },
              { label: "Critical",        value: summary.criticalAlerts,  color: RED,       icon: AlertTriangle },
              { label: "Open Issues",     value: summary.openIssues,      color: NAVY,      icon: Shield },
              { label: "Overdue",         value: summary.overdueIssues,   color: RED,       icon: Clock },
              { label: "Escalated",       value: summary.escalatedIssues, color: AMBER,     icon: Siren },
              { label: "Pending Actions", value: summary.pendingActions,  color: "#6366f1", icon: FileText },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="font-semibold" style={{ color }}>{value}</span>
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Issues</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option value="">All Status</option>
                {(["open", "triaged", "in_progress", "escalated"] as RepIssueStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_DISPLAY[s]}</option>
                ))}
              </select>
              <Button size="sm" style={{ background: NAVY }} className="gap-1"
                onClick={() => router.push(`/reputation/issues/new?campaignId=${campaignId}`)}>
                <Zap className="w-3.5 h-3.5" /> New Issue
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : sorted.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No active issues</p>
                <p className="text-sm mt-1">The campaign is clear — no open reputation issues</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {sorted.map((issue) => {
                  const sev = SEV[issue.severity];
                  const rec = issue.recommendations[0] ?? null;
                  const isOverdue = issue.slaDeadline && new Date(issue.slaDeadline) < new Date();

                  return (
                    <motion.div key={issue.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`bg-white rounded-lg border ${sev.border} p-4`}>
                      <div className="flex gap-4">
                        <div className={`w-1.5 rounded-full self-stretch ${sev.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100"
                                  style={{ color: sev.color }}>{sev.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100"
                                  style={{ color: STATUS_COLOR[issue.status] }}>{STATUS_DISPLAY[issue.status]}</span>
                                <span className="text-xs text-gray-400">{CATEGORY_DISPLAY[issue.category]}</span>
                                {issue.geography && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Globe className="w-3 h-3" /> {issue.geography}
                                  </span>
                                )}
                                {isOverdue && (
                                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: RED }}>
                                    <Clock className="w-3 h-3" /> Overdue
                                  </span>
                                )}
                                {issue.alertLinks.length > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {issue.alertLinks.length} alert{issue.alertLinks.length !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900">{issue.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>Opened {new Date(issue.openedAt).toLocaleDateString("en-CA")}</span>
                                {issue.owner && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {issue.owner.name ?? issue.owner.email}
                                  </span>
                                )}
                                {issue.impactScore > 0 && (
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Impact {issue.impactScore}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/reputation/issues/${issue.id}?campaignId=${campaignId}`)}
                              className="shrink-0 text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition flex items-center gap-1">
                              View <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          {rec && (
                            <div className="mt-2 flex items-center gap-2 p-2.5 rounded-md bg-gray-50 border border-gray-100">
                              <span className="text-xs font-medium shrink-0"
                                style={{ color: URGENCY_COLOR[rec.urgencyLevel] }}>
                                {URGENCY_LABEL[rec.urgencyLevel]}
                              </span>
                              <span className="text-xs text-gray-500">→</span>
                              <span className="text-xs font-medium text-gray-700">{ACTION_LABEL[rec.actionType]}</span>
                              <span className="text-xs text-gray-400 line-clamp-1 flex-1">{rec.reasoning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {summary && summary.recentAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Recent Unactioned Alerts
              </h2>
              <button
                onClick={() => router.push(`/reputation/alerts?campaignId=${campaignId}`)}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {summary.recentAlerts.map((alert) => {
                const sev = SEV[alert.severity];
                return (
                  <motion.div key={alert.id} layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`bg-white rounded-lg border ${sev.border} px-4 py-3 flex items-center gap-3`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(alert.detectedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: sev.color }}>{sev.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
