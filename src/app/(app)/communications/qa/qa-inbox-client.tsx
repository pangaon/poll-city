"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, CheckCircle, Clock, Star, X, ChevronDown, ChevronUp,
  ExternalLink, Users, Megaphone, BarChart2, FileText, Building2, TrendingUp,
  PlusCircle, Send, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const GREEN = "#1D9E75";
const NAVY = "#0A2342";

interface Question {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  upvotes: number;
  createdAt: string;
  user: { name: string | null };
}

interface Post {
  id: string;
  postType: string;
  title: string;
  body: string;
  createdAt: string;
  isPublished: boolean;
}

interface Props {
  officialLinked: boolean;
  officialId: string | null;
  candidateName: string;
  followerCount: number;
  postCount: number;
  questionCount: number;
}

const POST_TYPES = [
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "civic_update", label: "Civic Update", icon: Building2 },
  { value: "project_update", label: "Project Update", icon: TrendingUp },
  { value: "bill_update", label: "Bill Update", icon: FileText },
  { value: "poll", label: "Poll", icon: BarChart2 },
] as const;

type PostType = (typeof POST_TYPES)[number]["value"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SocialHubClient({
  officialLinked, officialId, candidateName,
  followerCount, postCount, questionCount,
}: Props) {
  const [tab, setTab] = useState<"qa" | "posts">("qa");

  // Q&A state
  const [filter, setFilter] = useState<"unanswered" | "answered" | "all">("unanswered");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qaLoading, setQaLoading] = useState(true);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedAnswered, setExpandedAnswered] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postType, setPostType] = useState<PostType>("announcement");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [livePostCount, setLivePostCount] = useState(postCount);

  const loadQa = useCallback(async () => {
    setQaLoading(true);
    try {
      const param =
        filter === "unanswered" ? "?answered=false"
        : filter === "answered" ? "?answered=true"
        : "";
      const res = await fetch(`/api/social/questions${param}`);
      if (!res.ok) return;
      const json = await res.json();
      setQuestions(json.data ?? []);
    } finally {
      setQaLoading(false);
    }
  }, [filter]);

  const loadPosts = useCallback(async () => {
    if (!officialId) return;
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/social/posts?officialId=${officialId}&limit=20`);
      const json = await res.json();
      setPosts(json.data ?? []);
    } finally {
      setPostsLoading(false);
    }
  }, [officialId]);

  useEffect(() => { loadQa(); }, [loadQa]);
  useEffect(() => { if (tab === "posts") loadPosts(); }, [tab, loadPosts]);

  async function submitAnswer(questionId: string) {
    const text = answerText[questionId]?.trim();
    if (!text) return;
    setSubmitting(questionId);
    try {
      const res = await fetch(`/api/social/questions/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      toast.success("Answer published — the voter has been notified");
      setAnswering(null);
      setAnswerText((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
      if (filter === "unanswered") {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        loadQa();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish answer");
    } finally {
      setSubmitting(null);
    }
  }

  async function publishPost() {
    if (!postTitle.trim() || !postBody.trim()) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialId,
          postType,
          title: postTitle.trim(),
          body: postBody.trim(),
          isPublished: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to publish");
      }
      toast.success("Post published to Poll City Social — followers have been notified");
      setPostTitle("");
      setPostBody("");
      setPostType("announcement");
      setLivePostCount((c) => c + 1);
      loadPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish post");
    } finally {
      setPublishing(false);
    }
  }

  if (!officialLinked) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-lg font-semibold text-gray-700 mb-2">No official linked</p>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Link your campaign to an official profile in{" "}
          <Link href="/settings/campaign" className="text-blue-600 hover:underline">
            Campaign Settings
          </Link>{" "}
          to manage Q&amp;A and post updates to Poll City Social.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Poll City Social</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage <span className="font-medium">{candidateName}</span>&rsquo;s public presence on Poll City Social.
          </p>
        </div>
        {officialId && (
          <Link
            href={`/social/politicians/${officialId}`}
            target="_blank"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline shrink-0"
          >
            <Eye className="w-3 h-3" /> View public profile <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Followers", value: followerCount, icon: Users },
          { label: "Questions", value: questionCount, icon: MessageSquare },
          { label: "Posts", value: livePostCount, icon: Megaphone },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <Icon className="w-5 h-5 mx-auto mb-1 text-gray-400" />
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["qa", "posts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "qa" ? "Q&A Inbox" : "Post Update"}
          </button>
        ))}
      </div>

      {/* ── Q&A Tab ── */}
      <AnimatePresence mode="wait">
        {tab === "qa" && (
          <motion.div key="qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {(["unanswered", "answered", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {f === "unanswered" ? "Unanswered" : f === "answered" ? "Answered" : "All"}
                </button>
              ))}
            </div>

            {qaLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                {filter === "unanswered" ? (
                  <>
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                    <p className="font-semibold text-gray-700">All caught up</p>
                    <p className="text-sm text-gray-400 mt-1">No unanswered questions right now.</p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold text-gray-700">No questions yet</p>
                    <p className="text-sm text-gray-400 mt-1">Questions from voters on the public profile appear here.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {questions.map((q) => {
                    const isAnswering = answering === q.id;
                    const isExpanded = expandedAnswered === q.id;
                    return (
                      <motion.div
                        key={q.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={spring}
                        className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                              <span>{q.user.name ?? "Resident"}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {timeAgo(q.createdAt)}</span>
                              {q.upvotes > 0 && (
                                <><span>·</span><span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" /> {q.upvotes}</span></>
                              )}
                            </div>

                            {q.answer && (
                              <div className="mt-3 pl-3 border-l-2 border-emerald-200">
                                <p className="text-xs font-semibold text-emerald-600 mb-0.5">
                                  {candidateName} replied · {timeAgo(q.answeredAt!)}
                                </p>
                                <p className={cn("text-sm text-gray-700 leading-relaxed", !isExpanded && "line-clamp-2")}>
                                  {q.answer}
                                </p>
                                {q.answer.length > 120 && (
                                  <button onClick={() => setExpandedAnswered(isExpanded ? null : q.id)} className="mt-0.5 text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More</>}
                                  </button>
                                )}
                              </div>
                            )}

                            <AnimatePresence>
                              {isAnswering && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-3"
                                >
                                  <textarea
                                    autoFocus
                                    value={answerText[q.id] ?? ""}
                                    onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Write your public reply…"
                                    rows={3}
                                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => submitAnswer(q.id)}
                                      disabled={submitting === q.id || !answerText[q.id]?.trim()}
                                      className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity min-h-[36px]"
                                      style={{ background: GREEN }}
                                    >
                                      {submitting === q.id ? "Publishing…" : "Publish Answer"}
                                    </button>
                                    <button onClick={() => setAnswering(null)} className="px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {!isAnswering && (
                            <button
                              onClick={() => {
                                if (q.answer) setAnswerText((prev) => ({ ...prev, [q.id]: q.answer! }));
                                setAnswering(q.id);
                              }}
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px]"
                              style={q.answer ? { background: "#f3f4f6", color: "#374151" } : { background: NAVY, color: "white" }}
                            >
                              {q.answer ? "Edit Reply" : "Answer"}
                            </button>
                          )}
                          {isAnswering && (
                            <button onClick={() => setAnswering(null)} className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg">
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Posts Tab ── */}
        {tab === "posts" && (
          <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Create post */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-gray-400" />
                <p className="font-semibold text-gray-900 text-sm">Publish to Poll City Social</p>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Posts appear on {candidateName}&rsquo;s public profile and are pushed to all followers as notifications.
              </p>

              {/* Post type selector */}
              <div className="flex flex-wrap gap-2">
                {POST_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPostType(value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      postType === value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>

              <input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Headline (e.g. Ward 5 Community Budget Update)"
                maxLength={200}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <textarea
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="What do you want your constituents to know?"
                rows={4}
                maxLength={5000}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{postBody.length}/5000</p>
                <button
                  onClick={publishPost}
                  disabled={publishing || !postTitle.trim() || !postBody.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-opacity"
                  style={{ background: NAVY }}
                >
                  <Send className="w-4 h-4" />
                  {publishing ? "Publishing…" : "Publish Post"}
                </button>
              </div>
            </div>

            {/* Published posts */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Published Posts</p>
              {postsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-500">No posts published yet</p>
                  <p className="text-xs text-gray-400 mt-1">Use the form above to publish your first update.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => {
                    const cfg = POST_TYPES.find((t) => t.value === post.postType);
                    const Icon = cfg?.icon ?? Megaphone;
                    return (
                      <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.body}</p>
                            <p className="text-xs text-gray-400 mt-1.5">{timeAgo(post.createdAt)} · {cfg?.label ?? post.postType}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
