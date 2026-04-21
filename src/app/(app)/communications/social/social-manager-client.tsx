"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FieldHelp, WriteAssistTextarea } from "@/components/ui";
import {
  Share2, Plus, Send, Clock, CheckCircle2, XCircle, AlertCircle,
  MessageCircle, Loader2, Globe, Trash2, ChevronDown,
} from "lucide-react";

const PLATFORMS = ["x", "facebook", "instagram", "linkedin", "tiktok", "youtube", "threads", "bluesky"] as const;

const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
  threads: 500,
  bluesky: 300,
};

const PLATFORM_COLORS: Record<string, string> = {
  x: "#000000",
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  tiktok: "#000000",
  youtube: "#FF0000",
  threads: "#000000",
  bluesky: "#0085FF",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  pending_approval: { label: "Pending", color: "text-amber-700", bg: "bg-amber-100" },
  approved: { label: "Approved", color: "text-blue-700", bg: "bg-blue-100" },
  scheduled: { label: "Scheduled", color: "text-purple-700", bg: "bg-purple-100" },
  publishing: { label: "Publishing", color: "text-indigo-700", bg: "bg-indigo-100" },
  published: { label: "Published", color: "text-[#1D9E75]", bg: "bg-[#1D9E75]/10" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-100" },
  cancelled: { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-100" },
};

type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  displayName: string | null;
};

type SocialPost = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  targetPlatforms: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  socialAccount: SocialAccount | null;
  author: { id: string; name: string | null } | null;
};

type SocialMention = {
  id: string;
  platform: string;
  content: string;
  authorHandle: string | null;
  authorName: string | null;
  url: string | null;
  mentionedAt: string;
  needsResponse: boolean;
  sentiment: string;
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className ?? "h-16 w-full"}`}
    />
  );
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: "bg-emerald-500",
    neutral: "bg-slate-400",
    negative: "bg-red-500",
    mixed: "bg-amber-500",
    unknown: "bg-slate-300",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[sentiment] ?? colors.unknown}`}
      title={sentiment}
    />
  );
}

export default function SocialManagerClient({ campaignId }: { campaignId: string }) {
  const [activeTab, setActiveTab] = useState<"posts" | "accounts" | "mentions">("posts");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [mentions, setMentions] = useState<SocialMention[]>([]);
  const [loading, setLoading] = useState(true);

  // account form
  const [accountForm, setAccountForm] = useState({ platform: "x", handle: "", displayName: "" });
  const [addingAccount, setAddingAccount] = useState(false);

  // post form
  const [showComposer, setShowComposer] = useState(false);
  const [postForm, setPostForm] = useState({
    socialAccountId: "",
    title: "",
    content: "",
    scheduledFor: "",
    status: "draft" as string,
    targetPlatforms: [] as string[],
  });
  const [creatingPost, setCreatingPost] = useState(false);

  const [postFilter, setPostFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  // character limit based on selected platforms
  const activeCharLimit = useMemo(() => {
    if (postForm.targetPlatforms.length === 0) return 5000;
    return Math.min(
      ...postForm.targetPlatforms.map((p) => CHAR_LIMITS[p] ?? 5000)
    );
  }, [postForm.targetPlatforms]);

  const filteredPosts = useMemo(() => {
    if (postFilter === "all") return posts;
    return posts.filter((p) => p.status === postFilter);
  }, [posts, postFilter]);

  const unrespondedMentions = useMemo(
    () => mentions.filter((m) => m.needsResponse),
    [mentions]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [accountRes, postRes, mentionRes] = await Promise.all([
        fetch(`/api/communications/social/accounts?campaignId=${campaignId}`),
        fetch(`/api/communications/social/posts?campaignId=${campaignId}`),
        fetch(`/api/communications/social/mentions?campaignId=${campaignId}`),
      ]);
      const [accountData, postData, mentionData] = await Promise.all([
        accountRes.json(),
        postRes.json(),
        mentionRes.json(),
      ]);
      setAccounts(accountData.data ?? []);
      setPosts(postData.data ?? []);
      setMentions(mentionData.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function addAccount() {
    if (!accountForm.handle.trim()) return;
    setAddingAccount(true);
    try {
      const res = await fetch("/api/communications/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...accountForm }),
      });
      if (res.ok) {
        setAccountForm({ platform: "x", handle: "", displayName: "" });
        await loadAll();
      }
    } finally {
      setAddingAccount(false);
    }
  }

  async function createPost() {
    if (!postForm.content.trim()) return;
    setCreatingPost(true);
    try {
      const res = await fetch("/api/communications/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          socialAccountId: postForm.socialAccountId || undefined,
          title: postForm.title || undefined,
          content: postForm.content,
          scheduledFor: postForm.scheduledFor || undefined,
          status: postForm.status,
          targetPlatforms: postForm.targetPlatforms,
        }),
      });
      if (res.ok) {
        setPostForm({
          socialAccountId: accounts[0]?.id || "",
          title: "",
          content: "",
          scheduledFor: "",
          status: "draft",
          targetPlatforms: [],
        });
        setShowComposer(false);
        await loadAll();
      }
    } finally {
      setCreatingPost(false);
    }
  }

  async function updatePostStatus(id: string, status: string) {
    setBusy(true);
    try {
      await fetch(`/api/communications/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function resolveMention(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/communications/social/mentions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsResponse: false, respondedAt: new Date().toISOString() }),
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  function toggleTargetPlatform(platform: string) {
    setPostForm((c) => ({
      ...c,
      targetPlatforms: c.targetPlatforms.includes(platform)
        ? c.targetPlatforms.filter((p) => p !== platform)
        : [...c.targetPlatforms, platform],
    }));
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBlock key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <motion.header
        className="mb-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A2342] flex items-center gap-2">
          <Share2 className="w-7 h-7 text-[#1D9E75]" /> Social Media Manager
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage accounts, compose posts with platform limits, approval workflows,
          and monitor mentions.
        </p>
      </motion.header>

      {/* tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6">
        {(
          [
            { key: "posts" as const, label: "Posts", icon: Send },
            { key: "accounts" as const, label: "Accounts", icon: Globe },
            { key: "mentions" as const, label: `Mentions${unrespondedMentions.length > 0 ? ` (${unrespondedMentions.length})` : ""}`, icon: MessageCircle },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-md transition-colors min-h-[44px] flex items-center justify-center gap-1.5 ${
                activeTab === t.key
                  ? "bg-white text-[#0A2342] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ──── POSTS TAB ──── */}
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={spring}
            className="space-y-4"
          >
            {/* new post button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {["all", "draft", "pending_approval", "scheduled", "published"].map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setPostFilter(f)}
                      className={`shrink-0 min-h-[36px] px-3 text-xs font-semibold rounded-full border transition-colors ${
                        postFilter === f
                          ? "bg-[#0A2342] text-white border-[#0A2342]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]"
                      }`}
                    >
                      {f === "all"
                        ? "All"
                        : f === "pending_approval"
                          ? "Pending"
                          : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setShowComposer(!showComposer)}
                className="min-h-[44px] px-4 rounded-lg bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#1D9E75]/90 flex items-center gap-1.5 transition-colors shrink-0 ml-3"
              >
                <Plus className="w-4 h-4" /> New Post
              </button>
            </div>

            {/* composer */}
            <AnimatePresence>
              {showComposer && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  <div className="p-4 md:p-5 space-y-4">
                    <h2 className="font-bold text-[#0A2342] text-sm uppercase tracking-wide">
                      Compose Post
                    </h2>

                    {/* linked account + status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Account
                          <FieldHelp
                            content="The social media account this post will be linked to. You can leave this blank and just select Target Platforms below."
                            tip="Link a specific account if you manage multiple handles — useful for keeping constituency updates separate from personal posts."
                          />
                        </span>
                        <select
                          className="mt-1 w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                          value={postForm.socialAccountId}
                          onChange={(e) =>
                            setPostForm((c) => ({
                              ...c,
                              socialAccountId: e.target.value,
                            }))
                          }
                        >
                          <option value="">No linked account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.platform.toUpperCase()} &middot; {a.handle}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          Status
                          <FieldHelp
                            content="Controls whether this post needs approval before going out. Use Draft to save your work. Use Submit for Approval if another team member must review before publishing."
                            tip="Set up an approval workflow when volunteers or staff are posting on your behalf — it prevents anything going out without your sign-off."
                          />
                        </span>
                        <select
                          className="mt-1 w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                          value={postForm.status}
                          onChange={(e) =>
                            setPostForm((c) => ({ ...c, status: e.target.value }))
                          }
                        >
                          <option value="draft">Draft</option>
                          <option value="pending_approval">Submit for Approval</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="published">Published</option>
                        </select>
                      </label>
                    </div>

                    {/* target platforms */}
                    <div>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
                        Target Platforms
                        <FieldHelp
                          content="Choose which platforms this post is intended for. The character counter adjusts to the strictest limit across your selections."
                          tip="X (Twitter) has the tightest limit at 280 characters. If you're cross-posting to X, write to that limit first."
                        />
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map((p) => (
                          <button
                            key={p}
                            onClick={() => toggleTargetPlatform(p)}
                            className={`min-h-[36px] px-3 text-xs font-semibold rounded-full border transition-all ${
                              postForm.targetPlatforms.includes(p)
                                ? "text-white border-transparent"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                            style={{
                              backgroundColor: postForm.targetPlatforms.includes(p)
                                ? PLATFORM_COLORS[p]
                                : undefined,
                            }}
                          >
                            {p}
                            {postForm.targetPlatforms.includes(p) && (
                              <span className="ml-1 text-[10px] opacity-80">
                                {CHAR_LIMITS[p].toLocaleString()}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        Post title (optional)
                        <FieldHelp
                          content="An internal label for this post — only you and your team see it. Useful for organising your content calendar."
                          example="GOTV Week 2 — Facebook reminder post"
                        />
                      </label>
                      <input
                        className="w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors text-sm"
                        placeholder="e.g. GOTV Week 2 — Facebook reminder"
                        value={postForm.title}
                        onChange={(e) =>
                          setPostForm((c) => ({ ...c, title: e.target.value }))
                        }
                      />
                    </div>

                    {/* content */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        Post content <span className="text-red-500">*</span>
                        <FieldHelp
                          content="The text of your social media post. The character counter reflects the strictest limit of your selected platforms."
                          example="Proud to support affordable housing in Ward 3. Tonight I met with residents who've been waiting years for action. This is why I'm running. 🏘️ #Ward3Votes"
                          tip="Posts with a question or a clear call to action get more engagement. End with what you want people to do — share, comment, visit your website."
                        />
                      </label>
                      <WriteAssistTextarea
                        className="border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:ring-0 text-sm min-h-[120px]"
                        placeholder="Write your post here. Keep it conversational — write the way you'd talk to a neighbour at the door."
                        value={postForm.content}
                        onChange={(v) =>
                          setPostForm((c) => ({ ...c, content: v }))
                        }
                        context="social-post"
                        campaignId={campaignId}
                        maxLength={activeCharLimit}
                      />
                      <div className="flex items-center justify-between mt-1">
                        {postForm.targetPlatforms.length > 0 && (
                          <p className="text-xs text-slate-500">
                            Limit:{" "}
                            {postForm.targetPlatforms
                              .map((p) => `${p} ${CHAR_LIMITS[p]}`)
                              .join(", ")}
                          </p>
                        )}
                        <p
                          className={`text-xs font-semibold tabular-nums ml-auto ${
                            postForm.content.length > activeCharLimit * 0.9
                              ? "text-red-600"
                              : "text-slate-400"
                          }`}
                        >
                          {postForm.content.length.toLocaleString()}/
                          {activeCharLimit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* schedule */}
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Schedule (optional)
                        <FieldHelp
                          content="Set a date and time to publish this post automatically. Leave blank to save as a draft and publish manually later."
                          tip="Social posts perform best between 7–9 AM, 12–1 PM, and 7–9 PM when voters are on their phones."
                        />
                      </span>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full max-w-xs min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors text-sm"
                        value={postForm.scheduledFor}
                        onChange={(e) =>
                          setPostForm((c) => ({
                            ...c,
                            scheduledFor: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={createPost}
                        disabled={creatingPost || !postForm.content.trim()}
                        className="min-h-[44px] px-5 rounded-lg bg-[#0A2342] text-white font-semibold text-sm hover:bg-[#0A2342]/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                      >
                        {creatingPost ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Save Post
                      </button>
                      <button
                        onClick={() => setShowComposer(false)}
                        className="min-h-[44px] px-4 rounded-lg border-2 border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* posts list */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <Send className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg font-bold text-slate-700">No posts yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create your first social media post above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                            >
                              {statusCfg.label}
                            </span>
                            {post.targetPlatforms?.map((p) => (
                              <span
                                key={p}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                                style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#666" }}
                              >
                                {p}
                              </span>
                            ))}
                            {post.socialAccount && (
                              <span className="text-[10px] text-slate-500">
                                {post.socialAccount.handle}
                              </span>
                            )}
                          </div>
                          {post.title && (
                            <p className="font-semibold text-[#0A2342] text-sm">
                              {post.title}
                            </p>
                          )}
                          <p className="text-sm text-slate-700 mt-1 line-clamp-3">
                            {post.content}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            {post.scheduledFor
                              ? `Scheduled: ${new Date(post.scheduledFor).toLocaleString()}`
                              : post.publishedAt
                                ? `Published: ${new Date(post.publishedAt).toLocaleString()}`
                                : `Created: ${new Date(post.createdAt).toLocaleString()}`}
                            {post.author?.name && ` by ${post.author.name}`}
                          </p>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                        {post.status === "draft" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              updatePostStatus(post.id, "pending_approval")
                            }
                            className="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" /> Submit for Approval
                          </button>
                        )}
                        {post.status === "pending_approval" && (
                          <button
                            disabled={busy}
                            onClick={() => updatePostStatus(post.id, "approved")}
                            className="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/5 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                        )}
                        {["draft", "approved", "pending_approval"].includes(
                          post.status
                        ) && (
                          <button
                            disabled={busy}
                            onClick={() => updatePostStatus(post.id, "scheduled")}
                            className="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> Schedule
                          </button>
                        )}
                        {["scheduled", "approved"].includes(post.status) && (
                          <button
                            disabled={busy}
                            onClick={() => updatePostStatus(post.id, "published")}
                            className="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-[#1D9E75] text-white hover:bg-[#1D9E75]/90 transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Publish
                          </button>
                        )}
                        {!["published", "cancelled", "failed"].includes(
                          post.status
                        ) && (
                          <button
                            disabled={busy}
                            onClick={() => updatePostStatus(post.id, "cancelled")}
                            className="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ──── ACCOUNTS TAB ──── */}
        {activeTab === "accounts" && (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={spring}
            className="space-y-4"
          >
            {/* add form */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
              <h2 className="font-bold text-[#0A2342] text-sm uppercase tracking-wide">
                Connect Account
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    Platform
                    <FieldHelp
                      content="The social media platform where your campaign account lives. Each platform has different character limits for posts."
                      tip="Start with the platforms your target voters use most. For municipal candidates, Facebook and X are most common."
                    />
                  </label>
                  <select
                    className="w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                    value={accountForm.platform}
                    onChange={(e) =>
                      setAccountForm((c) => ({ ...c, platform: e.target.value }))
                    }
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    Handle
                    <FieldHelp
                      content="Your username on that platform, including the @ symbol. This is used to identify your account in posts and mentions."
                      example="@janesmith_ward3"
                    />
                  </label>
                  <input
                    className="w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors text-sm"
                    placeholder="@janesmith_ward3"
                    value={accountForm.handle}
                    onChange={(e) =>
                      setAccountForm((c) => ({ ...c, handle: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    Display name
                    <FieldHelp
                      content="The friendly name shown on your profile — usually your full name or campaign name."
                      example="Jane Smith for Ward 3"
                    />
                  </label>
                  <input
                    className="w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors text-sm"
                    placeholder="Jane Smith for Ward 3"
                    value={accountForm.displayName}
                    onChange={(e) =>
                      setAccountForm((c) => ({ ...c, displayName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button
                disabled={addingAccount || !accountForm.handle.trim()}
                onClick={addAccount}
                className="min-h-[44px] px-5 rounded-lg bg-[#0A2342] text-white font-semibold text-sm hover:bg-[#0A2342]/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {addingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Account
              </button>
            </section>

            {/* accounts list */}
            {accounts.length === 0 ? (
              <div className="text-center py-20">
                <Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg font-bold text-slate-700">
                  No accounts connected
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Add your first social media account above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: PLATFORM_COLORS[a.platform] ?? "#666",
                        }}
                      >
                        {a.platform.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0A2342] text-sm truncate">
                          {a.handle}
                        </p>
                        <p className="text-xs text-slate-500">
                          {a.platform.charAt(0).toUpperCase() + a.platform.slice(1)}
                          {a.displayName && ` -- ${a.displayName}`}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ──── MENTIONS TAB ──── */}
        {activeTab === "mentions" && (
          <motion.div
            key="mentions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
            className="space-y-4"
          >
            {mentions.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg font-bold text-slate-700">No mentions yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Mentions from social platforms will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mentions.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-xl border p-4 ${
                      m.needsResponse
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{
                              backgroundColor:
                                PLATFORM_COLORS[m.platform] ?? "#666",
                            }}
                          >
                            {m.platform}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {m.authorHandle ?? m.authorName ?? "Unknown"}
                          </span>
                          <SentimentDot sentiment={m.sentiment} />
                          <span className="text-[10px] text-slate-400">
                            {m.sentiment}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{m.content}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(m.mentionedAt).toLocaleString()}
                          {m.url && (
                            <>
                              {" "}
                              &middot;{" "}
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1D9E75] hover:underline"
                              >
                                View
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      {m.needsResponse && (
                        <button
                          disabled={busy}
                          onClick={() => resolveMention(m.id)}
                          className="min-h-[36px] px-3 text-xs font-semibold rounded-lg bg-[#1D9E75] text-white hover:bg-[#1D9E75]/90 transition-colors flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Responded
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
