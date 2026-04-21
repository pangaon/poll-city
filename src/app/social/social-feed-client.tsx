"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Megaphone, FileText, Building2,
  ChevronRight, ArrowRight, CheckCircle,
  Clock, TrendingUp, Sparkles, Vote, Sun, Moon,
  Heart, MessageCircle, Share2, Zap, Send, X,
  Smartphone, MapPin,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CYAN = "#00D4C8";
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
  reactionCount: number;
  commentCount: number;
  userReacted: boolean;
  official: OfficialSnippet | null;
  poll: PollSnippet | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
  replies?: Comment[];
}

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ElementType; label: string }> = {
  poll:           { icon: BarChart2,   label: "POLL"           },
  announcement:   { icon: Megaphone,   label: "ANNOUNCEMENT"   },
  civic_update:   { icon: Building2,   label: "CIVIC UPDATE"   },
  bill_update:    { icon: FileText,    label: "BILL UPDATE"    },
  project_update: { icon: TrendingUp,  label: "PROJECT UPDATE" },
};

const LEVEL_TAG: Record<string, string> = {
  municipal: "LOCAL",
  provincial: "PROVINCIAL",
  federal: "FEDERAL",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.04]",
      className
    )} />
  );
}

function Tag({ children, hot }: { children: React.ReactNode; hot?: boolean }) {
  if (hot) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border border-[#00D4C8]/50 text-[#00D4C8] dark:bg-[#00D4C8]/10 bg-teal-50">
        <Zap className="w-2.5 h-2.5" />HOT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border border-white/20 dark:border-white/15 dark:text-white/60 text-gray-500 border-gray-300 dark:bg-white/5 bg-gray-100">
      {children}
    </span>
  );
}

// ── Comment Drawer ─────────────────────────────────────────────────────────────

function CommentDrawer({
  postId,
  onClose,
  initialCount,
  userId,
}: {
  postId: string;
  onClose: () => void;
  initialCount: number;
  userId?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/social/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    inputRef.current?.focus();
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        if (res.status === 401) { toast.error("Sign in to comment"); return; }
        throw new Error();
      }
      const { data } = await res.json();
      setComments((prev) => [...prev, data]);
      setCount((c) => c + 1);
      setBody("");
    } catch {
      toast.error("Could not post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={spring}
        className="relative bg-white dark:bg-[#0F1923] rounded-t-3xl max-h-[75vh] flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <p className="font-black text-gray-900 dark:text-white text-sm">
            {count === 1 ? "1 Comment" : `${count} Comments`}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Shimmer className="w-8 h-8 !rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Shimmer className="h-3 w-20 !rounded-md" />
                    <Shimmer className="h-3 w-full !rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-white/30 py-8">
              No comments yet. Be the first.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id}>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0A2342] dark:bg-white/10 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                  {(c.user.name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{c.user.name ?? "Voter"}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">{timeAgo(c.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/80 mt-0.5 leading-relaxed">{c.body}</p>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-white/60 text-[9px] font-black flex-shrink-0">
                        {(r.user.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="text-[11px] font-bold text-gray-800 dark:text-white/90">{r.user.name ?? "Voter"}</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/30">{timeAgo(r.createdAt)}</p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-white/70 mt-0.5 leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={submit} className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-2.5">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={userId ? "Add a comment…" : "Sign in to comment"}
            disabled={!userId || submitting}
            className="flex-1 bg-gray-100 dark:bg-white/[0.06] rounded-full px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 border-0 outline-none focus:ring-1 focus:ring-[#00D4C8] transition-all disabled:opacity-50"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!body.trim() || !userId || submitting}
            className="w-9 h-9 rounded-full bg-[#00D4C8] flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Send className="w-4 h-4 text-[#080D14]" />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Feed Card ──────────────────────────────────────────────────────────────────

function FeedCard({
  post: initialPost,
  userId,
  onOpenComments,
}: {
  post: FeedPost;
  userId?: string;
  onOpenComments: (postId: string, count: number) => void;
}) {
  const [reacted, setReacted] = useState(initialPost.userReacted);
  const [reactionCount, setReactionCount] = useState(initialPost.reactionCount);
  const [reacting, setReacting] = useState(false);
  const cfg = POST_TYPE_CONFIG[initialPost.postType] ?? POST_TYPE_CONFIG.civic_update;

  async function toggleReact() {
    if (!userId) { toast.error("Sign in to react"); return; }
    if (reacting) return;
    // Optimistic update
    const nextReacted = !reacted;
    setReacted(nextReacted);
    setReactionCount((c) => nextReacted ? c + 1 : c - 1);
    setReacting(true);
    try {
      const res = await fetch(`/api/social/posts/${initialPost.id}/react`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReacted(data.reacted);
      setReactionCount(data.reactionCount);
    } catch {
      // Revert optimistic update
      setReacted(!nextReacted);
      setReactionCount((c) => nextReacted ? c - 1 : c + 1);
      toast.error("Could not save reaction");
    } finally {
      setReacting(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/social/politicians/${initialPost.officialId}`;
    if (navigator.share) {
      navigator.share({ title: initialPost.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="rounded-2xl border bg-white dark:bg-[#0F1923] border-gray-200 dark:border-white/[0.06] overflow-hidden"
    >
      {/* Author row */}
      {initialPost.official && (
        <Link
          href={`/social/politicians/${initialPost.official.id}`}
          className="flex items-center gap-3 px-4 pt-4 pb-0 group"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0 bg-[#0A2342] dark:bg-white/10">
            {initialPost.official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#00D4C8] transition-colors truncate">
                {initialPost.official.name}
              </p>
              {initialPost.official.subscriptionStatus === "verified" && (
                <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/40 truncate uppercase tracking-wide">
              {initialPost.official.title} · {initialPost.official.district}
            </p>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-white/30 flex-shrink-0 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo(initialPost.createdAt)}
          </span>
        </Link>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-1.5 px-4 pt-3">
        {initialPost.official?.level && <Tag>{LEVEL_TAG[initialPost.official.level] ?? initialPost.official.level.toUpperCase()}</Tag>}
        <Tag>{cfg.label}</Tag>
        {initialPost.postType === "poll" && <Tag hot>HOT</Tag>}
      </div>

      {/* Content */}
      <div className="px-4 pt-2 pb-3">
        <h3 className="font-black text-gray-900 dark:text-white text-[17px] leading-snug tracking-tight">
          {initialPost.title}
        </h3>
        {initialPost.postType !== "poll" && (
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1.5 leading-relaxed line-clamp-2">
            {initialPost.body}
          </p>
        )}
      </div>

      {/* Embedded poll */}
      {initialPost.postType === "poll" && initialPost.poll && (
        <Link
          href={`/social/polls/${initialPost.poll.id}`}
          className="mx-4 mb-3 flex items-center justify-between p-3 rounded-xl bg-[#00D4C8]/10 dark:bg-[#00D4C8]/[0.08] border border-[#00D4C8]/20 group"
        >
          <div>
            <p className="text-[11px] font-bold text-[#009B91] dark:text-[#00D4C8] uppercase tracking-wider mb-0.5">Vote Now</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">{initialPost.poll.question}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#00D4C8] flex-shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Engagement footer */}
      <div className="flex items-center gap-1 px-3 pb-3 border-t border-gray-100 dark:border-white/[0.04] pt-2">
        {/* Like */}
        <button
          onClick={toggleReact}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all",
            reacted
              ? "text-red-500 bg-red-50 dark:bg-red-500/10"
              : "text-gray-400 dark:text-white/30 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          )}
        >
          <Heart className={cn("w-4 h-4", reacted && "fill-red-500")} />
          {reactionCount > 0 && <span>{reactionCount.toLocaleString()}</span>}
        </button>

        {/* Comment */}
        <button
          onClick={() => onOpenComments(initialPost.id, initialPost.commentCount)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-400 dark:text-white/30 hover:text-[#00D4C8] hover:bg-[#00D4C8]/10 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          {initialPost.commentCount > 0 && <span>{initialPost.commentCount.toLocaleString()}</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-400 dark:text-white/30 hover:text-[#00D4C8] hover:bg-[#00D4C8]/10 transition-all ml-auto"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Vote count for polls */}
        {initialPost.postType === "poll" && initialPost.poll && (
          <span className="text-[11px] font-bold text-[#00D4C8]">
            {initialPost.poll.totalResponses.toLocaleString()} votes
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── App Download Banner ────────────────────────────────────────────────────────

function AppDownloadBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const wasDismissed = sessionStorage.getItem("pcs-app-banner-dismissed") === "1";
    if (isMobile && !wasDismissed) setDismissed(false);
  }, []);

  function dismiss() {
    sessionStorage.setItem("pcs-app-banner-dismissed", "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={spring}
      className="sticky top-0 z-50 bg-[#0A2342] border-b border-[#00D4C8]/30 px-4 py-3 flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-xl bg-[#00D4C8]/20 flex items-center justify-center flex-shrink-0">
        <Smartphone className="w-5 h-5 text-[#00D4C8]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white leading-tight">Get the Poll City app</p>
        <p className="text-[10px] text-white/50 leading-tight">Better experience, push notifications</p>
      </div>
      <Link
        href="/download"
        className="px-3 py-1.5 rounded-full bg-[#00D4C8] text-[#080D14] text-[11px] font-black flex-shrink-0"
      >
        Get App
      </Link>
      <button onClick={dismiss} className="p-1 text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── Theme Toggle ───────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("pcs-theme");
    const dark = saved !== "light";
    setIsDark(dark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("pcs-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("pcs-theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun className="w-4 h-4 text-amber-400" />
        : <Moon className="w-4 h-4 text-gray-600" />
      }
    </button>
  );
}

// ── Main Feed ──────────────────────────────────────────────────────────────────

export default function SocialFeedClient() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<"for_you" | "local">("for_you");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ postId: string; count: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (tab === "local") params.set("local", "true");
      const res = await fetch(`/api/social/feed?${params}`);
      const data = await res.json();
      if (cursor) {
        setPosts((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setPosts(data.data ?? []);
        setIsDiscovery(data.isDiscovery ?? false);
        setNeedsLocation(data.needsLocation ?? false);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tab]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) loadFeed(nextCursor);
      },
      { threshold: 0.5 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadFeed]);

  // Update comment count in post list when drawer closes
  function handleCloseComments(updatedCount?: number) {
    if (commentTarget && updatedCount !== undefined) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentTarget.postId ? { ...p, commentCount: updatedCount } : p
        )
      );
    }
    setCommentTarget(null);
  }

  return (
    <>
      <AppDownloadBanner />
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#080D14]">
        {/* ── Feed header: FOR YOU / LOCAL tabs + theme toggle ── */}
        <div className="sticky top-0 z-20 bg-[#F0F4F8]/95 dark:bg-[#080D14]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06]">
          <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {(["for_you", "local"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase transition-all",
                    tab === t
                      ? "bg-white dark:bg-white text-[#080D14] shadow-sm"
                      : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70"
                  )}
                >
                  {t === "for_you" ? "FOR YOU" : "LOCAL"}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Feed content ── */}
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

          {/* LOCAL — needs location prompt */}
          <AnimatePresence>
            {needsLocation && !loading && tab === "local" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/[0.06] p-4 flex items-start gap-3"
              >
                <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Set your location to see local posts</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Enter your postal code so we can show you what is happening in your ward and city.</p>
                  <Link
                    href="/social/onboarding"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Set my location <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discovery CTA */}
          <AnimatePresence>
            {isDiscovery && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-[#00D4C8]/20 bg-[#00D4C8]/5 dark:bg-[#00D4C8]/[0.06] p-4 flex items-start gap-3"
              >
                <Sparkles className="w-5 h-5 text-[#00D4C8] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">You are not following anyone yet</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Follow local officials to see their posts here.</p>
                  <Link
                    href="/social/officials"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#00D4C8] hover:underline"
                  >
                    Find your representatives <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading skeletons */}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Shimmer className="w-9 h-9 !rounded-full" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-3 w-28 !rounded-md" />
                  <Shimmer className="h-2.5 w-20 !rounded-md" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Shimmer className="h-5 w-14 !rounded-full" />
                <Shimmer className="h-5 w-16 !rounded-full" />
              </div>
              <Shimmer className="h-5 w-3/4 !rounded-md" />
              <Shimmer className="h-3.5 w-full !rounded-md" />
              <Shimmer className="h-3.5 w-5/6 !rounded-md" />
            </div>
          ))}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-10 text-center">
              <Vote className="w-10 h-10 mx-auto mb-4 text-gray-300 dark:text-white/20" />
              <p className="font-bold text-gray-900 dark:text-white">No posts yet</p>
              <p className="text-sm text-gray-400 dark:text-white/40 mt-1">
                {session?.user ? "Follow officials to populate your feed." : "Sign in to follow officials."}
              </p>
              <Link
                href="/social/officials"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-[#080D14] bg-[#00D4C8] hover:bg-[#00BFB4] transition-colors"
              >
                Find Representatives <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Posts */}
          {!loading && posts.length > 0 && (
            <>
              {posts.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  userId={userId}
                  onOpenComments={(postId, count) => setCommentTarget({ postId, count })}
                />
              ))}
              {loadingMore && (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Shimmer key={i} className="h-40 w-full" />
                  ))}
                </div>
              )}
              {!nextCursor && (
                <p className="text-center text-xs text-gray-400 dark:text-white/25 py-4 tracking-wide">
                  You are caught up
                </p>
              )}
            </>
          )}

          <div ref={bottomRef} className="h-1" />

          {/* Election countdown */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EF9F27]">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm">Ontario Municipal Elections</p>
              <p className="text-xs text-gray-400 dark:text-white/40">October 2026 · Track your ward candidates</p>
            </div>
            <Link
              href="/social/officials"
              className="text-xs font-bold text-[#00D4C8] flex-shrink-0 flex items-center gap-0.5 hover:underline"
            >
              View <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Comment Drawer */}
      <AnimatePresence>
        {commentTarget && (
          <CommentDrawer
            postId={commentTarget.postId}
            initialCount={commentTarget.count}
            userId={userId}
            onClose={() => handleCloseComments()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
