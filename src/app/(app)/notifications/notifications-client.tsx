"use client";
import { useState, useEffect, useCallback } from "react";
import { Send, History, Users, MapPin, Bell } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Badge, Modal, FormField, Input, Textarea, Select, EmptyState } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const sendNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
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

interface Props {
  campaignId: string;
  currentUserId: string;
  canSend: boolean;
}

export default function NotificationsClient({ campaignId, currentUserId, canSend }: Props) {
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ subscribers: 0, sent: 0 });

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/history?campaignId=${campaignId}`);
      const data = await res.json();
      setHistory(data.data || []);
    } catch (error) {
      console.error("Failed to load notification history:", error);
      toast.error("Failed to load notification history");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadStats = useCallback(async () => {
    try {
      // Get subscriber count
      const subRes = await fetch(`/api/notifications/subscribe`, {
        method: "HEAD", // Just check if endpoint exists and user can access
      });
      // For now, we'll show history count as sent count
      setStats({
        subscribers: 0, // TODO: Add API to get subscriber count
        sent: history.length,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, [history.length]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send notification");
      }

      const result = await res.json();
      toast.success(`Notification sent to ${result.data.sent} subscribers`);
      setShowSend(false);
      loadHistory(); // Refresh history
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  }, [campaignId, loadHistory]);

  const form = useForm<SendNotificationInput>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      title: "",
      body: "",
      role: [],
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Send push notifications to campaign volunteers and view history"
        actions={
          canSend && (
            <Button size="sm" onClick={() => setShowSend(true)}>
              <Send className="w-3.5 h-3.5 mr-2" />
              Send Notification
            </Button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.subscribers}</p>
                <p className="text-sm text-gray-500">Active Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                <p className="text-sm text-gray-500">Notifications Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">100%</p>
                <p className="text-sm text-gray-500">Delivery Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Notification History</h3>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-10 h-10" />}
              title="No notifications sent"
              description="Send your first push notification to campaign volunteers."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Recipients</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sent By</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {notification.body}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {notification.sent} sent
                        </Badge>
                        {notification.failed > 0 && (
                          <Badge variant="danger">
                            {notification.failed} failed
                          </Badge>
                        )}
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

      {/* Send Notification Modal */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="Send Push Notification"
      >
        <form onSubmit={form.handleSubmit(sendNotification)} className="space-y-4">
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <Input
              {...form.register("title")}
              placeholder="e.g., GOTV Alert: Vote Today!"
            />
          </FormField>

          <FormField label="Message" error={form.formState.errors.body?.message}>
            <Textarea
              {...form.register("body")}
              placeholder="Enter your notification message..."
              rows={3}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ward (optional)">
              <Input
                {...form.register("ward")}
                placeholder="e.g., Ward 1"
              />
            </FormField>

            <FormField label="Riding (optional)">
              <Input
                {...form.register("riding")}
                placeholder="e.g., Toronto Centre"
              />
            </FormField>
          </div>

          <FormField label="Target Roles (optional)">
            <Select
              value={form.watch("role")?.[0] || ""}
              onChange={(e) => form.setValue("role", e.target.value ? [e.target.value] : [])}
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CAMPAIGN_MANAGER">Campaign Manager</option>
              <option value="VOLUNTEER">Volunteer</option>
            </Select>
          </FormField>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowSend(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="flex-1">
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}