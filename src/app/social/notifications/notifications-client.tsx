"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Bell, BellOff, BarChart2, Megaphone, Building2,
  FileText, TrendingUp, CheckCheck, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

interface OfficialSnippet {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
}

interface SocialNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  postId: string | null;
  officialId: string | null;
  official: OfficialSnippet | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  new_poll:    BarChart2,
  announcement: Megaphone,
  civic_update: Building2,
  bill_update:  FileText,
  project_update: TrendingUp,
  new_post:    Building2,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

export default function NotificationsClient() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }
    fetch("/api/social/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.data ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await fetch("/api/social/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch("/api/social/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #143A6B)` }} className="px-5 pt-10 pb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Bell className="w-4 h-4 text-blue-300" />
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Notifications</span>
            </div>
            <h1 className="text-xl font-bold">
              Alerts
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-red-500 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/25 rounded-full text-xs font-medium hover:bg-white/25 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {markingAll ? "…" : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-2">
        {!session?.user ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <p className="font-semibold text-gray-700">Sign in to see notifications</p>
            <p className="text-sm text-gray-400 mt-1">Follow officials to get notified of posts, polls, and announcements.</p>
            <Link
              href="/social/officials"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
              style={{ background: GREEN }}
            >
              Find Officials
            </Link>
          </div>
        ) : loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-3">
              <Shimmer className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3.5 w-48" />
                <Shimmer className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <p className="font-semibold text-gray-700">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Follow local officials — you will be notified when they post polls, announcements, or civic updates.
            </p>
            <Link
              href="/social/officials"
              className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-blue-600 hover:underline"
            >
              Find Officials <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          notifications.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.03 }}
                onClick={() => !n.isRead && markRead(n.id)}
                className={cn(
                  "bg-white rounded-2xl border p-4 flex items-start gap-3 cursor-pointer transition-colors",
                  n.isRead ? "border-gray-200" : "border-blue-200 bg-blue-50/40"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    n.isRead ? "bg-gray-100" : "bg-blue-100"
                  )}
                >
                  {n.official ? (
                    <span className="text-sm font-bold text-gray-600">
                      {n.official.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </span>
                  ) : (
                    <Icon className={cn("w-4 h-4", n.isRead ? "text-gray-400" : "text-blue-600")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold leading-snug", n.isRead ? "text-gray-700" : "text-gray-900")}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  {n.official && (
                    <p className="text-xs text-gray-500 mt-0.5">{n.official.name} · {n.official.title}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  {n.postId && n.officialId && (
                    <Link
                      href={`/social/politicians/${n.officialId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                    >
                      View post <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
