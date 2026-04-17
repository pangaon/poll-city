"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Bell, CheckCircle2, ChevronRight,
  Clock, FileText, Lightbulb, Plus, Shield, Siren, TrendingUp,
  User, Users, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui";
import type { RepAlertSeverity, RepIssueStatus, RepIssueCategory, RepRecUrgency, RepRecActionType } from "@prisma/client";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Recommendation {
  id: string;
  actionType: RepRecActionType;
  urgencyLevel: RepRecUrgency;
  suggestedChannels: string[] | null;
  reasoning: string;
  isDismissed: boolean;
}

interface Issue {
  id: string;
  title: string;
  description: string | null;
  category: RepIssueCategory;
  severity: RepAlertSeverity;
  status: RepIssueStatus;
  ownerUserId: string | null;
  slaDeadline: string | null;
  impactScore: number;
  geography: string | null;
  openedAt: string;
  owner: { id: string; name: string | null; email: string } | null;
  alertLinks: { alertId: string }[];
  recommendations: Recommendation[];
  responseActions: { id: string; status: string }[];
}

interface Props { campaignId: string; }

/* ── Constants ──────────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const SEV_COLOR: Record<RepAlertSeverity, string> = {
  critical: RED, high: AMBER, medium: "#6366f1", low: GREEN,
};
const STATUS_COLOR: Record<RepIssueStatus, string> = {
  open: AMBER, triaged: "#6366f1", in_progress: NAVY, escalated: RED,
  resolved: GREEN, archived: "#9ca3af",
};
const URGENCY_COLOR: Record<RepRecUrgency, string> = {
  immediate: RED, within_hour: AMBER, within_day: "#6366f1", this_week: GREEN, monitor: "#9ca3af",
};
const ACTION_LABEL: Record<RepRecActionType, string> = {
  publish_response_page: "Publish Response Page",
  send_supporter_briefing: "Send Supporter Briefing",
  send_email_blast: "Send Email Blast",
  send_sms: "Send SMS",
  post_social: "Post on Social",
  internal_note: "Create Internal Note",
  escalate: "Escalate",
  media_response: "Prepare Media Response",
  suppress_outbound: "Suppress Outbound",
  create_task: "Create Task",
  no_action: "No Action Required",
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function isOverdue(issue: Issue) {
  if (!issue.slaDeadline) return false;
  return new Date(issue.slaDeadline) < new Date() && !["resolved", "archived"].includes(issue.status);
}

function ageLabel(openedAt: string) {
  const h = Math.floor((Date.now() - new Date(openedAt).getTime()) / 3_600_000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function CommandCenterClient({ campaignId }: Props) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open,triaged,in_progress,escalated");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "", category: "general" as RepIssueCategory, severity: "medium" as RepAlertSeverity,
    description: "", geography: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ campaignId, limit: "50" });
    const res = await fetch(`/api/reputation/issues?${qs}`);
    if (res.ok) {
      const data = await res.json();
      // Client-side filter for multi-status
      const statuses = statusFilter.split(",");
      setIssues(data.issues.filter((i: Issue) => statuses.includes(i.status)));
    }
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (issueId: string, status: RepIssueStatus) => {
    await fetch(`/api/reputation/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status }),
    });
    await load();
    if (selected?.id === issueId) setSelected((p) => p ? { ...p, status } : p);
  };

  const generateRec = async (issueId: string) => {
    await fetch(`/api/reputation/issues/${issueId}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    await load();
  };

  const dismissRec = async (issueId: string, recId: string) => {
    await fetch(`/api/reputation/issues/${issueId}/recommendations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, recommendationId: recId }),
    });
    if (selected?.id === issueId) {
      setSelected((p) => p ? {
        ...p, recommendations: p.recommendations.map((r) => r.id === recId ? { ...r, isDismissed: true } : r),
      } : p);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/reputation/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...createForm }),
    });
    if (res.ok) {
      setShowCreate(false);
      setCreateForm({ title: "", category: "general", severity: "medium", description: "", geography: "" });
      await load();
    }
  };

  const sortedIssues = [...issues].sort((a, b) => {
    const sevOrder: Record<RepAlertSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    if (isOverdue(b) !== isOverdue(a)) return isOverdue(b) ? 1 : -1;
    return sevOrder[b.severity] - sevOrder[a.severity];
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: NAVY }} />
              Command Center
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Active issues, recommendations, and response coordination</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/reputation/alerts?campaignId=${campaignId}`)}
              className="gap-1"><Bell className="w-3.5 h-3.5" /> Alerts</Button>
            <Button size="sm" onClick={() => setShowCreate(true)} style={{ background: NAVY }} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> New Issue
            </Button>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {[
          ["open,triaged,in_progress,escalated", "Active"],
          ["escalated", "Escalated"],
          ["resolved", "Resolved"],
          ["", "All"],
        ].map(([val, label]) => (
          <button key={label} onClick={() => setStatusFilter(val)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${statusFilter === val
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Issue list */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : sortedIssues.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No active issues</p>
              <p className="text-xs mt-1 text-gray-400">Create an issue from an alert to begin</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedIssues.map((issue) => (
                <button key={issue.id} onClick={() => setSelected(issue)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selected?.id === issue.id ? "bg-indigo-50 border-l-2 border-indigo-500" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: SEV_COLOR[issue.severity] }} />
                    <span className="text-xs font-medium truncate flex-1">{issue.title}</span>
                    {isOverdue(issue) && <Clock className="w-3 h-3 text-red-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${STATUS_COLOR[issue.status]}20`, color: STATUS_COLOR[issue.status] }}>
                      {issue.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">{ageLabel(issue.openedAt)}</span>
                    {issue.alertLinks.length > 0 && (
                      <span className="text-xs text-gray-400">{issue.alertLinks.length} alert{issue.alertLinks.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Issue detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="p-6 max-w-3xl">
              {/* Issue header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: SEV_COLOR[selected.severity] }} />
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{selected.category.replace(/_/g, " ")}</span>
                    {isOverdue(selected) && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{selected.title}</h2>
                  {selected.description && <p className="text-sm text-gray-500 mt-1">{selected.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Opened {ageLabel(selected.openedAt)} ago</span>
                    {selected.geography && <span>📍 {selected.geography}</span>}
                    <span>Impact: {selected.impactScore}/100</span>
                  </div>
                </div>
                <button onClick={() => router.push(`/reputation/issues/${selected.id}?campaignId=${campaignId}`)}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0">
                  Full workspace <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Status actions */}
              <div className="flex flex-wrap gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600 self-center mr-1">Status:</span>
                {(["open","triaged","in_progress","escalated","resolved"] as const).map((s) => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${selected.status === s
                      ? "text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    style={selected.status === s ? { background: STATUS_COLOR[s] } : {}}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Recommendations */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> Recommendations
                  </h3>
                  <button onClick={() => generateRec(selected.id)}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Generate new
                  </button>
                </div>
                {selected.recommendations.filter((r) => !r.isDismissed).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No active recommendations — click Generate new</p>
                ) : (
                  <div className="space-y-2">
                    {selected.recommendations.filter((r) => !r.isDismissed).map((rec) => (
                      <div key={rec.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-800">
                                {ACTION_LABEL[rec.actionType]}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: `${URGENCY_COLOR[rec.urgencyLevel]}20`, color: URGENCY_COLOR[rec.urgencyLevel] }}>
                                {rec.urgencyLevel.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{rec.reasoning}</p>
                            {rec.suggestedChannels && Array.isArray(rec.suggestedChannels) && rec.suggestedChannels.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                Channels: {(rec.suggestedChannels as string[]).join(", ")}
                              </p>
                            )}
                          </div>
                          <button onClick={() => dismissRec(selected.id, rec.id)}
                            className="text-gray-300 hover:text-gray-500 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => router.push(`/reputation/issues/${selected.id}?campaignId=${campaignId}`)}
                            className="text-xs px-3 py-1.5 rounded-md font-medium text-white transition"
                            style={{ background: NAVY }}>
                            Take Action
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Response actions summary */}
              {selected.responseActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" /> Response Actions
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({selected.responseActions.length} total)
                    </span>
                  </h3>
                  <div className="space-y-1">
                    {selected.responseActions.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs px-3 py-2 bg-gray-50 rounded">
                        <span className="text-gray-600 font-mono text-xs">{a.id.slice(0, 8)}…</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: a.status === "sent" ? `${GREEN}20` : a.status === "approved" ? `${NAVY}20` : `${AMBER}20`,
                            color: a.status === "sent" ? GREEN : a.status === "approved" ? NAVY : AMBER,
                          }}>
                          {a.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select an issue to view details</p>
                <p className="text-sm mt-1">Or create a new issue from the list</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Issue Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Create Issue</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder="Brief description of the issue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value as RepIssueCategory }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                      {["general","misinformation","policy","personal_attack","media_inquiry","local_controversy","supporter_concern","legal","financial"].map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                    <select value={createForm.severity} onChange={(e) => setCreateForm((f) => ({ ...f, severity: e.target.value as RepAlertSeverity }))}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                      {["critical","high","medium","low"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" size="sm" style={{ background: NAVY }}>Create Issue</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
