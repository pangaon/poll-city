"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Send, History, Users, Bell, CalendarClock, BarChart3, Loader2,
  X, Check, AlertTriangle, Globe, Smartphone, Monitor, Clock, Trash2,
  ChevronRight, Shield,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = "compose" | "history" | "subscribers" | "stats";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  filters: unknown;
  sent: number;
  failed: number;
  total: number;
  sentBy: string;
  sentAt: string;
  openedCount?: number;
  clickCount?: number;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: string;
  status: string;
}

interface Subscriber {
  id: string;
  userId: string;
  name: string;
  email: string;
  device: string;
  subscribedAt: string;
}

interface Stats {
  totals: { total: number; delivered: number; failed: number };
  deliveryRate: number;
  recent: Array<{ title: string; sentAt: string; totalSubscribers: number; deliveredCount: number; failedCount: number }>;
}

interface Props {
  campaignId: string;
  currentUserId: string;
  canSend: boolean;
  voterOptInCount: number;
}

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "compose", label: "Compose", icon: Send },
  { id: "history", label: "History", icon: History },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DeviceIcon({ device }: { device: string }) {
  if (device.includes("Android")) return <Smartphone className="w-3.5 h-3.5 text-green-600" />;
  if (device.includes("Safari")) return <Globe className="w-3.5 h-3.5 text-blue-600" />;
  return <Monitor className="w-3.5 h-3.5 text-slate-500" />;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsClient({ campaignId, canSend, voterOptInCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("compose");
  const [history, setHistory] = useState<NotificationLog[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ totals: { total: 0, delivered: 0, failed: 0 }, deliveryRate: 0, recent: [] });
  const [loading, setLoading] = useState(false);

  // Compose state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/notifications/history?campaignId=${campaignId}`);
    const data = await res.json();
    setHistory(data.data || []);
  }, [campaignId]);

  const loadScheduled = useCallback(async () => {
    const res = await fetch(`/api/notifications/schedule?campaignId=${campaignId}`);
    const data = await res.json();
    setScheduled(data.data || []);
  }, [campaignId]);

  const loadSubscribers = useCallback(async () => {
    const res = await fetch(`/api/notifications/subscribe?campaignId=${campaignId}`);
    const data = await res.json();
    setSubscribers(data.data || []);
  }, [campaignId]);

  const loadStats = useCallback(async () => {
    const res = await fetch(`/api/notifications/stats?campaignId=${campaignId}`);
    const data = await res.json();
    setStats(data.data || { totals: { total: 0, delivered: 0, failed: 0 }, deliveryRate: 0, recent: [] });
  }, [campaignId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadHistory(), loadScheduled(), loadStats()]).finally(() => setLoading(false));
  }, [loadHistory, loadScheduled, loadStats]);

  useEffect(() => {
    if (activeTab === "subscribers") loadSubscribers();
  }, [activeTab, loadSubscribers]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const payload: Record<string, unknown> = {
        campaignId,
        title: title.trim(),
        body: body.trim(),
        ...(url.trim() ? { data: { url: url.trim() } } : {}),
        ...(scheduleDate ? { scheduledFor: new Date(scheduleDate).toISOString() } : {}),
      };
      const endpoint = scheduleDate ? "/api/notifications/schedule" : "/api/notifications/send";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const msg = scheduleDate
        ? `Scheduled for ${fmtDate(scheduleDate)}`
        : `Sent to ${data.data?.sent ?? 0} subscribers (${data.data?.failed ?? 0} failed)`;
      setSendResult({ ok: true, message: msg });
      toast.success(msg);
      setTitle("");
      setBody("");
      setUrl("");
      setScheduleDate("");
      await Promise.all([loadHistory(), loadScheduled(), loadStats()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      setSendResult({ ok: false, message: msg });
      toast.error(msg);
    }
    setSending(false);
  }

  async function cancelScheduled(id: string) {
    const res = await fetch(`/api/notifications/schedule?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to cancel"); return; }
    toast.success("Cancelled");
    await loadScheduled();
  }

  const bodyLength = body.length;
  const deviceBreakdown = subscribers.reduce<Record<string, number>>((acc, s) => {
    const type = s.device.split("/")[0];
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Push alerts to opted-in subscribers — GOTV nudges, event reminders, campaign updates</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Opt-Ins", value: voterOptInCount, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Total Sent", value: stats.totals.total, icon: Send, color: "text-slate-600 bg-slate-100" },
          { label: "Delivered", value: stats.totals.delivered, icon: Check, color: "text-green-600 bg-green-50" },
          { label: "Delivery Rate", value: `${stats.deliveryRate}%`, icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{m.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: COMPOSE ──────────────────────────────────────── */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Composer */}
          <div className="lg:col-span-3 space-y-4">
            {!canSend && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">You don&apos;t have permission to send push notifications. Ask your campaign manager for the <strong>comms:send</strong> permission.</p>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Title</label>
                  <span className={`text-[11px] tabular-nums ${title.length > 50 ? "text-amber-600 font-semibold" : "text-slate-400"}`}>{title.length}/50 — keep short for lock screen display</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Election day reminder"
                  className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  disabled={!canSend}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Message</label>
                  <span className={`text-[11px] tabular-nums ${bodyLength > 120 ? "text-red-600 font-semibold" : bodyLength > 100 ? "text-amber-600" : "text-slate-400"}`}>{bodyLength}/120</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">Maximum 120 characters — appears as the notification body on all devices</p>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 120))}
                  placeholder="Polls close at 8pm. Every vote counts."
                  className="w-full px-3 py-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                  disabled={!canSend}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Link URL <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">When tapped, opens this URL in the subscriber&apos;s browser. Leave blank to just dismiss.</p>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://vote.poll.city/..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  disabled={!canSend}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Schedule <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">Leave blank to send now. Set a time for future delivery — great for morning GOTV reminders.</p>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  disabled={!canSend}
                />
                {scheduleDate && (
                  <button onClick={() => setScheduleDate("")} className="ml-2 text-xs text-slate-400 hover:text-red-500">Clear</button>
                )}
              </div>

              {/* CASL note */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Only sent to subscribers who explicitly opted in through the public voter portal. CASL-compliant by design.</p>
              </div>

              {sendResult && (
                <div className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${sendResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  {sendResult.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  {sendResult.message}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !canSend || !title.trim() || !body.trim()}
                className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : scheduleDate ? (
                  <><Clock className="w-4 h-4" /> Schedule Send</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Now — {voterOptInCount.toLocaleString()} subscribers</>
                )}
              </button>
            </div>

            {/* Scheduled queue */}
            {scheduled.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700">Scheduled ({scheduled.length})</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {scheduled.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                        <p className="text-xs text-slate-500 truncate">{s.body}</p>
                        <p className="text-[11px] text-blue-600 mt-0.5">{fmtDate(s.scheduledFor)}</p>
                      </div>
                      <button
                        onClick={() => cancelScheduled(s.id)}
                        className="ml-3 shrink-0 h-7 px-3 rounded-md text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Device Preview</p>
              {/* Phone mockup */}
              <div className="bg-slate-900 rounded-2xl p-4 mx-auto max-w-[260px]">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/80">Poll City</span>
                    <span className="ml-auto text-[10px] text-white/50">now</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">{title || "Notification title"}</p>
                  <p className="text-xs text-white/70 mt-1 leading-snug">{body || "Your message appears here."}</p>
                  {url && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-300">
                      <Globe className="w-3 h-3" />
                      <span className="truncate">{url}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Title length</span>
                  <span className={title.length > 50 ? "text-amber-600 font-semibold" : "text-slate-700"}>{title.length}/50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Body length</span>
                  <span className={bodyLength > 100 ? "text-amber-600 font-semibold" : "text-slate-700"}>{bodyLength}/120</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Audience</span>
                  <span className="text-slate-700 font-semibold">{voterOptInCount.toLocaleString()} subscribers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORY ──────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Send History</h3>
            <p className="text-xs text-slate-400 mt-0.5">All push notifications sent from this campaign</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No notifications sent yet</p>
              <p className="text-xs text-slate-400 mt-1">Compose your first push notification to see history here.</p>
              <button onClick={() => setActiveTab("compose")} className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline">
                Go to Compose <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notification</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivered</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Failed</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">By</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[240px]">{n.title}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{n.body}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{n.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 font-semibold">{n.sent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={n.failed > 0 ? "text-red-600 font-semibold" : "text-slate-400"}>{n.failed.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">{n.sentBy}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{fmtDate(n.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SUBSCRIBERS ──────────────────────────────────── */}
      {activeTab === "subscribers" && (
        <div className="space-y-5">
          {/* Device breakdown */}
          {subscribers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(deviceBreakdown).map(([type, count]) => (
                <div key={type} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                  <DeviceIcon device={type} />
                  <div>
                    <p className="text-xs text-slate-500">{type}</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums">{count}</p>
                  </div>
                </div>
              ))}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">{subscribers.length}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Opt-In Management</h3>
              <p className="text-xs text-slate-400 mt-0.5">Users who have subscribed to push notifications from this campaign</p>
            </div>
            {subscribers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Smartphone className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-500">No subscribers yet</p>
                <p className="text-xs text-slate-400 mt-1">Supporters opt in through the public voter portal. Share your campaign link to grow your list.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscriber</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Device</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subscribers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon device={s.device} />
                            <span className="text-xs text-slate-600">{s.device}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{fmtDate(s.subscribedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: STATS ────────────────────────────────────────── */}
      {activeTab === "stats" && (
        <div className="space-y-5">
          {/* Funnel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">All-Time Delivery Funnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Total Sent", value: stats.totals.total, color: "bg-slate-300", textColor: "text-slate-700" },
                { label: "Delivered", value: stats.totals.delivered, color: "bg-green-500", textColor: "text-green-700" },
                { label: "Failed", value: stats.totals.failed, color: "bg-red-400", textColor: "text-red-700" },
              ].map(({ label, value, color, textColor }) => {
                const pct = stats.totals.total > 0 ? Math.round((value / stats.totals.total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-lg font-bold tabular-nums ${textColor}`}>{value.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent sends */}
          {stats.recent.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700">Recent Sends</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent To</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivered</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Failed</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.recent.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 truncate max-w-[200px]">{r.title}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.totalSubscribers.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-700 font-semibold">{r.deliveredCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">{r.failedCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{fmtDate(r.sentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats.totals.total === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No sends yet</p>
              <p className="text-xs text-slate-400 mt-1">Send your first notification to start tracking delivery stats.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
