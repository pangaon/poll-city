"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Bell,
  BellOff,
  BarChart2,
  MessageSquare,
  Globe,
  Mail,
  Phone,
  ThumbsUp,
  Megaphone,
  FileText,
  Building2,
  TrendingUp,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Star,
  Heart,
  X,
  Calendar,
  MapPin,
  Share2,
  Newspaper,
  CheckSquare,
  Clock,
  AlertCircle,
  ExternalLink,
  Shield,
  Video,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

type PostType = "poll" | "announcement" | "civic_update" | "bill_update" | "project_update" | "op_ed";

interface Post {
  id: string; postType: PostType; title: string; body: string;
  pollId: string | null; imageUrl: string | null; externalUrl: string | null; createdAt: string;
  poll: { id: string; question: string; type: string; totalResponses: number; isActive: boolean } | null;
}
interface Question {
  id: string; question: string; answer: string | null; answeredAt: string | null;
  upvotes: number; createdAt: string; user: { name: string | null };
}
interface ApprovalRating {
  approvalPct: number; disapprovalPct: number; neutralPct: number;
  totalSignals: number; score: number; netScore: number; updatedAt: string;
}
interface Campaign {
  id: string; name: string; slug: string; candidateName: string | null;
  candidateTitle: string | null; logoUrl: string | null; websiteUrl: string | null; electionDate: string | null;
}
interface CampaignConsent { campaignId: string; consentId: string; signalType: string; isActive: boolean; }
interface Promise {
  id: string; promise: string; madeAt: string; status: string;
  evidence: string | null; trackerCount: number;
}
interface Event {
  id: string; name: string; eventDate: string; location: string; city: string | null;
  description: string | null; eventType: string | null; isTownhall: boolean; isVirtual: boolean;
  virtualUrl: string | null; allowPublicRsvp: boolean; campaignSlug: string | null;
}
interface Priority { id: string; title: string; body: string; icon: string | null; category: string | null; }
interface Accomplishment { id: string; title: string; description: string; year: number | null; category: string | null; }
interface GalleryPhoto { id: string; url: string; caption: string | null; context: string | null; altText: string | null; }
interface Politician {
  id: string; name: string; title: string; level: string; district: string; districtCode: string | null;
  party: string | null; partyName: string | null; bio: string | null; email: string | null;
  phone: string | null; website: string | null; photoUrl: string | null; subscriptionStatus: string | null;
  isClaimed: boolean; twitter: string | null; facebook: string | null; instagram: string | null;
  linkedIn: string | null; province: string | null; termStart: string | null; termEnd: string | null;
  tagline: string | null; committeeRoles: unknown; profileMode: string;
  _count: { follows: number; questions: number; politicianPosts: number };
  campaigns: Campaign[]; campaignConsents: CampaignConsent[]; approvalRating: ApprovalRating | null;
  politicianPosts: Post[]; questions: Question[]; promises: Promise[]; events: Event[];
  priorities: Priority[]; accomplishments: Accomplishment[]; galleryPhotos: GalleryPhoto[];
  isFollowing: boolean; notificationPreference: string | null; isSubscribedToNewsletter: boolean;
}

const POST_TYPE_ICONS: Record<PostType, React.ElementType> = {
  poll: BarChart2, announcement: Megaphone, civic_update: Building2,
  bill_update: FileText, project_update: TrendingUp, op_ed: Newspaper,
};
const POST_TYPE_LABELS: Record<PostType, string> = {
  poll: "Poll", announcement: "Announcement", civic_update: "Civic Update",
  bill_update: "Bill Update", project_update: "Project Update", op_ed: "Op-Ed",
};
const PROMISE_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: "Promised", color: "#d97706", bg: "#fefce8", icon: Clock },
  in_progress: { label: "In Progress", color: "#2563eb", bg: "#eff6ff", icon: TrendingUp },
  kept: { label: "Kept", color: GREEN, bg: "#f0fdf9", icon: CheckSquare },
  broken: { label: "Broken", color: "#dc2626", bg: "#fef2f2", icon: AlertCircle },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", ...opts });
}
function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
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
      setSubscribed(data.data.isSubscribedToNewsletter ?? false);
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
    if (!session?.user) { toast.error("Sign in to follow officials"); return; }
    setFollowLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/social/officials/${id}/follow`, { method });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFollowing(!following);
      if (politician) setPolitician({ ...politician, _count: { ...politician._count, follows: politician._count.follows + (following ? -1 : 1) } });
      toast.success(!following && json.data?.bridgeFired ? "Following — campaign team notified" : following ? "Unfollowed" : "Following — you'll be notified of new posts");
    } catch { toast.error("Failed to update follow status"); }
    finally { setFollowLoading(false); }
  }

  async function toggleNewsletter() {
    if (!session?.user) { toast.error("Sign in to subscribe"); return; }
    setSubLoading(true);
    try {
      const method = subscribed ? "DELETE" : "POST";
      const res = await fetch(`/api/social/officials/${id}/newsletter`, { method });
      if (!res.ok) throw new Error();
      setSubscribed(!subscribed);
      toast.success(subscribed ? "Unsubscribed" : "Subscribed to newsletter updates");
    } catch { toast.error("Failed to update subscription"); }
    finally { setSubLoading(false); }
  }

  async function shareProfile() {
    const url = window.location.href;
    const title = politician ? `${politician.name} — Poll City` : "Poll City";
    if (navigator.share) { try { await navigator.share({ title, url }); } catch { /* dismissed */ } }
    else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  }

  async function sendCampaignConsent(campaign: Campaign) {
    if (!session?.user) { toast.error("Sign in to support this campaign"); return; }
    setConsentLoading((p) => ({ ...p, [campaign.id]: true }));
    try {
      const res = await fetch("/api/social/signal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officialId: id, campaignSlug: campaign.slug, type: "general_support" }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const cid = json.data?.consentId as string | undefined;
      if (cid) setConsentMap((p) => ({ ...p, [campaign.id]: cid }));
      toast.success(`Supporting ${campaign.candidateName ?? campaign.name}`);
    } catch { toast.error("Failed to send support signal"); }
    finally { setConsentLoading((p) => ({ ...p, [campaign.id]: false })); }
  }

  async function revokeCampaignConsent(campaignId: string, consentId: string) {
    setConsentLoading((p) => ({ ...p, [campaignId]: true }));
    try {
      const res = await fetch(`/api/social/consent/${consentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConsentMap((p) => { const n = { ...p }; delete n[campaignId]; return n; });
      toast.success("Consent revoked");
    } catch { toast.error("Failed to revoke consent"); }
    finally { setConsentLoading((p) => ({ ...p, [campaignId]: false })); }
  }

  async function submitQuestion() {
    if (!session?.user) { toast.error("Sign in to ask a question"); return; }
    if (!askQuestion.trim()) return;
    setAskSubmitting(true);
    try {
      const res = await fetch(`/api/officials/${id}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuestion }),
      });
      if (!res.ok) throw new Error();
      toast.success("Question submitted");
      setAskQuestion(""); load();
    } catch { toast.error("Failed to submit question"); }
    finally { setAskSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-12 bg-white border-b border-slate-100" />
        <div className="animate-pulse" style={{ minHeight: 340, background: NAVY }} />
        <div className="px-4 pt-4 pb-10 space-y-3 max-w-2xl mx-auto">
          {[88, 120, 200, 180, 160].map((h, i) => (
            <div key={i} className="rounded-3xl bg-slate-200 animate-pulse" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
        <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Shield className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Profile not found</h1>
        <p className="text-slate-500 text-sm text-center mb-8">This profile may have moved or the link is invalid.</p>
        <Link href="/social/officials" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: NAVY }}>
          <ArrowLeft className="w-4 h-4" /> Browse officials
        </Link>
      </div>
    );
  }

  const p = politician;
  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
  const hasPhoto = !!p.photoUrl && !photoBroken;
  const firstName = p.name.split(" ")[0] ?? p.name;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ─── Top nav ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-100 px-4 h-14 flex items-center gap-3">
        <Link href="/social/officials" className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-sm leading-tight truncate">{p.name}</p>
          <p className="text-xs text-slate-400 truncate">{p.district}</p>
        </div>
        <button onClick={shareProfile} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <Share2 className="w-4 h-4 text-slate-500" />
        </button>
        {following && <Bell className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      </div>

      {/* ─── HERO ────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 360, background: `linear-gradient(170deg, ${NAVY} 0%, #0e3670 55%, #081e3c 100%)` }}
      >
        {/* Blurred background photo */}
        {hasPhoto && (
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.photoUrl!}
              alt=""
              aria-hidden
              className="w-full h-full object-cover object-top opacity-[0.12] blur-xl scale-125"
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(170deg, ${NAVY}cc, ${NAVY}f0)` }} />
          </div>
        )}

        <div className="relative px-5 pt-6 pb-8">
          {/* Election badge */}
          {p.campaigns.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {p.campaigns.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-black"
                  style={{ background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}35` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                  2026 Candidate · {c.candidateTitle ?? c.name}
                </span>
              ))}
            </div>
          )}

          {/* Photo + name */}
          <div className="flex items-end gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div
                className="overflow-hidden shadow-2xl"
                style={{
                  width: 124, height: 148,
                  borderRadius: 20,
                  border: "3px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl!}
                    alt={p.name}
                    onError={() => setPhotoBroken(true)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #1a3a6e, #2563ab)` }}>
                    <span className="text-white font-black text-4xl tracking-tight">{initials}</span>
                  </div>
                )}
              </div>
              {p.isClaimed && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: GREEN, border: "2.5px solid white" }}
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-[27px] font-black text-white leading-tight tracking-tight">{p.name}</h1>
              <p className="text-[15px] font-semibold mt-0.5" style={{ color: "#93c5fd" }}>{p.title}</p>
              <p className="text-sm mt-0.5" style={{ color: "#bfdbfe" }}>{p.district}{p.province ? ` · ${p.province}` : ""}</p>
            </div>
          </div>

          {/* Tagline */}
          {p.tagline && (
            <div className="mb-5 pl-3 border-l-2 border-white/20">
              <p className="text-[13px] italic leading-relaxed" style={{ color: "rgba(219,234,254,0.8)" }}>
                &ldquo;{p.tagline}&rdquo;
              </p>
            </div>
          )}

          {/* Social icons */}
          {(p.twitter || p.facebook || p.instagram || p.linkedIn || p.website) && (
            <div className="flex items-center gap-2 mb-5">
              {p.twitter && (
                <a href={`https://twitter.com/${p.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Twitter className="w-4 h-4 text-white/60" />
                </a>
              )}
              {p.facebook && (
                <a href={p.facebook} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Facebook className="w-4 h-4 text-white/60" />
                </a>
              )}
              {p.instagram && (
                <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Instagram className="w-4 h-4 text-white/60" />
                </a>
              )}
              {p.linkedIn && (
                <a href={p.linkedIn} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Linkedin className="w-4 h-4 text-white/60" />
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Globe className="w-4 h-4 text-white/60" />
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 mb-6">
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all min-h-[52px]"
              style={
                following
                  ? { background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", color: "white" }
                  : { background: "white", color: NAVY, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }
              }
            >
              {following ? <><BellOff className="w-4 h-4" />Following</> : <><Bell className="w-4 h-4" />Follow</>}
            </button>
            <button
              onClick={toggleNewsletter}
              disabled={subLoading}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all min-h-[52px]"
              style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", color: subscribed ? "#86efac" : "white" }}
            >
              <Newspaper className="w-4 h-4" />
              {subscribed ? "Subscribed" : "Newsletter"}
            </button>
            <button
              onClick={shareProfile}
              className="w-14 flex items-center justify-center rounded-2xl transition-all min-h-[52px]"
              style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", color: "white" }}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Followers", value: p._count.follows },
              { label: "Posts", value: p._count.politicianPosts },
              { label: "Q&A", value: p._count.questions },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl py-4 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-2xl font-black text-white leading-none">{value.toLocaleString()}</p>
                <p className="text-xs font-semibold mt-1.5" style={{ color: "#93c5fd" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────── */}
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

        {/* Claim CTA */}
        {!p.isClaimed && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "2px solid #fde68a" }}>
              <div className="px-5 py-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef9c3" }}>
                  <Shield className="w-5 h-5" style={{ color: AMBER }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-amber-900">Is this your profile?</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">Claim it to respond to voters, post updates, and launch your full campaign toolkit — all in one place.</p>
                  <Link href={`/claim/${p.id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-black px-4 py-2 text-white transition-all" style={{ background: AMBER }}>
                    Claim this profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Campaign support */}
        {p.campaigns.length > 0 && session?.user && p.campaigns.map((campaign) => {
          const hasConsent = !!consentMap[campaign.id];
          const isLoad = !!consentLoading[campaign.id];
          return (
            <motion.div key={campaign.id} variants={fadeUp} initial="hidden" animate="visible">
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: hasConsent ? "linear-gradient(135deg,#f0fdf9,#dcfce7)" : "white",
                  border: `2px solid ${hasConsent ? GREEN : "#e2e8f0"}`,
                }}
              >
                <div className="px-5 py-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: hasConsent ? GREEN : "#f8fafc" }}>
                    <Heart className="w-5 h-5" style={{ color: hasConsent ? "white" : "#94a3b8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">
                      {hasConsent ? `Supporting ${campaign.candidateName ?? campaign.name}` : `${campaign.candidateName ?? p.name} is running for office`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {hasConsent ? "The campaign team has been notified of your support." : "Let the campaign know you support them."}
                    </p>
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      {campaign.slug && (
                        <Link href={`/candidates/${campaign.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                          View campaign site <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                      {campaign.electionDate && <span className="text-xs text-slate-400">Election · {fmtDate(campaign.electionDate)}</span>}
                    </div>
                  </div>
                  {hasConsent ? (
                    <button onClick={() => revokeCampaignConsent(campaign.id, consentMap[campaign.id])} disabled={isLoad} className="p-2 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  ) : (
                    <button onClick={() => sendCampaignConsent(campaign)} disabled={isLoad} className="px-5 py-2.5 text-xs font-black text-white rounded-xl flex-shrink-0 shadow-sm" style={{ background: GREEN }}>
                      {isLoad ? "…" : "Support"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Approval rating */}
        {p.approvalRating && p.approvalRating.totalSignals > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl bg-white overflow-hidden" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 pt-5 pb-1">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Public Approval</p>
              </div>
              <div className="px-5 py-5 flex items-center gap-5">
                <div className="text-center flex-shrink-0 min-w-[80px]">
                  <p className="text-5xl font-black leading-none" style={{ color: GREEN }}>{p.approvalRating.approvalPct}%</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <ThumbsUp className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    <span className="text-xs font-bold text-slate-500">Approve</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-5 rounded-full overflow-hidden flex" style={{ background: "#f1f5f9" }}>
                    <div style={{ width: `${p.approvalRating.approvalPct}%`, background: `linear-gradient(90deg,${GREEN},#22c55e)` }} className="h-full rounded-l-full" />
                    <div style={{ width: `${p.approvalRating.neutralPct}%`, background: `linear-gradient(90deg,${AMBER},#f59e0b)` }} className="h-full" />
                    <div style={{ width: `${p.approvalRating.disapprovalPct}%`, background: "linear-gradient(90deg,#f87171,#ef4444)" }} className="h-full rounded-r-full" />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs font-bold" style={{ color: GREEN }}>{p.approvalRating.approvalPct}% approve</span>
                    <span className="text-xs font-bold text-red-500">{p.approvalRating.disapprovalPct}% oppose</span>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4">
                <p className="text-xs text-slate-400">{p.approvalRating.totalSignals.toLocaleString()} signals · Updated {timeAgo(p.approvalRating.updatedAt)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bio */}
        {p.bio && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl bg-white px-5 py-5" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-3">About {firstName}</p>
              <p className={cn("text-slate-700 leading-relaxed", !expandedBio && "line-clamp-4")} style={{ fontSize: 15 }}>{p.bio}</p>
              {p.bio.length > 250 && (
                <button onClick={() => setExpandedBio(!expandedBio)} className="mt-2.5 text-xs font-black flex items-center gap-1 hover:opacity-70" style={{ color: NAVY }}>
                  {expandedBio ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
                </button>
              )}
              {(p.termStart || p.termEnd) && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  {p.termStart && (
                    <div>
                      <p className="text-xs text-slate-400">In office since</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtDate(p.termStart, { year: "numeric", month: "long" })}</p>
                    </div>
                  )}
                  {p.termEnd && (
                    <div>
                      <p className="text-xs text-slate-400">Term ends</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtDate(p.termEnd, { year: "numeric", month: "long" })}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Platform priorities */}
        {p.priorities.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Platform · Key Priorities</p>
              </div>
              <div className="divide-y divide-slate-50">
                {p.priorities.map((priority, idx) => (
                  <div key={priority.id} className="flex items-stretch">
                    <div
                      className="w-14 flex items-center justify-center flex-shrink-0 py-4"
                      style={{ background: idx % 2 === 0 ? `${NAVY}08` : `${GREEN}08` }}
                    >
                      <span className="text-2xl font-black" style={{ color: idx % 2 === 0 ? NAVY : GREEN }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 px-4 py-4">
                      <p className="text-sm font-black text-slate-900 leading-snug">{priority.title}</p>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{priority.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Service record */}
        {p.accomplishments.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Service Record</p>
              </div>
              <div className="divide-y divide-slate-50">
                {p.accomplishments.map((acc) => (
                  <div key={acc.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${GREEN}15` }}>
                      <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 leading-snug">{acc.title}</p>
                        {acc.year && <span className="text-xs font-bold text-slate-400 flex-shrink-0 mt-0.5">{acc.year}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{acc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Gallery */}
        {p.galleryPhotos.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">In the Community</p>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {p.galleryPhotos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.altText ?? photo.caption ?? `${p.name} community photo`} className="w-full h-full object-cover" loading="lazy" />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                        <p className="text-white text-[10px] leading-tight truncate font-medium">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Events */}
        {p.events.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Upcoming Events</p>
              </div>
              <div className="divide-y divide-slate-50">
                {p.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                      {event.isVirtual ? <Video className="w-5 h-5 text-blue-600" /> : event.isTownhall ? <Building2 className="w-5 h-5 text-blue-600" /> : <Calendar className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 leading-snug">{event.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{fmtEventDate(event.eventDate)}</p>
                      {!event.isVirtual && (event.location || event.city) && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{event.location}{event.city && `, ${event.city}`}
                        </p>
                      )}
                      {event.isVirtual && event.virtualUrl && (
                        <a href={event.virtualUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 flex items-center gap-0.5 mt-0.5">
                          <Video className="w-3 h-3" /> Join online
                        </a>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {event.isTownhall && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#eff6ff", color: "#2563eb" }}>Town Hall</span>}
                        {event.allowPublicRsvp && event.campaignSlug && (
                          <Link href={`/candidates/${event.campaignSlug}`} className="text-xs font-black text-white px-3 py-1 rounded-lg" style={{ background: GREEN }}>RSVP →</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Promises */}
        {p.promises.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Promises &amp; Commitments</p>
              </div>
              <div className="divide-y divide-slate-50">
                {p.promises.map((promise) => {
                  const cfg = PROMISE_STATUS[promise.status] ?? PROMISE_STATUS.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={promise.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{promise.promise}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          <span className="text-xs text-slate-400">Made {fmtDate(promise.madeAt)}</span>
                          {promise.trackerCount > 0 && <span className="text-xs text-slate-400">· {promise.trackerCount} tracking</span>}
                        </div>
                        {promise.evidence && <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">{promise.evidence}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Contact */}
        {(p.email || p.phone || p.website) && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-slate-50">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Contact</p>
              </div>
              <div className="divide-y divide-slate-50">
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors min-h-[56px]">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 truncate">{p.email}</span>
                  </a>
                )}
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors min-h-[56px]">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{p.phone}</span>
                  </a>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors min-h-[56px]">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                      <Globe className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 flex-1">Official website</span>
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Newsletter */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: subscribed ? "linear-gradient(135deg,#f0fdf9,#dcfce7)" : "linear-gradient(135deg,#f8fafc,#f1f5f9)",
              border: `2px solid ${subscribed ? GREEN : "#e2e8f0"}`,
            }}
          >
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: subscribed ? `${GREEN}20` : "white" }}>
                <Newspaper className="w-5 h-5" style={{ color: subscribed ? GREEN : "#94a3b8" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900">{subscribed ? `Subscribed to ${firstName}'s updates` : "Stay informed"}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subscribed ? "You'll receive updates directly from this official." : "Get news and announcements delivered to your inbox."}</p>
              </div>
              <button
                onClick={toggleNewsletter}
                disabled={subLoading}
                className="flex-shrink-0 px-4 py-2.5 text-xs font-black rounded-2xl transition-all min-h-[40px]"
                style={!subscribed ? { background: NAVY, color: "white" } : { background: "white", color: "#64748b", border: "1px solid #e2e8f0" }}
              >
                {subLoading ? "…" : subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Posts / Q&A tabs */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="rounded-3xl overflow-hidden bg-white" style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
            <div className="flex border-b border-slate-100">
              {(["posts", "questions"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-4 text-sm font-black transition-colors relative">
                    <span style={{ color: active ? NAVY : "#94a3b8" }}>
                      {tab === "posts" ? `Posts (${p._count.politicianPosts})` : `Q&A (${p._count.questions})`}
                    </span>
                    {active && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: NAVY }} />}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <AnimatePresence mode="wait">
                {activeTab === "posts" ? (
                  <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                    {p.politicianPosts.length === 0 ? (
                      <div className="text-center py-14">
                        <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-4 bg-slate-50">
                          <Megaphone className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-black text-slate-400">No posts yet</p>
                        {!p.isClaimed && <p className="text-xs text-slate-400 mt-1">Claim this profile to start posting.</p>}
                      </div>
                    ) : (
                      p.politicianPosts.map((post) => {
                        const Icon = POST_TYPE_ICONS[post.postType] ?? Building2;
                        const isExpanded = expandedPost === post.id;
                        return (
                          <div key={post.id} className="rounded-2xl p-4 hover:bg-slate-50 transition-colors" style={{ border: "1.5px solid #f1f5f9" }}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <span className="text-xs font-bold text-slate-500">{POST_TYPE_LABELS[post.postType]}</span>
                              <span className="text-xs text-slate-400 ml-auto">{timeAgo(post.createdAt)}</span>
                            </div>
                            <p className="font-black text-slate-900 text-sm leading-snug mb-1.5">{post.title}</p>
                            <p className={cn("text-sm text-slate-600 leading-relaxed", !isExpanded && "line-clamp-3")}>{post.body}</p>
                            {post.body.length > 150 && (
                              <button onClick={() => setExpandedPost(isExpanded ? null : post.id)} className="mt-1.5 text-xs font-black hover:opacity-70" style={{ color: NAVY }}>
                                {isExpanded ? "Show less" : "Read more"}
                              </button>
                            )}
                            {post.poll && (
                              <Link href={`/social/polls/${post.poll.id}`} className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #dbeafe" }}>
                                <BarChart2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-blue-700 flex-1 truncate">{post.poll.question}</span>
                                <span className="text-xs font-semibold text-blue-500 flex-shrink-0">{post.poll.totalResponses} votes</span>
                                <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              </Link>
                            )}
                            {post.externalUrl && (
                              <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-slate-600 flex-1 truncate">Read full article</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="questions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div className="rounded-2xl p-4" style={{ background: "#f8fafc", border: "1.5px dashed #e2e8f0" }}>
                      <p className="text-sm font-black text-slate-800 mb-2">Ask {firstName} a question</p>
                      <textarea
                        value={askQuestion}
                        onChange={(e) => setAskQuestion(e.target.value)}
                        rows={2}
                        placeholder={`What would you like to know about ${firstName}'s platform?`}
                        className="w-full text-sm rounded-xl px-3.5 py-2.5 resize-none focus:outline-none bg-white"
                        style={{ border: "1.5px solid #e2e8f0" }}
                      />
                      <button
                        onClick={submitQuestion}
                        disabled={askSubmitting || !askQuestion.trim()}
                        className="mt-2 px-5 py-2.5 text-xs font-black text-white rounded-xl disabled:opacity-50 transition-all min-h-[40px]"
                        style={{ background: GREEN }}
                      >
                        {askSubmitting ? "Submitting…" : "Submit Question"}
                      </button>
                    </div>

                    {p.questions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-4 bg-slate-50">
                          <MessageSquare className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-black text-slate-400">No questions yet</p>
                        <p className="text-xs text-slate-400 mt-1">Be the first to ask above.</p>
                      </div>
                    ) : (
                      p.questions.map((q) => (
                        <div key={q.id} className="rounded-2xl p-4" style={{ border: "1.5px solid #f1f5f9" }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 leading-snug font-semibold">{q.question}</p>
                              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                {q.user.name ?? "Resident"} · {timeAgo(q.createdAt)}
                                {q.upvotes > 0 && <span className="ml-1">· <Star className="w-2.5 h-2.5 inline" style={{ color: AMBER }} /> {q.upvotes}</span>}
                              </p>
                              {q.answer && (
                                <div className="mt-3 pl-3 py-2 pr-2 rounded-r-xl" style={{ borderLeft: `3px solid ${GREEN}`, background: `${GREEN}08` }}>
                                  <p className="text-xs font-black mb-1" style={{ color: GREEN }}>{p.name} replied{q.answeredAt ? ` · ${timeAgo(q.answeredAt)}` : ""}</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{q.answer}</p>
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
        </motion.div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-slate-400">Profile powered by <Link href="/" className="font-black text-slate-500 hover:text-slate-700">Poll City</Link></p>
        </div>

      </div>
    </div>
  );
}
