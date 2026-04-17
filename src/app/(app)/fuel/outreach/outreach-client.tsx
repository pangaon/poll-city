"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle, Clock, XCircle, Send, ExternalLink } from "lucide-react";

interface OutreachLog {
  id: string;
  step: string;
  status: string;
  subject: string | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  bouncedAt: string | null;
  notes: string | null;
  vendor: { id: string; name: string; email: string | null; city: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "text-gray-500", icon: <Clock className="w-3.5 h-3.5" /> },
  sent: { label: "Sent", color: "text-blue-600", icon: <Mail className="w-3.5 h-3.5" /> },
  opened: { label: "Opened", color: "text-sky-600", icon: <Mail className="w-3.5 h-3.5" /> },
  clicked: { label: "Clicked", color: "text-indigo-600", icon: <ExternalLink className="w-3.5 h-3.5" /> },
  replied: { label: "Replied", color: "text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  bounced: { label: "Bounced", color: "text-red-600", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  not_interested: { label: "Not interested", color: "text-gray-400", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const STEP_LABELS: Record<string, string> = { initial: "Initial", follow_up_1: "Follow-up 1", follow_up_2: "Follow-up 2" };

export default function OutreachClient({ campaignId }: { campaignId: string }) {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/fuel/outreach?${params}`).then((r) => r.json());
    if (res.data) setLogs(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function markStatus(logId: string, status: string, notes?: string) {
    setUpdating(logId);
    const res = await fetch("/api/fuel/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", campaignId, logId, status, notes }),
    }).then((r) => r.json());
    setUpdating(null);
    if (res.data) { toast.success(`Marked as ${status}`); load(); }
    else toast.error(res.error ?? "Failed");
  }

  const pendingFollowUps = logs.filter((l) => l.status === "sent" || l.status === "opened");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vendor Outreach</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{logs.length} total · {pendingFollowUps.length} awaiting reply</p>
        </div>
        <Link href="/fuel/vendors" className="text-sm text-[#0A2342] dark:text-blue-400 hover:underline flex items-center gap-1">
          <Send className="w-3.5 h-3.5" /> Send outreach from vendor profile
        </Link>
      </div>

      {pendingFollowUps.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{pendingFollowUps.length} outreach awaiting response — consider marking replied, bounced, or not interested</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 flex-wrap">
        {["", "pending", "sent", "opened", "replied", "bounced", "not_interested"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-[#0A2342] text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <Mail className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No outreach logged</p>
          <p className="text-sm text-gray-400 mt-1">Open a vendor profile and send an outreach step</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {logs.map((log) => {
              const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
              return (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/fuel/vendors/${log.vendor.id}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:underline">{log.vendor.name}</Link>
                        {log.vendor.city && <span className="text-xs text-gray-400">{log.vendor.city}</span>}
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400">{STEP_LABELS[log.step]}</span>
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      </div>
                      {log.subject && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 italic">{log.subject}</p>}
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {log.sentAt && <span>Sent {new Date(log.sentAt).toLocaleDateString("en-CA")}</span>}
                        {log.repliedAt && <span className="text-green-600">Replied {new Date(log.repliedAt).toLocaleDateString("en-CA")}</span>}
                        {log.bouncedAt && <span className="text-red-600">Bounced {new Date(log.bouncedAt).toLocaleDateString("en-CA")}</span>}
                        {log.notes && <span>{log.notes}</span>}
                      </div>
                    </div>
                    {["sent", "opened"].includes(log.status) && (
                      <div className="flex gap-1 flex-wrap">
                        {["replied", "bounced", "not_interested"].map((s) => (
                          <button
                            key={s}
                            onClick={() => markStatus(log.id, s)}
                            disabled={updating === log.id}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                              s === "replied" ? "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400" :
                              s === "bounced" ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400" :
                              "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400"
                            }`}
                          >
                            {s.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
