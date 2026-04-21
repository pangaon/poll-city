"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Globe,
  Loader2, MessageSquare, Newspaper, Plus, RefreshCw, Shield,
  Siren, TrendingUp, X, Mail, Phone,
} from "lucide-react";
import type { RepAlertSeverity, RepAlertStatus, RepAlertSentiment, RepAlertSourceType } from "@prisma/client";

interface Issue { id: string; title: string; status: string; severity: string; }
interface AlertDetail {
  id: string; title: string; description: string | null;
  severity: RepAlertSeverity; status: RepAlertStatus; sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType; sourceName: string | null; sourceUrl: string | null;
  velocityScore: number; geography: string | null;
  detectedAt: string; createdAt: string;
  issueLinks: { issue: Issue }[];
}

interface Props { campaignId: string; alertId: string; }

const CARD = "bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl";

const SEV: Record<RepAlertSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#FF3B30", bg: "rgba(255,59,48,0.15)"   },
  high:     { label: "High",     color: "#EF9F27", bg: "rgba(239,159,39,0.15)"  },
  medium:   { label: "Medium",   color: "#AAB2FF", bg: "rgba(170,178,255,0.15)" },
  low:      { label: "Low",      color: "#00C853", bg: "rgba(0,200,83,0.15)"    },
};

const SENT: Record<RepAlertSentiment, { label: string; color: string }> = {
  negative: { label: "Negative", color: "#FF3B30" },
  neutral:  { label: "Neutral",  color: "#6B72A0" },
  positive: { label: "Positive", color: "#00C853" },
  mixed:    { label: "Mixed",    color: "#EF9F27" },
  unknown:  { label: "Unknown",  color: "#6B72A0" },
};

const SOURCE_ICON: Record<RepAlertSourceType, typeof Newspaper> = {
  social_media: MessageSquare, news: Newspaper, blog: Globe,
  forum: MessageSquare, manual: Plus, internal_monitoring: Shield,
};

export default function AlertDetailClient({ campaignId, alertId }: Props) {
  const router = useRouter();
  const [alert, setAlert]       = useState<AlertDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [creatingIssue, setCreatingIssue] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reputation/alerts/${alertId}?campaignId=${campaignId}`);
      if (!res.ok) throw new Error("Alert not found");
      const data = await res.json();
      setAlert(data.alert);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }, [alertId, campaignId]);

  useEffect(() => { load(); }, [load]);

  const patch = async (status: RepAlertStatus) => {
    if (!alert) return;
    setSaving(true);
    await fetch(`/api/reputation/alerts/${alertId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status }),
    });
    setAlert((prev) => prev ? { ...prev, status } : prev);
    setSaving(false);
  };

  const createIssue = async () => {
    if (!alert) return;
    setCreatingIssue(true);
    const res = await fetch("/api/reputation/issues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId, title: alert.title, category: "general",
        severity: alert.severity, alertIds: [alert.id],
      }),
    });
    if (res.ok) {
      const { issue } = await res.json();
      router.push(`/reputation/issues/${issue.id}?campaignId=${campaignId}`);
    }
    setCreatingIssue(false);
  };

  if (loading) return (
    <div className="min-h-full bg-[#050A1F] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#2979FF]" />
    </div>
  );

  if (error || !alert) return (
    <div className="min-h-full bg-[#050A1F] flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-[#FF3B30] mx-auto mb-3" />
        <p className="text-[#AAB2FF]">{error ?? "Alert not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-xs text-[#2979FF] hover:text-[#00E5FF] transition-all">
          ← Back
        </button>
      </div>
    </div>
  );

  const sev     = SEV[alert.severity];
  const sent    = SENT[alert.sentiment];
  const SrcIcon = SOURCE_ICON[alert.sourceType];
  const isLinked = alert.issueLinks.length > 0;
  const isCritOrHigh = alert.severity === "critical" || alert.severity === "high";

  return (
    <div className="min-h-full bg-[#050A1F] p-6 space-y-6">

      {/* Back + Header */}
      <div>
        <button onClick={() => router.push("/reputation/alerts")}
          className="flex items-center gap-2 text-[#6B72A0] hover:text-[#AAB2FF] text-xs font-medium mb-4 transition-all">
          <ArrowLeft size={14} /> Back to Alerts
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Siren size={14} className="text-[#FF3B30]" />
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ color: sev.color, backgroundColor: sev.bg }}>
                {sev.label}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ color: sent.color, backgroundColor: `${sent.color}22` }}>
                {sent.label} Sentiment
              </span>
              {alert.status !== "new" && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ color: "#00C853", backgroundColor: "rgba(0,200,83,0.15)" }}>
                  {alert.status}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-[#F5F7FF]">{alert.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {alert.status === "new" && (
              <button onClick={() => patch("acknowledged")} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00C853]/40 text-[#00C853] text-xs font-bold uppercase tracking-wider hover:bg-[#00C853]/10 disabled:opacity-50 transition-all">
                <CheckCircle2 size={14} /> Acknowledge
              </button>
            )}
            {!isLinked && (
              <button onClick={createIssue} disabled={creatingIssue}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/40 text-[#2979FF] text-xs font-bold uppercase tracking-wider hover:bg-[#2979FF]/10 disabled:opacity-50 transition-all">
                {creatingIssue ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                Escalate to Issue
              </button>
            )}
            <button onClick={() => patch("dismissed")} disabled={saving || alert.status === "dismissed"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FF3B30]/30 text-[#6B72A0] hover:text-[#FF3B30] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40">
              <X size={14} /> Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Respond Banner — if critical or high */}
      {isCritOrHigh && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#EF9F27]/30 bg-[#EF9F27]/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black text-[#EF9F27] uppercase tracking-wider mb-1">Action Recommended</div>
              <p className="text-xs text-[#AAB2FF]">
                This is a {sev.label.toLowerCase()} alert. Consider responding via your campaign communications channels.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => router.push(`/communications?campaignId=${campaignId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EF9F27]/40 text-[#EF9F27] text-[10px] font-bold uppercase tracking-wider hover:bg-[#EF9F27]/10 transition-all">
                <Mail size={12} /> Email Blast
              </button>
              <button onClick={() => router.push(`/communications?tab=sms&campaignId=${campaignId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2979FF]/40 text-[#2979FF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#2979FF]/10 transition-all">
                <Phone size={12} /> SMS
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          {alert.description && (
            <div className={CARD + " p-5"}>
              <h2 className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-3">Description</h2>
              <p className="text-sm text-[#F5F7FF] leading-relaxed">{alert.description}</p>
            </div>
          )}

          {/* Source */}
          <div className={CARD + " p-5"}>
            <h2 className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-4">Source</h2>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-[#2979FF]/20 bg-[#2979FF]/10">
                <SrcIcon className="w-4 h-4 text-[#2979FF]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F5F7FF]">
                  {alert.sourceName ?? alert.sourceType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-[#6B72A0]">
                  {alert.sourceType.replace(/_/g, " ")}
                  {alert.geography ? ` · ${alert.geography}` : ""}
                </p>
              </div>
              {alert.sourceUrl && (
                <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[#2979FF]/30 text-[#2979FF] hover:text-[#00E5FF] transition-all">
                  <ExternalLink size={12} /> View Source
                </a>
              )}
            </div>
          </div>

          {/* Linked Issues */}
          {isLinked && (
            <div className={CARD + " p-5"}>
              <h2 className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-4">
                Linked Issues ({alert.issueLinks.length})
              </h2>
              <div className="space-y-2">
                {alert.issueLinks.map(({ issue }) => (
                  <button key={issue.id}
                    onClick={() => router.push(`/reputation/issues/${issue.id}?campaignId=${campaignId}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#2979FF]/20 hover:border-[#2979FF]/50 hover:bg-[#2979FF]/5 transition-all text-left">
                    <Shield className="w-4 h-4 text-[#2979FF] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F7FF] truncate">{issue.title}</p>
                      <p className="text-[10px] text-[#6B72A0]">{issue.status.replace(/_/g," ")} · {issue.severity}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className={CARD + " p-5"}>
            <h3 className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-4">Signal Details</h3>
            <div className="space-y-3">
              {[
                { label: "Detected",      value: new Date(alert.detectedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) },
                { label: "Velocity",      value: alert.velocityScore > 0 ? `${alert.velocityScore.toFixed(1)} / 10` : "—" },
                { label: "Geography",     value: alert.geography ?? "—" },
                { label: "Alert Status",  value: alert.status.replace(/_/g," ") },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-[#6B72A0] uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-[#F5F7FF] mt-0.5 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={CARD + " p-5"}>
            <h3 className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {alert.status === "new" && (
                <button onClick={() => patch("acknowledged")} disabled={saving}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#00C853]/30 text-[#00C853] text-xs font-bold hover:bg-[#00C853]/10 transition-all disabled:opacity-50">
                  <CheckCircle2 size={12} /> Acknowledge Alert
                </button>
              )}
              {!isLinked && (
                <button onClick={createIssue} disabled={creatingIssue}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2979FF]/30 text-[#2979FF] text-xs font-bold hover:bg-[#2979FF]/10 transition-all disabled:opacity-50">
                  {creatingIssue ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                  Escalate to Issue
                </button>
              )}
              <button onClick={() => router.push(`/communications?campaignId=${campaignId}`)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#EF9F27]/30 text-[#EF9F27] text-xs font-bold hover:bg-[#EF9F27]/10 transition-all">
                <Mail size={12} /> Send Email Blast
              </button>
              <button onClick={() => router.push(`/reputation/alerts?campaignId=${campaignId}`)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] text-xs font-bold transition-all">
                <RefreshCw size={12} /> Back to Alerts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
