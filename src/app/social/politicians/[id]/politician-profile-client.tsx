"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Bell, BellOff, BarChart2,
  MessageSquare, Globe, Mail, Phone, ThumbsUp, ThumbsDown,
  Megaphone, FileText, Building2, TrendingUp, Twitter,
  Facebook, Instagram, ChevronDown, ChevronUp, Star,
  Heart, X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

type PostType = "poll" | "announcement" | "civic_update" | "bill_update" | "project_update";

interface Post {
  id: string;
  postType: PostType;
  title: string;
  body: string;
  pollId: string | null;
  imageUrl: string | null;
  createdAt: string;
  poll: { id: string; question: string; type: string; totalResponses: number; isActive: boolean } | null;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  upvotes: number;
  createdAt: string;
  user: { name: string | null };
}

interface ApprovalRating {
  approvalPct: number;
  disapprovalPct: number;
  neutralPct: number;
  totalSignals: number;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  slug: string;
  candidateName: string | null;
  candidateTitle: string | null;
  logoUrl: string | null;
}

interface CampaignConsent {
  campaignId: string;
  consentId: string;
  signalType: string;
  isActive: boolean;
}

interface Politician {
  id: string;
  name: string;
  title: string;
  level: string;
  district: string;
  party: string | null;
  partyName: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  photoUrl: string | null;
  subscriptionStatus: string | null;
  isClaimed: boolean;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  province: string | null;
  _count: { follows: number; questions: number; politicianPosts: number };
  campaigns: Campaign[];
  campaignConsents: CampaignConsent[];
  approvalRating: ApprovalRating | null;
  politicianPosts: Post[];
  questions: Question[];
  isFollowing: boolean;
  notificationPreference: string | null;
}

const POST_TYPE_ICONS: Record<PostType, React.ElementType> = {
  poll: BarChart2,
  announcement: Megaphone,
  civic_update: Building2,
  bill_update: FileText,
  project_update: TrendingUp,
};

const POST_TYPE_LABELS: Record<PostType, string> = {
  poll: "Poll",
  announcement: "Announcement",
  civic_update: "Civic Update",
  bill_update: "Bill Update",
  project_update: "Project Update",
};

const LEVEL_COLORS: Record<string, string> = {
  municipal: "bg-emerald-100 text-emerald-700",
  provincial: "bg-blue-100 text-blue-700",
  federal: "bg-purple-100 text-purple-700",
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

export default function PoliticianProfileClient() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "questions">("posts");
  const [expandedBio, setExpandedBio] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  // campaignId → consentId (present = active consent, undefined = not consented)
  const [consentMap, setConsentMap] = useState<Record<string, string>>({});
  const [consentLoading, setConsentLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/politicians/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setPolitician(data.data);
      setFollowing(data.data.isFollowing);
      // Seed consent map from API response
      const map: Record<string, string> = {};
      for (const c of (data.data.campaignConsents ?? []) as CampaignConsent[]) {
        if (c.isActive) map[c.campaignId] = c.consentId;
      }
      setConsentMap(map);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!session?.user) {
      toast.error("Sign in to follow officials");
      return;
    }
    setFollowLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/social/officials/${id}/follow`, { method });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFollowing(!following);
      if (politician) {
        setPolitician({
          ...politician,
          _count: {
            ...politician._count,
            follows: politician._count.follows + (following ? -1 : 1),
          },
        });
      }
      if (!following && json.data?.bridgeFired) {
        toast.success("Following — campaign team has been notified of your support");
      } else {
        toast.success(following ? "Unfollowed" : "Following — you will be notified of new posts");
      }
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  }

  async function sendCampaignConsent(campaign: Campaign) {
    if (!session?.user) { toast.error("Sign in to support this campaign"); return; }
    setConsentLoading((prev) => ({ ...prev, [campaign.id]: true }));
    try {
      const res = await fetch("/api/social/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialId: id,
          campaignSlug: campaign.slug,
          type: "general_support",
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const consentId = json.data?.consentId as string | undefined;
      if (consentId) {
        setConsentMap((prev) => ({ ...prev, [campaign.id]: consentId }));
      }
      toast.success(`You're supporting ${campaign.candidateName ?? campaign.name}`);
    } catch {
      toast.error("Failed to send support signal");
    } finally {
      setConsentLoading((prev) => ({ ...prev, [campaign.id]: false }));
    }
  }

  async function revokeCampaignConsent(campaignId: string, consentId: string) {
    setConsentLoading((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const res = await fetch(`/api/social/consent/${consentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConsentMap((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      toast.success("Consent revoked");
    } catch {
      toast.error("Failed to revoke consent");
    } finally {
      setConsentLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  }

  async function submitQuestion() {
    if (!session?.user) { toast.error("Sign in to ask a question"); return; }
    if (!askQuestion.trim()) return;
    setAskSubmitting(true);
    try {
      const res = await fetch(`/api/officials/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuestion }),
      });
      if (!res.ok) throw new Error();
      toast.success("Question submitted — the official will be notified");
      setAskQuestion("");
      load();
    } catch {
      toast.error("Failed to submit question");
    } finally {
      setAskSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-6 space-y-4">
        <Shimmer className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Shimmer className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-24" />
          </div>
        </div>
        <Shimmer className="h-24 w-full" />
        <Shimmer className="h-32 w-full" />
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="px-4 pt-12 pb-6 text-center">
        <p className="text-gray-500">Profile not found.</p>
        <Link href="/social/officials" className="mt-4 inline-block text-blue-600 text-sm font-medium hover:underline">
          Browse officials
        </Link>
      </div>
    );
  }

  const p = politician;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/social/officials" className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <p className="font-semibold text-gray-900 text-sm truncate flex-1">{p.name}</p>
        {following && <Bell className="w-4 h-4 text-blue-500" />}
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #143A6B)` }} className="px-5 pt-6 pb-6 text-white">
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 border-2 border-white/30"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{p.name}</h1>
              {p.subscriptionStatus === "verified" && (
                <CheckCircle className="w-4 h-4 text-blue-300" />
              )}
            </div>
            <p className="text-blue-200 text-sm">{p.title}</p>
            <p className="text-blue-300 text-xs">{p.district}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", LEVEL_COLORS[p.level] ?? "bg-gray-100 text-gray-600")}>
                {p.level}
              </span>
              {p.partyName && (
                <span className="text-xs text-blue-200">{p.partyName}</span>
              )}
            </div>

            {/* Running for / campaigning */}
            {p.campaigns.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.campaigns.map((c) => (
                  <span key={c.id} className="text-xs px-2 py-1 bg-white/15 rounded-full text-blue-100">
                    🗳 Running · {c.candidateTitle ?? c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow button */}
        <button
          onClick={toggleFollow}
          disabled={followLoading}
          className={cn(
            "mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]",
            following
              ? "bg-white/15 border border-white/30 text-white hover:bg-white/25"
              : "bg-white text-blue-900 hover:bg-blue-50"
          )}
        >
          {following ? (
            <><BellOff className="w-4 h-4" /> Following</>
          ) : (
            <><Bell className="w-4 h-4" /> Follow</>
          )}
        </button>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Followers", value: p._count.follows },
            { label: "Posts", value: p._count.politicianPosts },
            { label: "Questions", value: p._count.questions },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-white/10 rounded-xl py-2">
              <p className="text-lg font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-blue-200">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Campaign consent cards — shown when official has active campaigns */}
        {p.campaigns.length > 0 && session?.user && p.campaigns.map((campaign) => {
          const hasConsent = !!consentMap[campaign.id];
          const isLoading = !!consentLoading[campaign.id];
          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="rounded-2xl border p-4 shadow-sm"
              style={{ borderColor: GREEN, background: hasConsent ? "#f0fdf7" : "white" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: hasConsent ? GREEN : "#e5f7ef" }}>
                  <Heart className="w-4 h-4" style={{ color: hasConsent ? "white" : GREEN }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {hasConsent
                      ? `Supporting ${campaign.candidateName ?? campaign.name}`
                      : `${campaign.candidateName ?? p.name} is running`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasConsent
                      ? "The campaign team has been notified of your support."
                      : "Allow this campaign to keep you informed about their efforts."}
                  </p>
                </div>
                {hasConsent ? (
                  <button
                    onClick={() => revokeCampaignConsent(campaign.id, consentMap[campaign.id])}
                    disabled={isLoading}
                    className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Revoke consent"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => sendCampaignConsent(campaign)}
                    disabled={isLoading}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity disabled:opacity-50 min-h-[36px]"
                    style={{ background: GREEN }}
                  >
                    {isLoading ? "…" : "Support"}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Approval rating */}
        {p.approvalRating && p.approvalRating.totalSignals > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Approval Rating</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" style={{ color: GREEN }} />
                <span className="text-lg font-bold" style={{ color: GREEN }}>{p.approvalRating.approvalPct}%</span>
              </div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full rounded-l-full" style={{ width: `${p.approvalRating.approvalPct}%`, background: GREEN }} />
                <div className="h-full" style={{ width: `${p.approvalRating.neutralPct}%`, background: AMBER }} />
                <div className="h-full rounded-r-full" style={{ width: `${p.approvalRating.disapprovalPct}%`, background: "#E24B4A" }} />
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-500">{p.approvalRating.disapprovalPct}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">{p.approvalRating.totalSignals.toLocaleString()} signals · Updated {timeAgo(p.approvalRating.updatedAt)}</p>
          </motion.div>
        )}

        {/* Bio */}
        {p.bio && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">About</p>
            <p className={cn("text-sm text-gray-700 leading-relaxed", !expandedBio && "line-clamp-3")}>
              {p.bio}
            </p>
            {p.bio.length > 200 && (
              <button
                onClick={() => setExpandedBio(!expandedBio)}
                className="mt-1 text-xs text-blue-600 font-medium flex items-center gap-0.5 hover:underline"
              >
                {expandedBio ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More</>}
              </button>
            )}
          </div>
        )}

        {/* Contact + socials */}
        {(p.email || p.phone || p.website || p.twitter) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Contact</p>
            <div className="space-y-2">
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline min-h-[44px]">
                  <Mail className="w-4 h-4 text-gray-400" /> {p.email}
                </a>
              )}
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline min-h-[44px]">
                  <Phone className="w-4 h-4 text-gray-400" /> {p.phone}
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline min-h-[44px]">
                  <Globe className="w-4 h-4 text-gray-400" /> Website
                </a>
              )}
              <div className="flex gap-3 pt-1">
                {p.twitter && (
                  <a href={`https://twitter.com/${p.twitter}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <Twitter className="w-4 h-4 text-gray-600" />
                  </a>
                )}
                {p.facebook && (
                  <a href={p.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <Facebook className="w-4 h-4 text-gray-600" />
                  </a>
                )}
                {p.instagram && (
                  <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <Instagram className="w-4 h-4 text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Posts / Questions tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["posts", "questions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab === "posts" ? `Posts (${p._count.politicianPosts})` : `Q&A (${p._count.questions})`}
              </button>
            ))}
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {activeTab === "posts" ? (
                <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {p.politicianPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No posts yet</p>
                    </div>
                  ) : (
                    p.politicianPosts.map((post) => {
                      const Icon = POST_TYPE_ICONS[post.postType] ?? Building2;
                      const isExpanded = expandedPost === post.id;
                      return (
                        <div key={post.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-start gap-2 mb-1.5">
                            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-500">{POST_TYPE_LABELS[post.postType]}</p>
                                <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(post.createdAt)}</p>
                              </div>
                              <p className="font-semibold text-gray-900 text-sm mt-0.5">{post.title}</p>
                            </div>
                          </div>
                          <p className={cn("text-sm text-gray-600 leading-relaxed", !isExpanded && "line-clamp-2")}>
                            {post.body}
                          </p>
                          {post.body.length > 120 && (
                            <button
                              onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                              className="mt-1 text-xs text-blue-600 font-medium hover:underline"
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                          {post.poll && (
                            <Link
                              href={`/social/polls/${post.poll.id}`}
                              className="mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg"
                            >
                              <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-xs font-medium text-blue-700 flex-1 truncate">{post.poll.question}</span>
                              <span className="text-xs text-blue-500">{post.poll.totalResponses} votes</span>
                            </Link>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              ) : (
                <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {/* Ask a question */}
                  <div className="border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Ask a public question
                    </p>
                    <textarea
                      value={askQuestion}
                      onChange={(e) => setAskQuestion(e.target.value)}
                      placeholder="Ask something publicly…"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={submitQuestion}
                      disabled={askSubmitting || !askQuestion.trim()}
                      className="mt-2 px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity min-h-[36px]"
                      style={{ background: GREEN }}
                    >
                      {askSubmitting ? "Submitting…" : "Submit Question"}
                    </button>
                  </div>

                  {p.questions.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No questions yet — ask the first one</p>
                    </div>
                  ) : (
                    p.questions.map((q) => (
                      <div key={q.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 leading-snug">{q.question}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {q.user.name ?? "Resident"} · {timeAgo(q.createdAt)}
                              {q.upvotes > 0 && <span className="ml-1">· <Star className="w-2.5 h-2.5 inline text-amber-400" /> {q.upvotes}</span>}
                            </p>
                            {q.answer && (
                              <div className="mt-2 pl-3 border-l-2 border-emerald-200">
                                <p className="text-xs font-semibold text-emerald-600 mb-0.5">
                                  {p.name} replied · {timeAgo(q.answeredAt!)}
                                </p>
                                <p className="text-sm text-gray-700">{q.answer}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
