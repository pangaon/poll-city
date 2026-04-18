"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Users, BarChart2, Megaphone, FileText, Building2,
  Bell, ChevronRight, RefreshCw, ArrowRight, CheckCircle,
  Clock, TrendingUp, Sparkles, Vote,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

type PostType = "poll" | "announcement" | "civic_update" | "bill_update" | "project_update";

interface OfficialSnippet {
  id: string;
  name: string;
  title: string;
  level: string;
  district: string;
  photoUrl: string | null;
  subscriptionStatus: string | null;
}

interface PollSnippet {
  id: string;
  question: string;
  type: string;
  totalResponses: number;
  isActive: boolean;
}

interface FeedPost {
  id: string;
  postType: PostType;
  title: string;
  body: string;
  authorName: string;
  imageUrl: string | null;
  municipalScope: string | null;
  createdAt: string;
  officialId: string | null;
  official: OfficialSnippet | null;
  poll: PollSnippet | null;
}

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  poll:          { icon: BarChart2,  label: "Poll",          color: "text-blue-600",   bg: "bg-blue-50" },
  announcement:  { icon: Megaphone,  label: "Announcement",  color: "text-amber-600",  bg: "bg-amber-50" },
  civic_update:  { icon: Building2,  label: "Civic Update",  color: "text-emerald-600", bg: "bg-emerald-50" },
  bill_update:   { icon: FileText,   label: "Bill Update",   color: "text-purple-600", bg: "bg-purple-50" },
  project_update:{ icon: TrendingUp, label: "Project Update", color: "text-orange-600", bg: "bg-orange-50" },
};

const LEVEL_COLORS: Record<string, string> = {
  municipal: "bg-emerald-100 text-emerald-700",
  provincial: "bg-blue-100 text-blue-700",
  federal: "bg-purple-100 text-purple-700",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

function FeedCard({ post }: { post: FeedPost }) {
  const cfg = POST_TYPE_CONFIG[post.postType] ?? POST_TYPE_CONFIG.civic_update;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Author row */}
      {post.official && (
        <Link
          href={`/social/politicians/${post.official.id}`}
          className="flex items-center gap-3 px-4 pt-4 pb-0 group"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: NAVY }}
          >
            {post.official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                {post.official.name}
              </p>
              {post.official.subscriptionStatus === "verified" && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {post.official.title} · {post.official.district}
            </p>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(post.createdAt)}
          </span>
        </Link>
      )}

      {/* Post type badge + title */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          {post.official && (
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", LEVEL_COLORS[post.official.level] ?? "bg-gray-100 text-gray-600")}>
              {post.official.level}
            </span>
          )}
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{post.title}</h3>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed line-clamp-3">{post.body}</p>
      </div>

      {/* Embedded poll CTA */}
      {post.postType === "poll" && post.poll && (
        <div className="mx-4 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Active Poll
          </p>
          <p className="text-sm font-medium text-gray-900 leading-snug">{post.poll.question}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{post.poll.totalResponses.toLocaleString()} responses</span>
            <Link
              href={`/social/polls/${post.poll.id}`}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Vote <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function SocialFeedClient() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);

    try {
      const url = cursor ? `/api/social/feed?cursor=${cursor}` : "/api/social/feed";
      const res = await fetch(url);
      const data = await res.json();
      if (cursor) {
        setPosts((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setPosts(data.data ?? []);
        setIsDiscovery(data.isDiscovery ?? false);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          loadFeed(nextCursor);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadFeed]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #143A6B)` }} className="px-5 pt-10 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Vote className="w-4 h-4 text-blue-300" />
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Poll City Social</span>
            </div>
            <h1 className="text-xl font-bold">Your Civic Feed</h1>
          </div>
          <button
            onClick={() => loadFeed()}
            className="p-2 bg-white/15 rounded-full hover:bg-white/25 transition-colors"
            aria-label="Refresh feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Quick nav strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { href: "/social/officials", label: "Find Officials", icon: Users },
            { href: "/social/polls", label: "Polls", icon: BarChart2 },
            { href: "/social/groups", label: "Groups", icon: Home },
            { href: "/social/notifications", label: "Alerts", icon: Bell },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white/15 border border-white/20 rounded-full text-xs font-medium text-white hover:bg-white/25 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {/* Discovery CTA */}
        <AnimatePresence>
          {isDiscovery && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">You are not following anyone yet</p>
                <p className="text-xs text-blue-700 mt-0.5">Follow local officials to see their posts, polls, and announcements here.</p>
                <Link
                  href="/social/officials"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Find your local officials <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed content */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Shimmer className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-3.5 w-32" />
                  <Shimmer className="h-3 w-24" />
                </div>
              </div>
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-5/6" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Vote className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <p className="font-semibold text-gray-700">No posts yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {session?.user
                ? "Follow local officials to populate your feed."
                : "Sign in to follow officials and see their posts here."}
            </p>
            <Link
              href="/social/officials"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
              style={{ background: GREEN }}
            >
              Find Officials <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
            {loadingMore && (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Shimmer key={i} className="h-40 w-full" />
                ))}
              </div>
            )}
            {!nextCursor && posts.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4">You are caught up.</p>
            )}
          </>
        )}

        <div ref={bottomRef} className="h-1" />

        {/* Election countdown teaser */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AMBER }}>
            <Vote className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Ontario Municipal Elections</p>
            <p className="text-xs text-gray-500">October 2026 · Track your ward candidates</p>
          </div>
          <Link
            href="/social/officials"
            className="text-xs font-semibold text-blue-600 flex-shrink-0 flex items-center gap-0.5 hover:underline"
          >
            View <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
