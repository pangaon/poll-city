"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Clock, User, ChevronDown,
  X, Plus, FileText, ArrowUpCircle, Loader2, Shield, Mail, Phone, Users,
} from "lucide-react";
import type {
  RepAlertSeverity, RepIssueStatus, RepIssueCategory,
  RepRecUrgency, RepRecActionType,
} from "@prisma/client";

const SEV_STYLES: Record<RepAlertSeverity, string> = {
  critical: "bg-red-100 text-red-800 border border-red-300",
  high:     "bg-orange-100 text-orange-800 border border-orange-300",
  medium:   "bg-amber-100 text-amber-800 border border-amber-300",
  low:      "bg-emerald-100 text-emerald-800 border border-emerald-300",
};

const STATUS_STYLES: Record<RepIssueStatus, string> = {
  open:        "bg-blue-100 text-blue-800",
  triaged:     "bg-purple-100 text-purple-800",
  in_progress: "bg-amber-100 text-amber-800",
  escalated:   "bg-red-100 text-red-800",
  resolved:    "bg-emerald-100 text-emerald-800",
  archived:    "bg-gray-100 text-gray-600",
};

const URGENCY_STYLES: Record<RepRecUrgency, string> = {
  immediate:   "text-red-700 font-semibold",
  within_hour: "text-orange-700 font-semibold",
  within_day:  "text-amber-700",
  this_week:   "text-blue-700",
  monitor:     "text-gray-600",
};

const URGENCY_LABEL: Record<RepRecUrgency, string> = {
  immediate:   "Immediate",
  within_hour: "Within 1 hr",
  within_day:  "Within 24 hrs",
  this_week:   "This week",
  monitor:     "Monitor",
};

const ACTION_LABEL: Record<RepRecActionType, string> = {
  publish_response_page:   "Publish Response Page",
  send_supporter_briefing: "Send Supporter Briefing",
  send_email_blast:        "Send Email Blast",
  send_sms:                "Send SMS",
  post_social:             "Post to Social",
  internal_note:           "Internal Note",
  escalate:                "Escalate",
  media_response:          "Media Response",
  suppress_outbound:       "Suppress Outbound",
  create_task:             "Create Task",
  no_action:               "No Action Required",
};

const CATEGORY_LABEL: Record<RepIssueCategory, string> = {
  misinformation:    "Misinformation",
  policy:            "Policy",
  personal_attack:   "Personal Attack",
  media_inquiry:     "Media Inquiry",
  local_controversy: "Local Controversy",
  supporter_concern: "Supporter Concern",
  legal:             "Legal",
  financial:         "Financial",
  general:           "General",
};

interface Alert {
  id: string; title: string; severity: RepAlertSeverity;
  sourceName: string | null; detectedAt: string;
}
interface Rec {
  id: string; actionType: RepRecActionType; urgencyLevel: RepRecUrgency;
  reasoning: string; isDismissed: boolean;
}
interface Action {
  id: string; title: string; actionType: string; status: string;
  notes: string | null; createdAt: string;
}
interface Page {
  id: string; title: string; publishStatus: string; publishedAt: string | null;
}
interface Issue {
  id: string; title: string; description: string | null;
  category: RepIssueCategory; severity: RepAlertSeverity; status: RepIssueStatus;
  impactScore: number; geography: string | null; slaDeadline: string | null;
  openedAt: string; resolvedAt: string | null; ownerUserId: string | null;
  owner: { id: string; name: string | null; email: string } | null;
  alertLinks: { alert: Alert }[];
  recommendations: Rec[];
  responseActions: Action[];
  responsePages: Page[];
}

interface Props { campaignId: string; issueId: string; }

export default function IssueWorkspaceClient({ campaignId, issueId }: Props) {
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionNotes, setNewActionNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reputation/issues/${issueId}?campaignId=${campaignId}`);
      if (!res.ok) throw new Error("Failed to load issue");
      const data = await res.json();
      setIssue(data.issue ?? data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [issueId, campaignId]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status: RepIssueStatus) => {
    if (!issue) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reputation/issues/${issueId}?campaignId=${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setIssue(prev => prev ? { ...prev, status: data.issue?.status ?? status } : prev);
    } finally { setSaving(false); }
  };

  const dismissRec = async (recId: string) => {
    await fetch(`/api/reputation/issues/${issueId}/recommendations?campaignId=${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recId, isDismissed: true }),
    });
    setIssue(prev => prev ? {
      ...prev,
      recommendations: prev.recommendations.map(r =>
        r.id === recId ? { ...r, isDismissed: true } : r
      ),
    } : prev);
  };

  const addAction = async () => {
    if (!newActionTitle.trim() || !issue) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reputation/issues/${issueId}/actions?campaignId=${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newActionTitle.trim(),
          actionType: "internal_note",
          notes: newActionNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add action");
      const data = await res.json();
      setIssue(prev => prev ? { ...prev, responseActions: [...prev.responseActions, data.action] } : prev);
      setNewActionTitle("");
      setNewActionNotes("");
      setShowAddAction(false);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#1D9E75]" />
    </div>
  );

  if (error || !issue) return (
    <div className="p-8 text-center text-red-600">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      <p>{error ?? "Issue not found."}</p>
    </div>
  );

  const activeRecs = issue.recommendations.filter(r => !r.isDismissed);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back to Issues
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <Shield className="w-5 h-5 text-[#0A2342] shrink-0" />
              <h1 className="text-xl font-bold text-[#0A2342] truncate">{issue.title}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV_STYLES[issue.severity]}`}>
                {issue.severity.toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[issue.status]}`}>
                {issue.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {CATEGORY_LABEL[issue.category]}
              {issue.geography ? ` · ${issue.geography}` : ""}
              {" · Impact score: "}<strong>{issue.impactScore}</strong>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => changeStatus("resolved")}
              disabled={saving || issue.status === "resolved"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#1D9E75] text-white rounded-lg hover:bg-[#188a64] disabled:opacity-50 transition-colors">
              <CheckCircle2 className="w-4 h-4" />Mark Resolved
            </button>
            <button onClick={() => changeStatus("escalated")}
              disabled={saving || issue.status === "escalated"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#E24B4A] text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
              <ArrowUpCircle className="w-4 h-4" />Escalate
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {issue.description && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Summary</h2>
              <p className="text-gray-700 text-sm leading-relaxed">{issue.description}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Linked Alerts ({issue.alertLinks.length})
            </h2>
            {issue.alertLinks.length === 0
              ? <p className="text-sm text-gray-400">No alerts linked to this issue.</p>
              : <div className="space-y-2">
                  {issue.alertLinks.map(({ alert }) => (
                    <motion.div key={alert.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border">
                      <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${SEV_STYLES[alert.severity]}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{alert.title}</p>
                        <p className="text-xs text-gray-500">
                          {alert.sourceName ?? "Unknown source"} ·{" "}
                          {new Date(alert.detectedAt).toLocaleDateString("en-CA")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
            }
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Recommendations ({activeRecs.length} active)
              </h2>
              {activeRecs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => router.push(`/communications?campaignId=${campaignId}`)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#0A2342] text-white hover:bg-[#0A2342]/80 transition-colors">
                    <Mail className="w-3 h-3" /> Email Blast
                  </button>
                  <button onClick={() => router.push(`/communications?tab=sms&campaignId=${campaignId}`)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Phone className="w-3 h-3" /> SMS
                  </button>
                  <button onClick={() => router.push(`/communications?tab=supporters&campaignId=${campaignId}`)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Users className="w-3 h-3" /> Supporter Briefing
                  </button>
                </div>
              )}
            </div>
            {activeRecs.length === 0
              ? <p className="text-sm text-gray-400">All recommendations dismissed.</p>
              : <AnimatePresence>
                  <div className="space-y-3">
                    {activeRecs.map(rec => (
                      <motion.div key={rec.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                        className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-800">{ACTION_LABEL[rec.actionType]}</span>
                            <span className={`text-xs ${URGENCY_STYLES[rec.urgencyLevel]}`}>{URGENCY_LABEL[rec.urgencyLevel]}</span>
                          </div>
                          <p className="text-sm text-gray-600">{rec.reasoning}</p>
                        </div>
                        <button onClick={() => dismissRec(rec.id)} title="Dismiss"
                          className="shrink-0 text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
            }
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Response Actions ({issue.responseActions.length})
              </h2>
              <button onClick={() => setShowAddAction(v => !v)}
                className="flex items-center gap-1 text-sm text-[#1D9E75] hover:text-[#188a64] font-medium">
                <Plus className="w-4 h-4" />Add Action
              </button>
            </div>
            <AnimatePresence>
              {showAddAction && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 rounded-lg border border-[#1D9E75]/30 bg-emerald-50 space-y-3">
                  <input value={newActionTitle} onChange={e => setNewActionTitle(e.target.value)}
                    placeholder="Action title"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                  <textarea value={newActionNotes} onChange={e => setNewActionNotes(e.target.value)}
                    placeholder="Notes (optional)" rows={2}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none" />
                  <div className="flex gap-2">
                    <button onClick={addAction} disabled={saving || !newActionTitle.trim()}
                      className="px-3 py-1.5 text-sm bg-[#1D9E75] text-white rounded-lg hover:bg-[#188a64] disabled:opacity-50 flex items-center gap-1">
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}Save
                    </button>
                    <button onClick={() => setShowAddAction(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {issue.responseActions.length === 0
              ? <p className="text-sm text-gray-400">No response actions recorded yet.</p>
              : <div className="space-y-2">
                  {issue.responseActions.map(action => (
                    <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{action.title}</p>
                        {action.notes && <p className="text-xs text-gray-500 mt-0.5">{action.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {action.actionType} · {action.status} ·{" "}
                          {new Date(action.createdAt).toLocaleDateString("en-CA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</h3>
            <div className="relative">
              <select value={issue.status} onChange={e => changeStatus(e.target.value as RepIssueStatus)}
                disabled={saving}
                className="w-full appearance-none px-3 py-2 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white disabled:opacity-50">
                {(["open","triaged","in_progress","escalated","resolved","archived"] as RepIssueStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace("_"," ").toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner</h3>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {issue.owner?.name ?? issue.owner?.email ?? "Unassigned"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Opened</p>
                  <p className="text-gray-800 font-medium">{new Date(issue.openedAt).toLocaleDateString("en-CA")}</p>
                </div>
              </div>
              {issue.slaDeadline && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${new Date(issue.slaDeadline) < new Date() ? "text-red-500" : "text-amber-500"}`} />
                  <div>
                    <p className="text-gray-500 text-xs">SLA Deadline</p>
                    <p className={`font-medium ${new Date(issue.slaDeadline) < new Date() ? "text-red-600" : "text-amber-700"}`}>
                      {new Date(issue.slaDeadline).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                </div>
              )}
              {issue.resolvedAt && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Resolved</p>
                    <p className="text-emerald-700 font-medium">{new Date(issue.resolvedAt).toLocaleDateString("en-CA")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {issue.responsePages.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Response Pages ({issue.responsePages.length})
              </h3>
              <div className="space-y-2">
                {issue.responsePages.map(page => (
                  <div key={page.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{page.title}</p>
                      <p className="text-xs text-gray-400">{page.publishStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}