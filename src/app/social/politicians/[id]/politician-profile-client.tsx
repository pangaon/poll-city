"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Bell, BellOff, BarChart2, MessageSquare,
  Globe, Mail, Phone, ThumbsUp, Megaphone, FileText, Building2,
  TrendingUp, Twitter, Facebook, Instagram, Linkedin, Heart, X,
  Calendar, MapPin, Share2, Newspaper, CheckSquare, Clock, AlertCircle,
  ExternalLink, Shield, Video, ChevronRight, ChevronDown, ChevronUp,
  Users, Star, Layers,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── design tokens ────────────────────────────────────────────── */
const NAVY  = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const CYAN  = "#00D4C8";

/* ── animation variants ───────────────────────────────────────── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

/* ── post type config ─────────────────────────────────────────── */
type PostType = "poll" | "announcement" | "civic_update" | "bill_update" | "project_update" | "op_ed";
const POST_CFG: Record<PostType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  poll:           { icon: BarChart2,   label: "Poll",            color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  announcement:   { icon: Megaphone,   label: "Announcement",    color: AMBER,     bg: "rgba(239,159,39,0.12)"  },
  civic_update:   { icon: Building2,   label: "Civic Update",    color: CYAN,      bg: "rgba(0,212,200,0.12)"   },
  bill_update:    { icon: FileText,    label: "Bill Update",     color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  project_update: { icon: TrendingUp,  label: "Project Update",  color: GREEN,     bg: "rgba(29,158,117,0.12)"  },
  op_ed:          { icon: Layers,      label: "Op-Ed",           color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const PROMISE_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:     { label: "Promised",    color: AMBER,    bg: "rgba(239,159,39,0.12)",   icon: Clock       },
  in_progress: { label: "In Progress", color: "#818cf8", bg: "rgba(129,140,248,0.12)", icon: TrendingUp  },
  kept:        { label: "Kept",        color: GREEN,    bg: "rgba(29,158,117,0.12)",   icon: CheckSquare },
  broken:      { label: "Broken",      color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: AlertCircle },
};

/* ── types ────────────────────────────────────────────────────── */
interface Post {
  id: string; postType: PostType; title: string; body: string;
  pollId: string | null; imageUrl: string | null; externalUrl: string | null;
  createdAt: string; reactionCount?: number; commentCount?: number;
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
  candidateTitle: string | null; logoUrl: string | null; websiteUrl: string | null;
  electionDate: string | null;
}
interface CampaignConsent { campaignId: string; consentId: string; signalType: string; isActive: boolean; }
interface OfficialPromise {
  id: string; promise: string; madeAt: string; status: string;
  evidence: string | null; trackerCount: number;
}
interface Event {
  id: string; name: string; eventDate: string; location: string; city: string | null;
  description: string | null; eventType: string | null; isTownhall: boolean;
  isVirtual: boolean; virtualUrl: string | null; allowPublicRsvp: boolean;
  campaignSlug: string | null;
}
interface Priority { id: string; title: string; body: string; icon: string | null; category: string | null; }
interface Accomplishment { id: string; title: string; description: string; year: number | null; category: string | null; }
interface GalleryPhoto { id: string; url: string; caption: string | null; context: string | null; altText: string | null; }
interface CommitteeRole { role: string; committee: string; level: string; year: string; }
interface Politician {
  id: string; name: string; title: string; level: string; district: string;
  districtCode: string | null; party: string | null; partyName: string | null;
  bio: string | null; email: string | null; phone: string | null; website: string | null;
  photoUrl: string | null; subscriptionStatus: string | null; isClaimed: boolean;
  twitter: string | null; facebook: string | null; instagram: string | null;
  linkedIn: string | null; province: string | null; termStart: string | null;
  termEnd: string | null; tagline: string | null; committeeRoles: unknown;
  profileMode: string;
  _count: { follows: number; questions: number; politicianPosts: number };
  campaigns: Campaign[]; campaignConsents: CampaignConsent[]; approvalRating: ApprovalRating | null;
  politicianPosts: Post[]; questions: Question[]; promises: OfficialPromise[]; events: Event[];
  priorities: Priority[]; accomplishments: Accomplishment[]; galleryPhotos: GalleryPhoto[];
  isFollowing: boolean; notificationPreference: string | null; isSubscribedToNewsletter: boolean;
}

/* ── helpers ──────────────────────────────────────────────────── */
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

/* ── card wrapper ─────────────────────────────────────────────── */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp}>
      <div className={cn("rounded-2xl bg-[#111827] border border-white/[0.07] overflow-hidden", className)}>
        {children}
      </div>
    </motion.div>
  );
}
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b border-white/[0.05]">
      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{children}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function PoliticianProfileClient() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading]         = useState(true);
  const [following, setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<"posts" | "questions">("posts");
  const [expandedBio, setExpandedBio] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [expandedPost, setExpandedPost]   = useState<string | null>(null);
  const [subscribed, setSubscribed]   = useState(false);
  const [subLoading, setSubLoading]   = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [consentMap, setConsentMap]   = useState<Record<string, string>>({});
  const [consentLoading, setConsentLoading] = useState<Record<string, boolean>>({});
  const [likedPosts, setLikedPosts]   = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts]   = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/politicians/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const p: Politician = data.data;
      setPolitician(p);
      setFollowing(p.isFollowing);
      setSubscribed(p.isSubscribedToNewsletter ?? false);
      const map: Record<string, string> = {};
      for (const c of (p.campaignConsents ?? []) as CampaignConsent[]) {
        if (c.isActive) map[c.campaignId] = c.consentId;
      }
      setConsentMap(map);
      const counts: Record<string, number> = {};
      for (const post of p.politicianPosts) counts[post.id] = post.reactionCount ?? 0;
      setLikeCounts(counts);
    } finally { setLoading(false); }
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
      toast.success(!following && json.data?.bridgeFired ? "Following — campaign team notified" : following ? "Unfollowed" : "Following — you will be notified of new posts");
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

  async function toggleLike(postId: string) {
    if (!session?.user) { toast.error("Sign in to like posts"); return; }
    const wasLiked = likedPosts[postId] ?? false;
    setLikedPosts((p) => ({ ...p, [postId]: !wasLiked }));
    setLikeCounts((p) => ({ ...p, [postId]: (p[postId] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      await fetch(`/api/social/posts/${postId}/react`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "heart" }),
      });
    } catch {
      setLikedPosts((p) => ({ ...p, [postId]: wasLiked }));
      setLikeCounts((p) => ({ ...p, [postId]: (p[postId] ?? 0) + (wasLiked ? 1 : -1) }));
    }
  }

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D14]">
        <div className="sticky top-[57px] z-30 h-12 bg-[#080D14]/80 border-b border-white/[0.05]" />
        <div className="animate-pulse" style={{ minHeight: 380, background: "linear-gradient(170deg, #0A2342, #080D14)" }} />
        <div className="px-4 pt-4 pb-10 space-y-3 max-w-2xl mx-auto">
          {[96, 140, 200, 180, 160].map((h, i) => (
            <div key={i} className="rounded-2xl bg-[#111827] animate-pulse" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── not found ── */
  if (!politician) {
    return (
      <div className="min-h-screen bg-[#080D14] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-[#111827] border border-white/[0.07] flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">Profile not found</h1>
        <p className="text-slate-400 text-sm text-center mb-8">This profile may have moved or the link is invalid.</p>
        <Link href="/social/officials" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#111827] border border-white/[0.07] text-slate-200 hover:bg-white/[0.08] transition-all">
          <ArrowLeft className="w-4 h-4" /> Browse officials
        </Link>
      </div>
    );
  }

  const p = politician;
  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
  const hasPhoto  = !!p.photoUrl && !photoBroken;
  const firstName = p.name.split(" ")[0] ?? p.name;
  const committeeRoles = (Array.isArray(p.committeeRoles) ? p.committeeRoles : []) as CommitteeRole[];
  const levelLabel: Record<string, string> = { municipal: "Municipal", provincial: "Provincial", federal: "Federal", regional: "Regional" };

  return (
    <div className="min-h-screen bg-[#080D14]">

      {/* ── sticky back bar ── */}
      <div className="sticky top-[57px] z-30 bg-[#080D14]/90 backdrop-blur-xl border-b border-white/[0.05] px-4 h-[52px] flex items-center gap-3">
        <Link href="/social/officials" className="p-2 -ml-1.5 rounded-xl hover:bg-white/[0.07] transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight truncate">{p.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{p.district}</p>
        </div>
        <button onClick={shareProfile} className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors">
          <Share2 className="w-4 h-4 text-slate-400" />
        </button>
        {following && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Bell className="w-4 h-4 text-[#00D4C8] flex-shrink-0" />
          </motion.div>
        )}
      </div>

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 400, background: `linear-gradient(170deg, ${NAVY} 0%, #102060 50%, #060c18 100%)` }}
      >
        {/* blurred backdrop photo */}
        {hasPhoto && (
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photoUrl!} alt="" aria-hidden className="w-full h-full object-cover object-top opacity-[0.10] blur-2xl scale-125" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(170deg, ${NAVY}e0 0%, #060c18f8 80%)` }} />
          </div>
        )}

        {/* particle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative px-5 pt-5 pb-8">
          {/* candidate badge */}
          {p.campaigns.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {p.campaigns.map((c) => (
                <motion.span
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-black"
                  style={{ background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                  2026 Candidate · {c.candidateTitle ?? c.name}
                </motion.span>
              ))}
            </div>
          )}

          {/* photo + name row */}
          <div className="flex items-end gap-4 mb-4">
            <motion.div
              className="relative flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="overflow-hidden shadow-2xl"
                style={{ width: 120, height: 145, borderRadius: 18, border: "2.5px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}
              >
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl!} alt={p.name} onError={() => setPhotoBroken(true)} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #1a3a6e, #2563ab)` }}>
                    <span className="text-white font-black text-4xl tracking-tight">{initials}</span>
                  </div>
                )}
              </div>
              {p.isClaimed && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: GREEN, border: "2.5px solid #060c18" }}>
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>

            <motion.div
              className="flex-1 min-w-0 pb-1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">{p.name}</h1>
              <p className="text-[15px] font-semibold mt-0.5" style={{ color: "#93c5fd" }}>{p.title}</p>
              <p className="text-[13px] mt-0.5 flex items-center gap-1.5" style={{ color: "#bfdbfe80" }}>
                <MapPin className="w-3 h-3 flex-shrink-0" />{p.district}{p.province ? ` · ${p.province}` : ""}
              </p>
              {p.party && (
                <p className="text-[11px] mt-1 font-bold" style={{ color: "#93c5fd80" }}>{p.party}</p>
              )}
            </motion.div>
          </div>

          {/* tagline */}
          {p.tagline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-5 pl-3 py-0.5"
              style={{ borderLeft: `2.5px solid ${CYAN}50` }}
            >
              <p className="text-[13px] font-medium italic leading-relaxed" style={{ color: `${CYAN}cc` }}>
                &ldquo;{p.tagline}&rdquo;
              </p>
            </motion.div>
          )}

          {/* social icons */}
          {(p.twitter || p.facebook || p.instagram || p.linkedIn || p.website) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="flex items-center gap-2 mb-5"
            >
              {p.twitter && (
                <a href={`https://twitter.com/${p.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.15] transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Twitter className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {p.facebook && (
                <a href={p.facebook} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.15] transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Facebook className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {p.instagram && (
                <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.15] transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Instagram className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {p.linkedIn && (
                <a href={p.linkedIn} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.15] transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Linkedin className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.15] transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Globe className="w-4 h-4 text-slate-300" />
                </a>
              )}
            </motion.div>
          )}

          {/* action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex gap-2.5 mb-5"
          >
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all min-h-[52px] active:scale-[0.98]"
              style={following
                ? { background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.18)", color: "white" }
                : { background: "white", color: NAVY, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }
              }
            >
              {following ? <><BellOff className="w-4 h-4" />Following</> : <><Bell className="w-4 h-4" />Follow</>}
            </button>
            <button
              onClick={toggleNewsletter}
              disabled={subLoading}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all min-h-[52px]"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: subscribed ? "#86efac" : "rgba(255,255,255,0.8)" }}
            >
              <Newspaper className="w-4 h-4" />
              {subscribed ? "Subscribed" : "Newsletter"}
            </button>
            <button
              onClick={shareProfile}
              className="w-14 flex items-center justify-center rounded-2xl transition-all min-h-[52px]"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.8)" }}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </motion.div>

          {/* campaign website CTA */}
          {p.campaigns.length > 0 && p.campaigns[0].slug && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <a
                href={`/candidates/${p.campaigns[0].slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-black mb-4 transition-all active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${GREEN}, #15816a)`, color: "white", boxShadow: "0 4px 20px rgba(29,158,117,0.3)" }}
              >
                <Globe className="w-4 h-4" />
                View Campaign Website
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </motion.div>
          )}

          {/* stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: "Followers", value: p._count.follows, icon: Users },
              { label: "Posts",     value: p._count.politicianPosts, icon: Megaphone },
              { label: "Q&A",       value: p._count.questions, icon: MessageSquare },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl py-4 text-center" style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Icon className="w-3.5 h-3.5 mx-auto mb-1.5 opacity-50 text-white" />
                <p className="text-[22px] font-black text-white leading-none">{value.toLocaleString()}</p>
                <p className="text-[10px] font-bold mt-1" style={{ color: "#93c5fd80" }}>{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════ CONTENT ══════════════════════ */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="px-4 py-5 space-y-3.5 max-w-2xl mx-auto"
      >

        {/* unclaimed banner */}
        {!p.isClaimed && (
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${AMBER}18, ${AMBER}08)`, border: `1.5px solid ${AMBER}35` }}>
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}15` }}>
                  <Shield className="w-5 h-5" style={{ color: AMBER }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">Is this your profile?</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Claim it to respond to voters, post updates, and launch your full campaign toolkit — free.</p>
                  <Link href={`/signup`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-black px-4 py-2 transition-all" style={{ background: AMBER, color: "#080D14" }}>
                    Claim this profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* campaign support consent */}
        {p.campaigns.length > 0 && session?.user && p.campaigns.map((campaign) => {
          const hasConsent = !!consentMap[campaign.id];
          const isLoad = !!consentLoading[campaign.id];
          return (
            <motion.div key={campaign.id} variants={fadeUp}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: hasConsent ? `${GREEN}15` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${hasConsent ? `${GREEN}40` : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: hasConsent ? `${GREEN}25` : "rgba(255,255,255,0.05)" }}>
                    <Heart className="w-5 h-5" style={{ color: hasConsent ? GREEN : "#64748b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">
                      {hasConsent ? `Supporting ${campaign.candidateName ?? campaign.name}` : `${campaign.candidateName ?? p.name} is running in 2026`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {hasConsent ? "The campaign team has been notified of your support." : "Let the campaign know you support them."}
                    </p>
                    {campaign.electionDate && <p className="text-xs text-slate-500 mt-1">Election · {fmtDate(campaign.electionDate)}</p>}
                  </div>
                  {hasConsent ? (
                    <button onClick={() => revokeCampaignConsent(campaign.id, consentMap[campaign.id])} disabled={isLoad} className="p-2 rounded-xl hover:bg-red-500/[0.1] transition-colors flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  ) : (
                    <button onClick={() => sendCampaignConsent(campaign)} disabled={isLoad} className="px-4 py-2 text-xs font-black text-white rounded-xl flex-shrink-0 transition-all active:scale-95" style={{ background: GREEN }}>
                      {isLoad ? "…" : "Support"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* ── approval rating ── */}
        {p.approvalRating && p.approvalRating.totalSignals > 0 && (
          <Card>
            <SectionHeader>Public Approval</SectionHeader>
            <div className="px-5 py-5 flex items-center gap-5">
              <div className="text-center flex-shrink-0 min-w-[80px]">
                <motion.p
                  className="text-5xl font-black leading-none"
                  style={{ color: GREEN }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                >
                  {p.approvalRating.approvalPct}%
                </motion.p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <ThumbsUp className="w-3.5 h-3.5" style={{ color: GREEN }} />
                  <span className="text-[11px] font-bold text-slate-400">Approve</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-5 rounded-full overflow-hidden flex bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.approvalRating.approvalPct}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${GREEN}, #22c55e)` }}
                    className="h-full rounded-l-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.approvalRating.neutralPct}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${AMBER}, #f59e0b)` }}
                    className="h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.approvalRating.disapprovalPct}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                    style={{ background: "linear-gradient(90deg,#f87171,#ef4444)" }}
                    className="h-full rounded-r-full"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-bold" style={{ color: GREEN }}>{p.approvalRating.approvalPct}% approve</span>
                  <span className="text-xs font-bold text-red-400">{p.approvalRating.disapprovalPct}% oppose</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">{p.approvalRating.totalSignals.toLocaleString()} signals · Updated {timeAgo(p.approvalRating.updatedAt)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── bio ── */}
        {p.bio && (
          <Card>
            <SectionHeader>About {firstName}</SectionHeader>
            <div className="px-5 py-4">
              <p className={cn("text-slate-300 leading-relaxed text-[14.5px]", !expandedBio && "line-clamp-4")}>{p.bio}</p>
              {p.bio.length > 250 && (
                <button onClick={() => setExpandedBio(!expandedBio)} className="mt-2.5 text-xs font-black flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: CYAN }}>
                  {expandedBio ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
                </button>
              )}
              {(p.termStart || p.termEnd) && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                  {p.termStart && (
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">In office since</p>
                      <p className="text-sm font-bold text-slate-200 mt-0.5">{fmtDate(p.termStart, { year: "numeric", month: "long" })}</p>
                    </div>
                  )}
                  {p.termEnd && (
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">Term ends</p>
                      <p className="text-sm font-bold text-slate-200 mt-0.5">{fmtDate(p.termEnd, { year: "numeric", month: "long" })}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── committee roles ── */}
        {committeeRoles.length > 0 && (
          <Card>
            <SectionHeader>Committee Roles & Responsibilities</SectionHeader>
            <div className="p-4 flex flex-wrap gap-2">
              {committeeRoles.map((cr, i) => (
                <div
                  key={i}
                  className="rounded-xl px-3.5 py-2.5 flex-shrink-0 max-w-full"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-xs font-black text-white leading-snug">{cr.role}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{cr.committee}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {cr.level && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ background: `${CYAN}15`, color: CYAN }}>
                        {levelLabel[cr.level] ?? cr.level}
                      </span>
                    )}
                    {cr.year && <span className="text-[10px] text-slate-600 font-medium">{cr.year}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── priorities ── */}
        {p.priorities.length > 0 && (
          <Card>
            <SectionHeader>Platform · Key Priorities</SectionHeader>
            <div className="divide-y divide-white/[0.04]">
              {p.priorities.map((priority, idx) => (
                <div key={priority.id} className="flex items-stretch">
                  <div
                    className="w-14 flex items-center justify-center flex-shrink-0 py-4"
                    style={{ background: idx % 2 === 0 ? `${NAVY}50` : `${GREEN}10` }}
                  >
                    <span className="text-2xl font-black" style={{ color: idx % 2 === 0 ? CYAN : GREEN }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex-1 px-4 py-4">
                    <p className="text-sm font-black text-white leading-snug">{priority.title}</p>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{priority.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── accomplishments ── */}
        {p.accomplishments.length > 0 && (
          <Card>
            <SectionHeader>Service Record</SectionHeader>
            <div className="divide-y divide-white/[0.04]">
              {p.accomplishments.map((acc) => (
                <div key={acc.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${GREEN}18` }}>
                    <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-white leading-snug">{acc.title}</p>
                      {acc.year && <span className="text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">{acc.year}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{acc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── gallery ── */}
        {p.galleryPhotos.length > 0 && (
          <Card>
            <SectionHeader>In the Community</SectionHeader>
            <div className="p-3 grid grid-cols-3 gap-2">
              {p.galleryPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-[#0d1524] relative">
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
          </Card>
        )}

        {/* ── events ── */}
        {p.events.length > 0 && (
          <Card>
            <SectionHeader>Upcoming Events</SectionHeader>
            <div className="divide-y divide-white/[0.04]">
              {p.events.map((event) => (
                <div key={event.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(129,140,248,0.15)" }}>
                    {event.isVirtual ? <Video className="w-5 h-5 text-indigo-400" /> : event.isTownhall ? <Building2 className="w-5 h-5 text-indigo-400" /> : <Calendar className="w-5 h-5 text-indigo-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white leading-snug">{event.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{fmtEventDate(event.eventDate)}</p>
                    {!event.isVirtual && (event.location || event.city) && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{event.location}{event.city && `, ${event.city}`}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {event.isTownhall && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>Town Hall</span>}
                      {event.allowPublicRsvp && event.campaignSlug && (
                        <Link href={`/candidates/${event.campaignSlug}`} className="text-xs font-black px-3 py-1 rounded-lg text-white" style={{ background: GREEN }}>RSVP →</Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── promises ── */}
        {p.promises.length > 0 && (
          <Card>
            <SectionHeader>Promises & Commitments</SectionHeader>
            <div className="divide-y divide-white/[0.04]">
              {p.promises.map((promise) => {
                const cfg = PROMISE_STATUS[promise.status] ?? PROMISE_STATUS.pending;
                const Icon = cfg.icon;
                return (
                  <div key={promise.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white leading-snug">{promise.promise}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-xs text-slate-500">Made {fmtDate(promise.madeAt)}</span>
                        {promise.trackerCount > 0 && <span className="text-xs text-slate-500">· {promise.trackerCount} tracking</span>}
                      </div>
                      {promise.evidence && <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{promise.evidence}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── contact ── */}
        {(p.email || p.phone || p.website) && (
          <Card>
            <SectionHeader>Contact</SectionHeader>
            <div className="divide-y divide-white/[0.04]">
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors min-h-[56px]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15` }}>
                    <Mail className="w-4 h-4" style={{ color: CYAN }} />
                  </div>
                  <span className="text-sm font-semibold truncate" style={{ color: CYAN }}>{p.email}</span>
                </a>
              )}
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors min-h-[56px]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15` }}>
                    <Phone className="w-4 h-4" style={{ color: CYAN }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: CYAN }}>{p.phone}</span>
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors min-h-[56px]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15` }}>
                    <Globe className="w-4 h-4" style={{ color: CYAN }} />
                  </div>
                  <span className="text-sm font-semibold flex-1" style={{ color: CYAN }}>Official website</span>
                  <ExternalLink className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </a>
              )}
            </div>
          </Card>
        )}

        {/* ── newsletter cta ── */}
        <motion.div variants={fadeUp}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: subscribed ? `${GREEN}14` : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${subscribed ? `${GREEN}40` : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: subscribed ? `${GREEN}20` : "rgba(255,255,255,0.05)" }}>
                <Newspaper className="w-5 h-5" style={{ color: subscribed ? GREEN : "#64748b" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">{subscribed ? `Subscribed to ${firstName}'s updates` : "Stay informed"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{subscribed ? "You will receive updates directly from this official." : "News and announcements delivered to your inbox."}</p>
              </div>
              <button
                onClick={toggleNewsletter}
                disabled={subLoading}
                className="flex-shrink-0 px-4 py-2 text-xs font-black rounded-xl transition-all min-h-[36px]"
                style={!subscribed
                  ? { background: `${CYAN}20`, color: CYAN, border: `1px solid ${CYAN}40` }
                  : { background: "rgba(255,255,255,0.06)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }
                }
              >
                {subLoading ? "…" : subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── posts / Q&A tabs ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl bg-[#111827] border border-white/[0.07] overflow-hidden">
            {/* tab bar */}
            <div className="flex border-b border-white/[0.07]">
              {(["posts", "questions"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-4 text-sm font-black transition-colors relative">
                    <span style={{ color: active ? "white" : "#64748b" }}>
                      {tab === "posts" ? `Posts (${p._count.politicianPosts})` : `Q&A (${p._count.questions})`}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="profile-tab-indicator"
                        className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                        style={{ background: CYAN }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <AnimatePresence mode="wait">
                {activeTab === "posts" ? (
                  /* ── posts ── */
                  <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
                    {p.politicianPosts.length === 0 ? (
                      <div className="text-center py-14">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-white/[0.04]">
                          <Megaphone className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-sm font-black text-slate-500">No posts yet</p>
                        {!p.isClaimed && <p className="text-xs text-slate-600 mt-1">Claim this profile to start posting.</p>}
                      </div>
                    ) : (
                      p.politicianPosts.map((post) => {
                        const cfg = POST_CFG[post.postType] ?? POST_CFG.civic_update;
                        const Icon = cfg.icon;
                        const isExpanded = expandedPost === post.id;
                        const liked = likedPosts[post.id] ?? false;
                        const likeCount = likeCounts[post.id] ?? 0;
                        return (
                          <div key={post.id} className="rounded-2xl p-4 hover:bg-white/[0.025] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                              <span className="text-[11px] text-slate-600 ml-auto">{timeAgo(post.createdAt)}</span>
                            </div>
                            <p className="font-black text-white text-sm leading-snug mb-1.5">{post.title}</p>
                            <p className={cn("text-sm text-slate-400 leading-relaxed", !isExpanded && "line-clamp-3")}>{post.body}</p>
                            {post.body.length > 150 && (
                              <button onClick={() => setExpandedPost(isExpanded ? null : post.id)} className="mt-1.5 text-xs font-black hover:opacity-70 transition-opacity" style={{ color: CYAN }}>
                                {isExpanded ? "Show less" : "Read more"}
                              </button>
                            )}
                            {post.poll && (
                              <Link href={`/social/polls/${post.poll.id}`} className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)" }}>
                                <BarChart2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-indigo-300 flex-1 truncate">{post.poll.question}</span>
                                <span className="text-xs font-semibold text-indigo-400 flex-shrink-0">{post.poll.totalResponses} votes</span>
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              </Link>
                            )}
                            {post.externalUrl && (
                              <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-slate-400 flex-1 truncate">Read full article</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                              </a>
                            )}
                            {/* reaction bar */}
                            <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-white/[0.05]">
                              <button
                                onClick={() => toggleLike(post.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90"
                                style={{ color: liked ? "#f87171" : "#64748b" }}
                              >
                                <Heart className={cn("w-4 h-4 transition-all", liked && "fill-current")} />
                                {likeCount > 0 && likeCount}
                              </button>
                              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {(post.commentCount ?? 0) > 0 ? post.commentCount : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  /* ── Q&A ── */
                  <motion.div key="questions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
                    <div className="rounded-2xl p-4" style={{ background: "rgba(0,212,200,0.05)", border: "1.5px dashed rgba(0,212,200,0.2)" }}>
                      <p className="text-sm font-black text-white mb-2.5">Ask {firstName} a question</p>
                      <textarea
                        value={askQuestion}
                        onChange={(e) => setAskQuestion(e.target.value)}
                        rows={2}
                        placeholder={`What would you like to know about ${firstName}'s platform?`}
                        className="w-full text-sm rounded-xl px-3.5 py-2.5 resize-none focus:outline-none bg-white/[0.05] border border-white/[0.10] focus:border-[#00D4C8]/40 text-white placeholder:text-slate-600 transition-all"
                      />
                      <button
                        onClick={submitQuestion}
                        disabled={askSubmitting || !askQuestion.trim()}
                        className="mt-2 px-5 py-2.5 text-xs font-black rounded-xl disabled:opacity-40 transition-all min-h-[40px]"
                        style={{ background: GREEN, color: "white" }}
                      >
                        {askSubmitting ? "Submitting…" : "Submit Question"}
                      </button>
                    </div>

                    {p.questions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-white/[0.04]">
                          <MessageSquare className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-sm font-black text-slate-500">No questions yet</p>
                        <p className="text-xs text-slate-600 mt-1">Be the first to ask above.</p>
                      </div>
                    ) : (
                      p.questions.map((q) => (
                        <div key={q.id} className="rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/[0.05]">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 leading-snug font-semibold">{q.question}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {q.user.name ?? "Resident"} · {timeAgo(q.createdAt)}
                                {q.upvotes > 0 && <span className="ml-1">· <Star className="w-2.5 h-2.5 inline" style={{ color: AMBER }} /> {q.upvotes}</span>}
                              </p>
                              {q.answer && (
                                <div className="mt-3 pl-3 py-2.5 pr-3 rounded-r-xl" style={{ borderLeft: `2.5px solid ${GREEN}`, background: `${GREEN}09` }}>
                                  <p className="text-[11px] font-black mb-1" style={{ color: GREEN }}>{p.name} replied{q.answeredAt ? ` · ${timeAgo(q.answeredAt)}` : ""}</p>
                                  <p className="text-sm text-slate-300 leading-relaxed">{q.answer}</p>
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

        {/* footer */}
        <div className="text-center py-6">
          <p className="text-xs text-slate-600">
            Profile powered by <Link href="/social" className="font-black text-slate-500 hover:text-slate-300 transition-colors">Poll City</Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}
