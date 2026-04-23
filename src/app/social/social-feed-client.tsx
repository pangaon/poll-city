"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Megaphone, FileText, Building2,
  ChevronRight, ArrowRight, CheckCircle,
  Clock, TrendingUp, Sparkles, Vote, Sun, Moon,
  Heart, MessageCircle, Share2, Zap, Send, X,
  Smartphone, MapPin, Plus, Users,
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
  _type: "post";
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

interface PollOption {
  id: string;
  text: string;
}

interface CommunityPollItem {
  _type: "community_poll";
  id: string;
  question: string;
  type: "binary" | "multiple_choice";
  options: PollOption[];
  totalResponses: number;
  targetRegion: string | null;
  endsAt: string | null;
  createdAt: string;
  createdByName: string;
  userVoted: boolean;
  userVoteValue: string | null;
  userVoteOptionId: string | null;
}

type FeedItem = FeedPost | CommunityPollItem;

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
        className="relative bg-white dark:bg-[#0F1923] rounded-t-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <p className="font-black text-gray-900 dark:text-white text-sm">
            {count > 0 ? `${count} Comments` : "Comments"}
          </p>
          <button onClick={onClose} className="p-1 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {loading && <Shimmer className="h-10 w-full" />}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-white/30 text-center py-4">
              No comments yet. Be the first.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0A2342] dark:bg-white/10 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                {(c.user.name ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{c.user.name ?? "Anonymous"}</span>
                  <span className="text-[10px] text-gray-400 dark:text-white/30">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-white/70 mt-0.5 leading-relaxed">{c.body}</p>
                {c.replies?.map((r) => (
                  <div key={r.id} className="mt-2 ml-3 flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-white/50 text-[9px] font-black flex-shrink-0">
                      {(r.user.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-900 dark:text-white">{r.user.name ?? "Anonymous"}</span>
                      <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2 p-3 border-t border-gray-100 dark:border-white/[0.06]">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={userId ? "Write a comment…" : "Sign in to comment"}
            disabled={!userId || submitting}
            maxLength={500}
            className="flex-1 text-sm bg-gray-100 dark:bg-white/[0.06] rounded-full px-3 py-2 outline-none placeholder-gray-400 dark:placeholder-white/30 text-gray-900 dark:text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!body.trim() || !userId || submitting}
            className="p-2 rounded-full bg-[#00D4C8] text-[#080D14] disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── FeedCard (politician posts) ───────────────────────────────────────────────

function FeedCard({
  post: initialPost,
  userId,
  onOpenComments,
}: {
  post: FeedPost;
  userId?: string;
  onOpenComments: (postId: string, count: number) => void;
}) {
  const cfg = POST_TYPE_CONFIG[initialPost.postType];
  const [reacted, setReacted] = useState(initialPost.userReacted);
  const [reactionCount, setReactionCount] = useState(initialPost.reactionCount);
  const [reacting, setReacting] = useState(false);

  async function toggleReact() {
    if (!userId) { toast.error("Sign in to react to posts"); return; }
    if (reacting) return;

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

        <button
          onClick={() => onOpenComments(initialPost.id, initialPost.commentCount)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-400 dark:text-white/30 hover:text-[#00D4C8] hover:bg-[#00D4C8]/10 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          {initialPost.commentCount > 0 && <span>{initialPost.commentCount.toLocaleString()}</span>}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-400 dark:text-white/30 hover:text-[#00D4C8] hover:bg-[#00D4C8]/10 transition-all ml-auto"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {initialPost.postType === "poll" && initialPost.poll && (
          <span className="text-[11px] font-bold text-[#00D4C8]">
            {initialPost.poll.totalResponses.toLocaleString()} votes
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Community Poll Card ────────────────────────────────────────────────────────

interface PollResults {
  counts: Record<string, number>;
  totalResponses: number;
}

function CommunityPollFeedCard({
  item: initialItem,
  userId,
}: {
  item: CommunityPollItem;
  userId?: string;
}) {
  const [voted, setVoted] = useState(initialItem.userVoted);
  const [voteValue, setVoteValue] = useState<string | null>(initialItem.userVoteValue);
  const [voteOptionId, setVoteOptionId] = useState<string | null>(initialItem.userVoteOptionId);
  const [totalResponses, setTotalResponses] = useState(initialItem.totalResponses);
  const [results, setResults] = useState<PollResults | null>(null);
  const [voting, setVoting] = useState(false);

  async function fetchResults(pollId: string) {
    try {
      const res = await fetch(`/api/social/polls/${pollId}`);
      const data = await res.json();
      if (data.data) {
        setResults({ counts: data.data.counts ?? {}, totalResponses: data.data.totalResponses });
        setTotalResponses(data.data.totalResponses);
      }
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    if (voted) fetchResults(initialItem.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function castVote(value?: string, optionId?: string) {
    if (voted || voting) return;
    if (!userId) { toast.error("Sign in to vote"); return; }

    setVoting(true);
    try {
      const body: Record<string, string> = {};
      if (value) body.value = value;
      if (optionId) body.optionId = optionId;

      const res = await fetch(`/api/polls/${initialItem.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        toast.error("You have already voted on this poll");
        setVoted(true);
        await fetchResults(initialItem.id);
        return;
      }
      if (!res.ok) throw new Error();

      setVoted(true);
      if (value) setVoteValue(value);
      if (optionId) setVoteOptionId(optionId);
      await fetchResults(initialItem.id);
      toast.success("Vote recorded");
    } catch {
      toast.error("Could not record vote");
    } finally {
      setVoting(false);
    }
  }

  const total = results?.totalResponses ?? totalResponses;

  function pct(count: number) {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="rounded-2xl border bg-white dark:bg-[#0F1923] border-gray-200 dark:border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border border-[#00D4C8]/50 text-[#00D4C8] dark:bg-[#00D4C8]/10 bg-teal-50">
              <Users className="w-2.5 h-2.5" />COMMUNITY POLL
            </span>
            {initialItem.targetRegion && (
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/15 dark:text-white/60 text-gray-500 dark:bg-white/5 bg-gray-100">
                {initialItem.targetRegion.toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400 dark:text-white/30 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo(initialItem.createdAt)}
          </span>
        </div>

        <h3 className="font-black text-gray-900 dark:text-white text-[17px] leading-snug tracking-tight">
          {initialItem.question}
        </h3>
        <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
          Asked by {initialItem.createdByName}
        </p>
      </div>

      {/* Voting / Results */}
      <div className="px-4 pb-4">
        {voted && results ? (
          // Results view
          <div className="space-y-2">
            {initialItem.type === "binary" ? (
              ["yes", "no"].map((val) => {
                const count = results.counts[val] ?? 0;
                const p = pct(count);
                const isMyVote = voteValue === val;
                return (
                  <div key={val} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-bold uppercase tracking-wide", isMyVote ? "text-[#00D4C8]" : "text-gray-600 dark:text-white/60")}>
                        {val === "yes" ? "✓ Yes" : "✗ No"}
                        {isMyVote && " · your vote"}
                      </span>
                      <span className="font-black text-gray-900 dark:text-white">{p}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", isMyVote ? "bg-[#00D4C8]" : "bg-gray-300 dark:bg-white/20")}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              initialItem.options.map((opt) => {
                const count = results.counts[opt.id] ?? 0;
                const p = pct(count);
                const isMyVote = voteOptionId === opt.id;
                return (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-semibold truncate pr-2", isMyVote ? "text-[#00D4C8]" : "text-gray-600 dark:text-white/60")}>
                        {opt.text}{isMyVote && " · your vote"}
                      </span>
                      <span className="font-black text-gray-900 dark:text-white flex-shrink-0">{p}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", isMyVote ? "bg-[#00D4C8]" : "bg-gray-300 dark:bg-white/20")}
                      />
                    </div>
                  </div>
                );
              })
            )}
            <p className="text-[11px] text-gray-400 dark:text-white/30 text-right pt-1">
              {total.toLocaleString()} {total === 1 ? "vote" : "votes"}
            </p>
          </div>
        ) : voted && !results ? (
          // Voted but results still loading
          <div className="space-y-2">
            <Shimmer className="h-8 w-full !rounded-lg" />
            <Shimmer className="h-8 w-full !rounded-lg" />
          </div>
        ) : (
          // Voting buttons
          <div className="space-y-2">
            {initialItem.type === "binary" ? (
              <div className="flex gap-2">
                {["yes", "no"].map((val) => (
                  <button
                    key={val}
                    onClick={() => castVote(val)}
                    disabled={voting}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-black tracking-wide border transition-all",
                      val === "yes"
                        ? "border-[#00D4C8]/30 text-[#00D4C8] bg-[#00D4C8]/5 hover:bg-[#00D4C8]/15"
                        : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20",
                      voting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {val === "yes" ? "✓ Yes" : "✗ No"}
                  </button>
                ))}
              </div>
            ) : (
              initialItem.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => castVote(undefined, opt.id)}
                  disabled={voting}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-left border transition-all",
                    "border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70",
                    "hover:border-[#00D4C8]/30 hover:text-[#00D4C8]",
                    voting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {opt.text}
                </button>
              ))
            )}
            {!userId && (
              <p className="text-[11px] text-gray-400 dark:text-white/30 text-center">
                <Link href="/signin" className="text-[#00D4C8] hover:underline">Sign in</Link> to vote
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-white/30 text-right">
              {totalResponses.toLocaleString()} {totalResponses === 1 ? "vote" : "votes"} · anonymous
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Create Poll Drawer ─────────────────────────────────────────────────────────

function CreatePollDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"binary" | "multiple_choice">("binary");
  const [options, setOptions] = useState(["", ""]);
  const [durationDays, setDurationDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => i === idx ? val : o));
  }

  function addOption() {
    if (options.length < 6) setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || submitting) return;
    if (type === "multiple_choice" && options.filter((o) => o.trim()).length < 2) {
      toast.error("Add at least 2 options");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/social/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          type,
          options: type === "multiple_choice" ? options.filter((o) => o.trim()) : undefined,
          durationDays,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Poll created and published");
      onCreated();
      onClose();
    } catch {
      toast.error("Could not create poll");
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
        className="relative bg-white dark:bg-[#0F1923] rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <p className="font-black text-gray-900 dark:text-white text-sm">Ask the community</p>
          <button onClick={onClose} className="p-1 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* Question */}
          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1.5">
              Your question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask your ward or city something that matters…"
              maxLength={500}
              rows={3}
              className="w-full text-sm bg-gray-100 dark:bg-white/[0.06] rounded-xl px-3 py-2.5 outline-none placeholder-gray-400 dark:placeholder-white/30 text-gray-900 dark:text-white resize-none"
            />
            <p className="text-[10px] text-gray-400 dark:text-white/25 text-right mt-1">{question.length}/500</p>
          </div>

          {/* Poll type */}
          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1.5">
              Answer type
            </label>
            <div className="flex gap-2">
              {(["binary", "multiple_choice"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black tracking-wide border transition-all",
                    type === t
                      ? "bg-[#00D4C8]/10 border-[#00D4C8]/40 text-[#00D4C8]"
                      : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50"
                  )}
                >
                  {t === "binary" ? "Yes / No" : "Multiple choice"}
                </button>
              ))}
            </div>
          </div>

          {/* MC options */}
          {type === "multiple_choice" && (
            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1.5">
                Options
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      maxLength={200}
                      className="flex-1 text-sm bg-gray-100 dark:bg-white/[0.06] rounded-xl px-3 py-2 outline-none placeholder-gray-400 dark:placeholder-white/30 text-gray-900 dark:text-white"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-xs text-[#00D4C8] hover:underline font-bold"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1.5">
              Duration
            </label>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationDays(d)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black border transition-all",
                    durationDays === d
                      ? "bg-[#0A2342] border-[#0A2342] text-white dark:bg-white/10 dark:border-white/30"
                      : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50"
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 dark:text-white/30">
            Your poll is anonymous — votes cannot be traced back to individual voters.
            It will be visible to people in your area.
          </p>
        </form>

        <div className="p-4 border-t border-gray-100 dark:border-white/[0.06]">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={submit}
            disabled={!question.trim() || submitting}
            className="w-full py-3 rounded-xl bg-[#00D4C8] text-[#080D14] font-black text-sm tracking-wide disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Publishing…" : "Publish Poll"}
          </motion.button>
        </div>
      </motion.div>
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
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscovery, setIsDiscovery] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ postId: string; count: number } | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
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
        setItems((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setItems(data.data ?? []);
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

  function handleCloseComments(updatedCount?: number) {
    if (commentTarget && updatedCount !== undefined) {
      setItems((prev) =>
        prev.map((item) =>
          item._type === "post" && item.id === commentTarget.postId
            ? { ...item, commentCount: updatedCount }
            : item
        )
      );
    }
    setCommentTarget(null);
  }

  return (
    <>
      <AppDownloadBanner />
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#080D14]">
        {/* Sticky header — offset by PCSHeader height */}
        <div className="sticky top-[57px] z-20 bg-[#F0F4F8]/95 dark:bg-[#080D14]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06]">
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
          </div>
        </div>

        {/* Feed content */}
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

          {/* LOCAL — needs location */}
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
            </div>
          ))}

          {/* Empty state */}
          {!loading && items.length === 0 && (
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

          {/* Feed items */}
          {!loading && items.length > 0 && (
            <>
              {items.map((item) =>
                item._type === "community_poll" ? (
                  <CommunityPollFeedCard key={`poll-${item.id}`} item={item} userId={userId} />
                ) : (
                  <FeedCard
                    key={`post-${item.id}`}
                    post={item}
                    userId={userId}
                    onOpenComments={(postId, count) => setCommentTarget({ postId, count })}
                  />
                )
              )}
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

        {/* FAB — create poll (signed-in users only) */}
        {userId && (
          <motion.button
            whileTap={{ scale: 0.93 }}
            transition={spring}
            onClick={() => setShowCreatePoll(true)}
            className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[#00D4C8] text-[#080D14] shadow-lg shadow-[#00D4C8]/30 flex items-center justify-center"
            aria-label="Ask the community a question"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
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

      {/* Create Poll Drawer */}
      <AnimatePresence>
        {showCreatePoll && (
          <CreatePollDrawer
            onClose={() => setShowCreatePoll(false)}
            onCreated={() => loadFeed()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
