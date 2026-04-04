"use client";
import { useState, useEffect, useCallback } from "react";
import { Send, History, Users, Bell, CalendarClock, BarChart3, FlaskConical, X } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Badge, Modal, FormField, Input, Textarea, Select, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const sendNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required").max(120, "Maximum 120 characters"),
  ward: z.string().optional(),
  riding: z.string().optional(),
  role: z.array(z.string()).optional(),
});

type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  filters: any;
  sent: number;
  failed: number;
  total: number;
  sentBy: string;
  sentAt: string;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: string;
  status: string;
}

interface StatsPayload {
  totals: { total: number; delivered: number; failed: number };
  deliveryRate: number;
}

interface Props {
  campaignId: string;
  currentUserId: string;
  canSend: boolean;
  voterOptInCount: number;
}

export default function NotificationsClient({ campaignId, canSend, voterOptInCount }: Props) {
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [stats, setStats] = useState<StatsPayload>({ totals: { total: 0, delivered: 0, failed: 0 }, deliveryRate: 0 });
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "schedule">("history");

  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleAudience, setScheduleAudience] = useState<"all" | "tags">("all");
  const [scheduleTags, setScheduleTags] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

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

  const loadStats = useCallback(async () => {
    const res = await fetch(`/api/notifications/stats?campaignId=${campaignId}`);
    const data = await res.json();
    setStats(data.data || { totals: { total: 0, delivered: 0, failed: 0 }, deliveryRate: 0 });
  }, [campaignId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadHistory(), loadScheduled(), loadStats()]);
    } catch {
      toast.error("Failed to load notifications data");
    } finally {
      setLoading(false);
    }
  }, [loadHistory, loadScheduled, loadStats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sendNotification = useCallback(async (data: SendNotificationInput) => {
    setSending(true);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          title: data.title,
          body: data.body,
          filters: {
            ward: data.ward || undefined,
            riding: data.riding || undefined,
            role: data.role?.length ? data.role : undefined,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send notification");

      toast.success(`Notification sent: ${result.data.sent} delivered, ${result.data.failed} failed`);
      setShowSend(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  }, [campaignId, loadAll]);

  const sendTestNotification = useCallback(async () => {
    setTestMessage(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed");
      const message = "Test notification sent to your current browser subscription.";
      setTestMessage(message);
      toast.success(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test send failed";
      setTestMessage(message);
      toast.error(message);
    }
  }, [campaignId]);

  const scheduleNotification = useCallback(async () => {
    if (!scheduleDate || !scheduleTime || !scheduleMessage) {
      toast.error("Date, time and message are required");
      return;
    }

    setScheduleSubmitting(true);
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      const res = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          title: "Scheduled Campaign Notification",
          body: scheduleMessage,
          scheduledFor: scheduledFor.toISOString(),
          audience: {
            type: scheduleAudience,
            tags: scheduleAudience === "tags"
              ? scheduleTags.split(",").map((t) => t.trim()).filter(Boolean)
              : [],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");

      toast.success("Notification scheduled");
      setScheduleMessage("");
      setScheduleDate("");
      setScheduleTime("");
      setScheduleTags("");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule notification");
    } finally {
      setScheduleSubmitting(false);
    }
  }, [campaignId, scheduleAudience, scheduleDate, scheduleMessage, scheduleTags, scheduleTime, loadAll]);

  const cancelScheduled = useCallback(async (id: string) => {
    const res = await fetch(`/api/notifications/schedule?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to cancel");
      return;
    }
    toast.success("Scheduled notification cancelled");
    await loadScheduled();
  }, [loadScheduled]);

  const form = useForm<SendNotificationInput>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: { title: "", body: "", role: [] },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Send instant push alerts, schedule future sends, and monitor delivery performance."
        actions={
          canSend && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={sendTestNotification}>
                <FlaskConical className="w-3.5 h-3.5 mr-2" />
                Send Test Notification
              </Button>
              <Button size="sm" onClick={() => setShowSend(true)}>
                <Send className="w-3.5 h-3.5 mr-2" />
                Send Notification
              </Button>
            </div>
          )
        }
      />

      {testMessage && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-sm text-blue-900">{testMessage}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">Voter Opt-Ins</p><p className="text-2xl font-bold">{voterOptInCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">Total Sent</p><p className="text-2xl font-bold">{stats.totals.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">Delivered</p><p className="text-2xl font-bold text-emerald-700">{stats.totals.delivered}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">Delivery Rate</p><p className="text-2xl font-bold text-blue-700">{stats.deliveryRate}%</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={activeTab === "history" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("history")}>
          <History className="w-4 h-4 mr-2" />History
        </Button>
        <Button variant={activeTab === "schedule" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("schedule")}>
          <CalendarClock className="w-4 h-4 mr-2" />Schedule
        </Button>
      </div>

      {activeTab === "schedule" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarClock className="w-5 h-5" /><h3 className="text-lg font-semibold">Schedule Notifications</h3></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Send Date"><Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></FormField>
              <FormField label="Send Time"><Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></FormField>
            </div>

            <FormField label="Message (max 120)">
              <Textarea value={scheduleMessage} onChange={(e) => setScheduleMessage(e.target.value.slice(0, 120))} rows={3} placeholder="Election day reminder..." />
              <p className="text-xs text-gray-500 mt-1">{scheduleMessage.length}/120</p>
            </FormField>

            <FormField label="Audience">
              <Select value={scheduleAudience} onChange={(e) => setScheduleAudience(e.target.value as "all" | "tags") }>
                <option value="all">All Subscribers</option>
                <option value="tags">Specific Tags</option>
              </Select>
            </FormField>

            {scheduleAudience === "tags" && (
              <FormField label="Tags (comma separated)">
                <Input value={scheduleTags} onChange={(e) => setScheduleTags(e.target.value)} placeholder="volunteer, ward-3, donor" />
              </FormField>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 max-w-sm">
              <p className="text-xs text-gray-500 mb-1">Phone Preview</p>
              <p className="text-sm font-semibold">Poll City Campaign Alert</p>
              <p className="text-sm text-gray-700">{scheduleMessage || "Your scheduled message preview will appear here."}</p>
            </div>

            <Button onClick={scheduleNotification} loading={scheduleSubmitting}>Schedule</Button>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-semibold text-sm mb-3">Scheduled Notifications</h4>
              {scheduled.length === 0 ? (
                <p className="text-sm text-gray-500">No scheduled notifications.</p>
              ) : (
                <div className="space-y-2">
                  {scheduled.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="font-medium text-sm">{item.body}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.scheduledFor)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => cancelScheduled(item.id)}>
                        <X className="w-4 h-4 mr-1" />Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /><h3 className="text-lg font-semibold">Delivery Statistics & History</h3></div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : history.length === 0 ? (
              <EmptyState icon={<Bell className="w-10 h-10" />} title="No notifications sent" description="Send your first push notification." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Stats</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Sent By</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium">{notification.title}</p><p className="text-xs text-gray-500 truncate max-w-xs">{notification.body}</p></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="success">Delivered: {notification.sent}</Badge>
                          <Badge variant="danger">Failed: {notification.failed}</Badge>
                          <Badge variant="info">Total: {notification.total}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">{notification.sentBy}</td>
                      <td className="px-4 py-3">{formatDate(notification.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showSend} onClose={() => setShowSend(false)} title="Send Push Notification">
        <form onSubmit={form.handleSubmit(sendNotification)} className="space-y-4">
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register("title")} placeholder="e.g., Election Day Reminder" />
          </FormField>

          <FormField label="Message" error={form.formState.errors.body?.message}>
            <Textarea {...form.register("body")} placeholder="Enter your message..." rows={3} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ward (optional)"><Input {...form.register("ward")} placeholder="Ward 1" /></FormField>
            <FormField label="Riding (optional)"><Input {...form.register("riding")} placeholder="Toronto Centre" /></FormField>
          </div>

          <FormField label="Target Role (optional)">
            <Select value={form.watch("role")?.[0] || ""} onChange={(e) => form.setValue("role", e.target.value ? [e.target.value] : [])}>
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CAMPAIGN_MANAGER">Campaign Manager</option>
              <option value="VOLUNTEER">Volunteer</option>
            </Select>
          </FormField>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowSend(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={sending} className="flex-1">{sending ? "Sending..." : "Send Notification"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
