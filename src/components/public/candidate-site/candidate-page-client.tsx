"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { motion, AnimatePresence, useInView } from "framer-motion";
import TurnstileWidget from "@/components/security/turnstile-widget";
import {
  Calendar,
  Clock3,
  Mail,
  MapPin,
  Share2,
  ExternalLink,
  Menu,
  X,
  CheckCircle2,
  Users,
  DoorOpen,
  Trophy,
  XCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Heart,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Handshake,
  DollarSign,
} from "lucide-react";

const WardMap = dynamic(() => import("./candidate-ward-map"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ActionFormType = "support" | "volunteer" | "donate" | "subscribe";

type CandidateIssue = {
  id: string;
  title: string;
  summary?: string;
  details?: string;
  order?: number;
};

type CandidateEndorsement = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  photoUrl?: string;
};

type CandidateFaq = {
  id: string;
  q: string;
  a: string;
};

type CandidateGalleryItem = {
  id: string;
  url: string;
  caption?: string;
  order?: number;
};

export type CandidatePageCustomization = {
  heroBannerUrl?: string;
  backgroundImageUrl?: string;
  candidatePhotoUrl?: string;
  candidatePhotoUrl2?: string;
  office?: string;
  municipality?: string;
  ward?: string;
  boundaryGeoJSON?: unknown;
  yearsInCommunity?: number;
  communityConnections: string[];
  videoUrl?: string;
  gallery: CandidateGalleryItem[];
  issues: CandidateIssue[];
  endorsements: CandidateEndorsement[];
  faqs: CandidateFaq[];
  layout?: "professional" | "modern" | "bold" | "minimal";
  theme?: string;
};

export type CandidateEvent = {
  id: string;
  name: string;
  eventDate: Date;
  location: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  isVirtual: boolean;
  virtualUrl: string | null;
  rsvpCount: number;
};

type ElectionHistoryRecord = {
  id: string;
  electionDate: Date;
  electionType: string;
  jurisdiction: string;
  partyName: string | null;
  votesReceived: number;
  totalVotesCast: number;
  percentage: number;
  won: boolean;
};

type ActivePollData = {
  id: string;
  title: string;
  totalResponses: number;
  options: { id: string; text: string; votes: number }[];
};

export type CandidatePageData = {
  id: string;
  slug: string;
  campaignName: string;
  candidateName: string;
  candidateTitle: string;
  candidateBio: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  tagline: string | null;
  electionType: string;
  electionDate: Date | null;
  jurisdiction: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  websiteUrl: string | null;
  twitterHandle: string | null;
  facebookUrl: string | null;
  instagramHandle: string | null;
  linkedInUrl: string | null;
  isVerified: boolean;
  supporterCount: number;
  volunteerCount: number;
  doorsKnockedCount: number;
  activePoll: ActivePollData | null;
  electionHistory: ElectionHistoryRecord[];
  events: CandidateEvent[];
  customization: CandidatePageCustomization;
  // Per-campaign tracking
  gaId?: string | null;
  metaPixelId?: string | null;
  // true when campaign has completed Stripe onboarding OR is a demo campaign
  donationsEnabled: boolean;
};

interface CandidatePageClientProps {
  campaign: CandidatePageData;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

const springTransition = { type: "spring" as const, stiffness: 300, damping: 24 };
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springTransition },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initialsFromName(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PC"
  );
}

function officeLabel(campaign: CandidatePageData): string {
  return campaign.customization.office || campaign.candidateTitle || "Candidate";
}

function municipalityLabel(campaign: CandidatePageData): string {
  return campaign.customization.municipality || campaign.jurisdiction || "Community";
}

function electionYear(campaign: CandidatePageData): number {
  return campaign.electionDate ? new Date(campaign.electionDate).getFullYear() : new Date().getFullYear();
}

function buildYoutubeEmbed(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function readGeoPointFromAddress(_address: string | null): { lat: number; lng: number } | null {
  return null;
}

function formatCountdown(targetDate: Date | null): string {
  if (!targetDate) return "";
  const now = Date.now();
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return "";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/** Derive a lighter tint from a hex color for subtle backgrounds */
function hexToTint(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AnimatedNumber({ value, label, icon: Icon, accentColor }: { value: number; label: string; icon: typeof Users; accentColor: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const start = performance.now();
    const target = value;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8">
      <Icon className="h-5 w-5" style={{ color: accentColor }} />
      <span className="text-4xl font-black tracking-tight text-slate-900">
        {display.toLocaleString()}
      </span>
      <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle, accentColor }: { eyebrow?: string; title: string; subtitle?: string; accentColor?: string }) {
  return (
    <div className="mb-12">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: accentColor || GREEN }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-3 text-slate-500 text-lg max-w-2xl">{subtitle}</p> : null}
    </div>
  );
}

function MediaAvatar({
  name,
  imageUrl,
  className,
  textClassName,
  bg,
}: {
  name: string;
  imageUrl?: string | null;
  className: string;
  textClassName?: string;
  bg: string;
}) {
  const [broken, setBroken] = useState(false);
  if (imageUrl && !broken) {
    return (
      <div className={`${className} relative overflow-hidden`}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 160px, 320px"
          className="object-cover object-top"
          onError={() => setBroken(true)}
          unoptimized={imageUrl.startsWith("http")}
        />
      </div>
    );
  }
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: bg }}>
      <span className={textClassName || "text-white text-3xl font-black tracking-tight"}>{initialsFromName(name)}</span>
    </div>
  );
}

function SocialButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
    >
      {icon}
    </a>
  );
}

/* Twitter / X icon - inline SVG */
function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
      <CheckCircle2 size={16} className="text-emerald-300" />
      Verified Official
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Engagement Tab Types                                               */
/* ------------------------------------------------------------------ */

type EngagementTab = "support" | "volunteer" | "sign" | "question" | "events" | "donate";

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

function CandidateNav({
  campaign,
  scrolled,
  activeSection,
  onAction,
  primary,
  accent,
}: {
  campaign: CandidatePageData;
  scrolled: boolean;
  activeSection: string;
  onAction: (type: ActionFormType) => void;
  primary: string;
  accent: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "platform", label: "Platform" },
    { id: "about", label: "About" },
    { id: "election-history", label: "History" },
    { id: "engagement", label: "Get Involved" },
    { id: "events", label: "Events" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-sm" : "bg-transparent"}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2.5 min-w-0">
            {campaign.logoUrl ? (
              <div className="relative h-8 w-8 rounded-md overflow-hidden flex-shrink-0">
                <Image src={campaign.logoUrl} alt={campaign.candidateName} fill sizes="32px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <span className={`font-bold text-sm tracking-tight ${scrolled ? "text-slate-900" : "text-white"}`}>{campaign.candidateName}</span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-sm font-medium transition-colors ${activeSection === item.id ? "" : scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}
                style={activeSection === item.id ? { color: accent } : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onAction("support")}
              className="hidden sm:inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Support
            </button>
            <button
              onClick={() => setMobileOpen((state) => !state)}
              className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springTransition}
            className="fixed top-16 left-0 right-0 z-40 bg-white shadow-lg border-b md:hidden"
          >
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => { onAction("support"); setMobileOpen(false); }}
                  className="flex-1 rounded-full text-white py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: primary }}
                >
                  Support
                </button>
                {campaign.donationsEnabled && (
                  <button
                    onClick={() => { onAction("donate"); setMobileOpen(false); }}
                    className="flex-1 rounded-full text-white py-2.5 text-sm font-semibold"
                    style={{ backgroundColor: accent }}
                  >
                    Donate
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Poll Widget                                                        */
/* ------------------------------------------------------------------ */

function PollWidget({ poll, accent }: { poll: ActivePollData; accent: string }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
  return (
    <div className="rounded-2xl bg-white p-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5" style={{ color: accent }} />
        <h3 className="font-bold text-lg text-slate-900">Active Poll</h3>
      </div>
      <p className="text-slate-700 font-medium mb-4">{poll.title}</p>
      <div className="space-y-3">
        {poll.options.map((option) => {
          const pct = Math.round((option.votes / totalVotes) * 100);
          return (
            <div key={option.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{option.text}</span>
                <span className="font-semibold text-slate-900">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: accent }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">{poll.totalResponses} responses</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Election History Table                                             */
/* ------------------------------------------------------------------ */

function ElectionHistoryTable({ records }: { records: ElectionHistoryRecord[] }) {
  if (records.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-2xl bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Year</th>
            <th className="text-left px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Type</th>
            <th className="text-left px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Jurisdiction</th>
            <th className="text-left px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Party</th>
            <th className="text-right px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Votes</th>
            <th className="text-right px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">%</th>
            <th className="text-center px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Result</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
              <td className="px-5 py-4 font-semibold text-slate-900">{new Date(r.electionDate).getFullYear()}</td>
              <td className="px-5 py-4 text-slate-600 capitalize">{r.electionType}</td>
              <td className="px-5 py-4 text-slate-600">{r.jurisdiction}</td>
              <td className="px-5 py-4 text-slate-600 hidden sm:table-cell">{r.partyName ?? "-"}</td>
              <td className="px-5 py-4 text-right text-slate-900 font-medium tabular-nums">{r.votesReceived.toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-slate-900 font-medium tabular-nums">{r.percentage.toFixed(1)}%</td>
              <td className="px-5 py-4 text-center">
                {r.won ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50">
                    <Trophy size={12} /> Won
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50">
                    <XCircle size={12} /> Lost
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CandidatePageClient({ campaign }: CandidatePageClientProps) {
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  const [openForm, setOpenForm] = useState<ActionFormType | null>(null);
  const [countdown, setCountdown] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null);
  const [adoniPrompt, setAdoniPrompt] = useState("");
  const [adoniReply, setAdoniReply] = useState<string | null>(null);
  const [engagementTab, setEngagementTab] = useState<EngagementTab>("support");

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaEnabled = Boolean(turnstileSiteKey);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const [supportForm, setSupportForm] = useState({ name: "", email: "", phone: "", postalCode: "", wantsSign: false, wantsVolunteer: false, updates: true, consent: false });
  const [volunteerForm, setVolunteerForm] = useState({ name: "", email: "", phone: "", weekends: false, evenings: false, flexible: true, canvassing: false, driving: false, dataEntry: false, socialMedia: false, events: false, consent: false });
  const [donateForm, setDonateForm] = useState({ amount: 50, customAmount: "", donorName: "", donorEmail: "", donorAddress: "", donorPostalCode: "", consent: false });
  const [subscribeForm, setSubscribeForm] = useState({ name: "", email: "", phone: "", textUpdates: false, postalCode: "", consent: false });
  const [signForm, setSignForm] = useState({ name: "", email: "", address: "", phone: "", postalCode: "", cornerLot: false, canDistribute: false, consent: false });
  const [questionForm, setQuestionForm] = useState({ name: "", email: "", question: "", consent: false });
  const [rsvpForm, setRsvpForm] = useState({ name: "", email: "", phone: "", consent: false });
  const [submitting, setSubmitting] = useState<string | null>(null);

  const formAnchorRef = useRef<HTMLDivElement | null>(null);

  // ── Track page view + load per-campaign analytics ──
  useEffect(() => {
    // Increment page view counter
    fetch(`/api/campaigns/${campaign.id}/customization`, { method: "POST" }).catch(() => {});

    // Per-campaign Google Analytics
    if (campaign.gaId && typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${campaign.gaId}`;
      script.async = true;
      document.head.appendChild(script);
      const w = window as unknown as Record<string, unknown>;
      w.dataLayer = (w.dataLayer as unknown[]) || [];
      const gtag = (...args: unknown[]) => { (w.dataLayer as unknown[]).push(args); };
      gtag("js", new Date());
      gtag("config", campaign.gaId);
    }

    // Per-campaign Meta Pixel
    if (campaign.metaPixelId && typeof window !== "undefined") {
      const w = window as unknown as Record<string, unknown>;
      if (!w.fbq) {
        const script = document.createElement("script");
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
          const fbq = w.fbq as ((...args: unknown[]) => void) | undefined;
          if (fbq) {
            fbq("init", campaign.metaPixelId);
            fbq("track", "PageView");
          }
        };
      }
    }
  }, [campaign.id, campaign.gaId, campaign.metaPixelId]);

  // Fire tracking events to GA4 + Meta Pixel
  const fireTrackingEvent = (eventName: string, params?: Record<string, unknown>) => {
    try {
      // GA4 event
      const w = window as unknown as Record<string, unknown>;
      if (typeof w.gtag === "function") {
        (w.gtag as (...args: unknown[]) => void)("event", eventName, params);
      }
      // Meta Pixel event
      if (typeof w.fbq === "function") {
        (w.fbq as (...args: unknown[]) => void)("track", eventName, params);
      }
    } catch {}
  };

  const primary = campaign.primaryColor || NAVY;
  const accent = campaign.accentColor || GREEN;
  const heroPhoto = campaign.customization.candidatePhotoUrl || campaign.logoUrl;
  const aboutPhoto = campaign.customization.candidatePhotoUrl2 || heroPhoto;
  const candidateTagline = campaign.tagline || `Fighting for ${municipalityLabel(campaign)} residents in ${electionYear(campaign)}.`;
  const layout = campaign.customization.layout || "professional";

  const platformItems = useMemo(() => {
    if (campaign.customization.issues.length > 0) {
      return [...campaign.customization.issues].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return [
      { id: "placeholder-1", title: "Affordable Housing", summary: "Build practical housing supply for working families.", details: "Practical housing actions and accountability metrics will be published by the campaign." },
      { id: "placeholder-2", title: "Reliable Transit", summary: "Faster service and better coverage for commuters.", details: "Transit reliability plans and service benchmarks will be published by the campaign." },
      { id: "placeholder-3", title: "Safer Communities", summary: "Neighborhood-first safety and prevention programs.", details: "Community safety implementation details will be published by the campaign." },
    ];
  }, [campaign.customization.issues]);

  const mapData = useMemo(() => {
    const eventPoints = campaign.events
      .filter((event) => typeof event.lat === "number" && typeof event.lng === "number")
      .map((event) => ({ id: event.id, label: event.name, lat: event.lat as number, lng: event.lng as number }));

    const officePoint = readGeoPointFromAddress(null);
    const hasBoundary = Boolean(campaign.customization.boundaryGeoJSON);
    const showMap = hasBoundary || eventPoints.length > 0 || Boolean(officePoint);

    return { showMap, boundaryGeoJSON: campaign.customization.boundaryGeoJSON, eventPoints, officePoint };
  }, [campaign.customization.boundaryGeoJSON, campaign.events]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const election = campaign.electionDate ? new Date(campaign.electionDate) : null;
    const update = () => setCountdown(formatCountdown(election));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [campaign.electionDate]);

  useEffect(() => {
    const sectionIds = ["hero", "platform", "about", "election-history", "engagement", "events", "qa"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { threshold: [0.2, 0.4, 0.6], rootMargin: "-20% 0px -55% 0px" },
    );

    sections.forEach((section) => observer.observe(section));

    const hero = document.getElementById("hero");
    const footer = document.getElementById("campaign-footer");
    const heroObserver = new IntersectionObserver((entries) => setHeroVisible(entries[0]?.isIntersecting ?? false), { threshold: 0.15 });
    const footerObserver = new IntersectionObserver((entries) => setFooterVisible(entries[0]?.isIntersecting ?? false), { threshold: 0.1 });

    if (hero) heroObserver.observe(hero);
    if (footer) footerObserver.observe(footer);

    return () => {
      observer.disconnect();
      heroObserver.disconnect();
      footerObserver.disconnect();
    };
  }, [campaign.events.length]);

  const currentRsvpEvent = rsvpEventId ? campaign.events.find((event) => event.id === rsvpEventId) || null : null;

  const submitJson = useCallback(async (path: string, payload: Record<string, unknown>, actionKey: string) => {
    if (captchaEnabled && !captchaToken) {
      toast.error("Please complete captcha verification first.");
      return null;
    }

    setSubmitting(actionKey);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(captchaEnabled ? { ...payload, captchaToken } : payload),
      });

      const body = (await response.json().catch(() => null)) as { error?: string; checkoutUrl?: string } | null;
      if (!response.ok) {
        toast.error(body?.error || "Submission failed. Please try again.");
        return null;
      }

      if (captchaEnabled) {
        setCaptchaToken(null);
        setCaptchaResetSignal((value) => value + 1);
      }

      return body;
    } catch {
      toast.error("Network error. Please try again.");
      return null;
    } finally {
      setSubmitting(null);
    }
  }, [captchaEnabled, captchaToken]);

  async function onSupportSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supportForm.consent) { toast.error("Consent is required."); return; }
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/support`, {
      name: supportForm.name, email: supportForm.email, householdCount: supportForm.postalCode || undefined,
    }, "support");
    if (!result) return;
    toast.success("Support recorded. Thank you.");
    fireTrackingEvent("Lead", { content_name: "supporter_signup" });
    setSupportForm({ name: "", email: "", phone: "", postalCode: "", wantsSign: false, wantsVolunteer: false, updates: true, consent: false });
    setOpenForm(null);
  }

  async function onVolunteerSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!volunteerForm.consent) { toast.error("Consent is required."); return; }
    const availability = [volunteerForm.weekends ? "Weekends" : null, volunteerForm.evenings ? "Evenings" : null, volunteerForm.flexible ? "Flexible" : null].filter(Boolean).join(", ");
    const skills = [volunteerForm.canvassing ? "Canvassing" : null, volunteerForm.driving ? "Driving" : null, volunteerForm.dataEntry ? "Data Entry" : null, volunteerForm.socialMedia ? "Social Media" : null, volunteerForm.events ? "Events" : null].filter(Boolean).join(", ");
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/volunteer`, {
      name: volunteerForm.name, email: volunteerForm.email, phone: volunteerForm.phone,
      message: `Availability: ${availability || "Not provided"}. Skills: ${skills || "Not provided"}.`,
    }, "volunteer");
    if (!result) return;
    toast.success("Volunteer request received.");
    fireTrackingEvent("Lead", { content_name: "volunteer_signup" });
    setVolunteerForm({ name: "", email: "", phone: "", weekends: false, evenings: false, flexible: true, canvassing: false, driving: false, dataEntry: false, socialMedia: false, events: false, consent: false });
    setOpenForm(null);
  }

  async function onDonateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!donateForm.consent) { toast.error("Consent is required."); return; }
    const normalizedAmount = donateForm.customAmount ? Number(donateForm.customAmount) : donateForm.amount;
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/donate`, {
      amount: normalizedAmount, donorName: donateForm.donorName, donorEmail: donateForm.donorEmail,
      donorAddress: donateForm.donorAddress, donorPostalCode: donateForm.donorPostalCode,
    }, "donate");
    if (!result) return;
    if (result.checkoutUrl) {
      window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening secure checkout.");
      fireTrackingEvent("Purchase", { content_name: "donation", value: normalizedAmount, currency: "CAD" });
    }
    setOpenForm(null);
  }

  async function onSubscribeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!subscribeForm.consent) { toast.error("Consent is required."); return; }
    const parts = subscribeForm.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    const result = await submitJson("/api/newsletters/subscribe", {
      email: subscribeForm.email, firstName, lastName, postalCode: subscribeForm.postalCode || undefined, campaignId: campaign.id,
    }, "subscribe");
    if (!result) return;
    toast.success("Subscribed successfully.");
    setSubscribeForm({ name: "", email: "", phone: "", textUpdates: false, postalCode: "", consent: false });
    setOpenForm(null);
  }

  async function onSignSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!signForm.consent) { toast.error("Consent is required."); return; }
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/sign-request`, {
      name: signForm.name, email: signForm.email, address: signForm.address,
    }, "sign");
    if (!result) return;
    toast.success("Sign request submitted.");
    setSignForm({ name: "", email: "", address: "", phone: "", postalCode: "", cornerLot: false, canDistribute: false, consent: false });
  }

  async function onQuestionSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!questionForm.consent) { toast.error("Consent is required."); return; }
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/question`, {
      name: questionForm.name, email: questionForm.email, question: questionForm.question,
    }, "question");
    if (!result) return;
    toast.success("Question submitted for review.");
    setQuestionForm({ name: "", email: "", question: "", consent: false });
  }

  async function onRsvpSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentRsvpEvent) return;
    if (!rsvpForm.consent) { toast.error("Consent is required."); return; }
    const result = await submitJson(`/api/public/events/${currentRsvpEvent.id}/rsvp`, {
      name: rsvpForm.name, email: rsvpForm.email, phone: rsvpForm.phone, status: "going",
    }, "rsvp");
    if (!result) return;
    toast.success("RSVP confirmed.");
    setRsvpEventId(null);
    setRsvpForm({ name: "", email: "", phone: "", consent: false });
  }

  function openInlineForm(type: ActionFormType) {
    setOpenForm(type);
    setTimeout(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function askAdoni(event: React.FormEvent) {
    event.preventDefault();
    if (!adoniPrompt.trim()) return;
    const query = adoniPrompt.toLowerCase();
    const match = campaign.customization.faqs.find((item) => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query));
    if (match) {
      setAdoniReply(match.a);
    } else if (platformItems.length > 0) {
      setAdoniReply(`${campaign.candidateName}'s platform emphasizes ${platformItems[0].title.toLowerCase()}. More details are available in the platform section above.`);
    } else {
      setAdoniReply("The campaign will publish more approved platform answers soon. Please submit your question below for a direct response.");
    }
  }

  function shareIssueLink(issueId: string) {
    const shareUrl = `${window.location.origin}/candidates/${campaign.slug}#issue-${issueId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Issue link copied.");
  }

  function shareCampaign() {
    const shareUrl = `${window.location.origin}/candidates/${campaign.slug}`;
    if (navigator.share) {
      navigator.share({ title: `${campaign.candidateName} Campaign`, url: shareUrl }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success("Campaign link copied.");
  }

  const showStickyTabs = !heroVisible && !footerVisible;

  // Social media links
  const socialLinks = [
    campaign.twitterHandle ? { href: `https://twitter.com/${campaign.twitterHandle.replace("@", "")}`, label: "Twitter", icon: <TwitterIcon /> } : null,
    campaign.facebookUrl ? { href: campaign.facebookUrl, label: "Facebook", icon: <FacebookIcon /> } : null,
    campaign.instagramHandle ? { href: `https://instagram.com/${campaign.instagramHandle.replace("@", "")}`, label: "Instagram", icon: <InstagramIcon /> } : null,
    campaign.linkedInUrl ? { href: campaign.linkedInUrl, label: "LinkedIn", icon: <LinkedInIcon /> } : null,
    campaign.websiteUrl ? { href: campaign.websiteUrl, label: "Website", icon: <Globe size={18} /> } : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  const engagementTabs: { key: EngagementTab; label: string; icon: typeof Heart }[] = [
    { key: "support", label: "Support", icon: Heart },
    { key: "volunteer", label: "Volunteer", icon: Handshake },
    { key: "sign", label: "Lawn Sign", icon: ClipboardList },
    { key: "question", label: "Ask a Question", icon: MessageSquare },
    { key: "events", label: "RSVP", icon: Calendar },
    ...(campaign.donationsEnabled ? [{ key: "donate" as EngagementTab, label: "Donate", icon: DollarSign }] : []),
  ];

  const inputClass = "w-full border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all min-h-[44px]";
  const inputRingStyle = { "--tw-ring-color": hexToTint(accent, 0.3) } as React.CSSProperties;
  const btnPrimary = "rounded-lg text-white px-6 py-3 font-semibold min-h-[44px] transition-all hover:opacity-90 disabled:opacity-60";
  const btnSecondary = "rounded-lg border border-slate-200 px-6 py-3 font-semibold min-h-[44px] transition-all hover:bg-slate-50 text-slate-700";

  const pageFontStyle: React.CSSProperties = layout === "minimal"
    ? { fontFamily: "Georgia, 'Times New Roman', serif" }
    : { fontFamily: "'Inter', system-ui, -apple-system, sans-serif" };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={pageFontStyle}>

      <CandidateNav campaign={campaign} scrolled={scrolled} activeSection={activeSection} onAction={openInlineForm} primary={primary} accent={accent} />

      {/* ============================================================ */}
      {/*  HERO — 4 layout variants                                     */}
      {/* ============================================================ */}

      {/* ── PROFESSIONAL: photo left, text right, traditional grid ── */}
      {layout === "professional" && (
        <section
          id="hero"
          className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden"
          style={{
            background: campaign.customization.backgroundImageUrl
              ? `linear-gradient(to right, ${primary}ee 0%, ${primary}cc 50%, transparent 100%), url(${campaign.customization.backgroundImageUrl}) center/cover`
              : primary,
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full relative z-10 grid md:grid-cols-[2fr_3fr] gap-12 items-center py-24">
            {/* Photo LEFT */}
            {heroPhoto ? (
              <motion.div
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="hidden md:block"
              >
                <MediaAvatar
                  name={campaign.candidateName}
                  imageUrl={heroPhoto}
                  className="h-[540px] w-full rounded-3xl"
                  bg={`linear-gradient(180deg, ${primary}, ${primary}dd)`}
                  textClassName="text-white text-7xl font-black tracking-tight"
                />
              </motion.div>
            ) : <div className="hidden md:block" />}

            {/* Text RIGHT */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="text-white"
            >
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-white/60">
                  {officeLabel(campaign)} &middot; {municipalityLabel(campaign)} &middot; {electionYear(campaign)}
                </p>
                {campaign.isVerified ? <VerifiedBadge /> : null}
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
                {campaign.candidateName}
              </h1>
              <p className="mt-6 text-xl text-white/75 max-w-xl leading-relaxed">
                {candidateTagline}
              </p>
              {countdown ? (
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white/80">
                  <Clock3 size={16} />{countdown} until election day
                </div>
              ) : null}
              {socialLinks.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <SocialButton key={link.label} href={link.href} label={link.label} icon={link.icon} />
                  ))}
                </div>
              ) : null}
              <div className="mt-10 flex flex-wrap gap-4">
                <button onClick={() => openInlineForm("support")} className="rounded-full bg-white text-slate-900 font-semibold px-8 py-4 text-base hover:shadow-xl transition-shadow">
                  Support {campaign.candidateName.split(" ")[0]}
                </button>
                {campaign.donationsEnabled && (
                  <button onClick={() => openInlineForm("donate")} className="rounded-full font-semibold px-8 py-4 text-base text-white transition-all hover:opacity-90" style={{ backgroundColor: accent }}>
                    Donate
                  </button>
                )}
                <button onClick={() => openInlineForm("volunteer")} className="rounded-full border border-white/25 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-all">
                  Volunteer
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── MODERN: full-width immersive, centered circular photo, floating card ── */}
      {layout === "modern" && (
        <section
          id="hero"
          className="relative min-h-screen flex flex-col overflow-hidden"
          style={{
            background: campaign.customization.heroBannerUrl
              ? `linear-gradient(to bottom, ${primary}55 0%, ${primary}ee 65%), url(${campaign.customization.heroBannerUrl}) center/cover`
              : `radial-gradient(ellipse 120% 80% at 50% 0%, ${hexToTint(primary, 0.6)} 0%, ${primary} 55%)`,
          }}
        >
          {/* Centered photo upper area */}
          <div className="flex-1 flex items-center justify-center pt-36 pb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col items-center text-center text-white gap-6"
            >
              <div className="relative w-36 h-36 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                {heroPhoto ? (
                  <Image src={heroPhoto} alt={campaign.candidateName} fill sizes="208px" className="object-cover object-top" unoptimized={heroPhoto.startsWith("http")} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black" style={{ background: "rgba(255,255,255,0.15)" }}>
                    {initialsFromName(campaign.candidateName)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                    {officeLabel(campaign)} &middot; {municipalityLabel(campaign)} &middot; {electionYear(campaign)}
                  </p>
                  {campaign.isVerified ? <VerifiedBadge /> : null}
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] text-white">
                  {campaign.candidateName}
                </h1>
                <p className="mt-5 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
                  {candidateTagline}
                </p>
                {countdown ? (
                  <div className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white/80">
                    <Clock3 size={16} />{countdown} until election day
                  </div>
                ) : null}
                {socialLinks.length > 0 ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {socialLinks.map((link) => (
                      <SocialButton key={link.label} href={link.href} label={link.label} icon={link.icon} />
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>

          {/* Frosted bottom card with CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="border-t border-white/15 bg-white/10 backdrop-blur-md px-4 sm:px-6 py-8"
          >
            <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => openInlineForm("support")} className="rounded-full bg-white text-slate-900 font-semibold px-8 py-4 text-base hover:shadow-xl transition-shadow">
                Support {campaign.candidateName.split(" ")[0]}
              </button>
              {campaign.donationsEnabled && (
                <button onClick={() => openInlineForm("donate")} className="rounded-full font-semibold px-8 py-4 text-base text-white transition-all hover:opacity-90" style={{ backgroundColor: accent }}>
                  Donate
                </button>
              )}
              <button onClick={() => openInlineForm("volunteer")} className="rounded-full border border-white/30 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-all">
                Volunteer
              </button>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── BOLD: manifesto style, massive type, high contrast, no photo in hero ── */}
      {layout === "bold" && (
        <section
          id="hero"
          className="relative min-h-screen flex flex-col justify-center overflow-hidden"
          style={{ backgroundColor: primary }}
        >
          {/* Vertical accent stripe */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accent }} />
          <div className="absolute right-6 top-0 bottom-0 w-px" style={{ backgroundColor: `${accent}40` }} />

          <div className="max-w-6xl mx-auto px-4 sm:px-8 w-full py-28 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9 }}
            >
              {/* Office label */}
              <p className="text-xs font-bold uppercase tracking-[0.35em] mb-8" style={{ color: accent }}>
                {officeLabel(campaign)} &middot; {municipalityLabel(campaign)} &middot; {electionYear(campaign)}
                {campaign.isVerified ? " ✓" : ""}
              </p>

              {/* Massive name — each word on its own line */}
              <h1 className="text-white font-black leading-none tracking-tight" style={{ fontSize: "clamp(3.5rem, 13vw, 9.5rem)" }}>
                {campaign.candidateName.split(" ").map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </h1>

              {/* Horizontal rule */}
              <div className="mt-10 mb-8 h-px w-28" style={{ backgroundColor: accent }} />

              {/* Tagline */}
              <p className="text-white/55 text-xl md:text-2xl max-w-2xl leading-relaxed font-normal">
                {candidateTagline}
              </p>

              {countdown ? (
                <p className="mt-5 text-sm font-medium text-white/40 uppercase tracking-widest">
                  {countdown} until election day
                </p>
              ) : null}

              {socialLinks.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <SocialButton key={link.label} href={link.href} label={link.label} icon={link.icon} />
                  ))}
                </div>
              ) : null}

              {/* Square CTAs — no rounded corners, more editorial */}
              <div className="mt-12 flex flex-wrap gap-4">
                <button onClick={() => openInlineForm("support")} className="border-2 border-white text-white font-bold px-10 py-4 text-sm uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                  Support
                </button>
                {campaign.donationsEnabled && (
                  <button onClick={() => openInlineForm("donate")} className="font-bold px-10 py-4 text-sm uppercase tracking-widest text-white transition-all hover:opacity-80 border-2" style={{ backgroundColor: accent, borderColor: accent }}>
                    Donate
                  </button>
                )}
                <button onClick={() => openInlineForm("volunteer")} className="border border-white/20 text-white/70 font-semibold px-10 py-4 text-sm uppercase tracking-widest hover:border-white/50 hover:text-white transition-all">
                  Volunteer
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── MINIMAL: editorial whitespace, serif, newspaper-like ── */}
      {layout === "minimal" && (
        <section
          id="hero"
          className="relative min-h-screen flex items-center overflow-hidden"
          style={{ backgroundColor: hexToTint(primary, 0.04), fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {/* Thin top border in primary color */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: primary }} />

          <div className="max-w-5xl mx-auto px-4 sm:px-8 w-full py-32">
            <div className="grid md:grid-cols-[1fr_auto] gap-16 items-start">
              {/* Text LEFT */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                {campaign.isVerified ? (
                  <div className="flex items-center gap-2 mb-6">
                    <CheckCircle2 size={14} style={{ color: primary }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: primary }}>Verified Official</span>
                  </div>
                ) : null}

                {/* Meta line */}
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-10 font-sans">
                  {officeLabel(campaign)} &middot; {municipalityLabel(campaign)} &middot; {electionYear(campaign)}
                </p>

                {/* Name in elegant large serif */}
                <h1 className="font-bold tracking-tight text-slate-900 leading-[1.05]" style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {campaign.candidateName}
                </h1>

                {/* Rule */}
                <div className="mt-8 mb-8 w-20 h-px" style={{ backgroundColor: primary }} />

                {/* Tagline in italic serif */}
                <p className="text-slate-600 text-xl leading-relaxed max-w-lg italic">
                  &ldquo;{candidateTagline}&rdquo;
                </p>

                {countdown ? (
                  <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 font-sans">
                    <Clock3 size={14} />{countdown} until election day
                  </div>
                ) : null}

                {socialLinks.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {socialLinks.map((link) => ({
                      ...link,
                      // Restyle social buttons for minimal layout
                    })).map((link) => (
                      <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full border text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all font-sans"
                        style={{ borderColor: "currentColor" }}>
                        {link.icon}
                      </a>
                    ))}
                  </div>
                ) : null}

                {/* Subdued CTAs */}
                <div className="mt-10 flex flex-wrap gap-3 font-sans">
                  <button onClick={() => openInlineForm("support")} className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: primary }}>
                    Support the Campaign
                  </button>
                  {campaign.donationsEnabled && (
                    <button onClick={() => openInlineForm("donate")} className="px-8 py-3 text-sm font-semibold border hover:bg-gray-50 transition-colors" style={{ color: primary, borderColor: primary }}>
                      Donate
                    </button>
                  )}
                  <button onClick={() => openInlineForm("volunteer")} className="px-8 py-3 text-sm font-semibold text-slate-500 border border-slate-300 hover:bg-gray-50 transition-colors">
                    Volunteer
                  </button>
                </div>
              </motion.div>

              {/* Photo RIGHT — tall editorial portrait */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.15 }}
                className="hidden md:block"
              >
                <MediaAvatar
                  name={campaign.candidateName}
                  imageUrl={heroPhoto}
                  className="w-56 h-80 rounded-none"
                  bg={primary}
                  textClassName="text-white text-5xl font-black"
                />
                <div className="mt-2 w-full h-0.5" style={{ backgroundColor: primary }} />
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  Inline form anchor + sticky tabs                             */}
      {/* ============================================================ */}
      <div ref={formAnchorRef} className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 pt-8">
        {showStickyTabs ? (
          <div className="sticky top-16 z-30 rounded-full bg-white/95 backdrop-blur-md shadow-sm px-2 py-1.5 mb-6 hidden md:block border border-slate-100">
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => openInlineForm("support")} className="rounded-full py-2 px-5 font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 min-h-[40px] transition-colors">Support</button>
              <button onClick={() => openInlineForm("volunteer")} className="rounded-full py-2 px-5 font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 min-h-[40px] transition-colors">Volunteer</button>
              {campaign.donationsEnabled && <button onClick={() => openInlineForm("donate")} className="rounded-full py-2 px-5 font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 min-h-[40px] transition-colors">Donate</button>}
              <button onClick={() => openInlineForm("subscribe")} className="rounded-full py-2 px-5 font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 min-h-[40px] transition-colors">Subscribe</button>
            </div>
          </div>
        ) : null}

        <AnimatePresence>
          {openForm ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springTransition}
              className="rounded-2xl border border-slate-100 bg-white shadow-xl p-6 md:p-8 mb-12"
            >
              {openForm === "support" ? (
                <form onSubmit={onSupportSubmit} className="space-y-5">
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: primary }}>Add Your Support</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={supportForm.name} onChange={(e) => setSupportForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                    <input required type="email" value={supportForm.email} onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    <input value={supportForm.phone} onChange={(e) => setSupportForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Phone" />
                    <input value={supportForm.postalCode} onChange={(e) => setSupportForm((s) => ({ ...s, postalCode: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Postal Code" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-sm">
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.wantsSign} onChange={(e) => setSupportForm((s) => ({ ...s, wantsSign: e.target.checked }))} className="h-4 w-4 rounded" /> I want a lawn sign</label>
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.wantsVolunteer} onChange={(e) => setSupportForm((s) => ({ ...s, wantsVolunteer: e.target.checked }))} className="h-4 w-4 rounded" /> I want to volunteer</label>
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.updates} onChange={(e) => setSupportForm((s) => ({ ...s, updates: e.target.checked }))} className="h-4 w-4 rounded" /> Keep me updated</label>
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={supportForm.consent} onChange={(e) => setSupportForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "support"} className={btnPrimary} style={{ backgroundColor: primary }}>{submitting === "support" ? "Submitting..." : "Add My Support"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "volunteer" ? (
                <form onSubmit={onVolunteerSubmit} className="space-y-5">
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: primary }}>Volunteer</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input required value={volunteerForm.name} onChange={(e) => setVolunteerForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                    <input required type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    <input required value={volunteerForm.phone} onChange={(e) => setVolunteerForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Phone *" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Availability</p>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.weekends} onChange={(e) => setVolunteerForm((s) => ({ ...s, weekends: e.target.checked }))} className="h-4 w-4 rounded" /> Weekends</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.evenings} onChange={(e) => setVolunteerForm((s) => ({ ...s, evenings: e.target.checked }))} className="h-4 w-4 rounded" /> Evenings</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.flexible} onChange={(e) => setVolunteerForm((s) => ({ ...s, flexible: e.target.checked }))} className="h-4 w-4 rounded" /> Flexible</label>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Skills</p>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.canvassing} onChange={(e) => setVolunteerForm((s) => ({ ...s, canvassing: e.target.checked }))} className="h-4 w-4 rounded" /> Canvassing</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.driving} onChange={(e) => setVolunteerForm((s) => ({ ...s, driving: e.target.checked }))} className="h-4 w-4 rounded" /> Driving</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.dataEntry} onChange={(e) => setVolunteerForm((s) => ({ ...s, dataEntry: e.target.checked }))} className="h-4 w-4 rounded" /> Data Entry</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.socialMedia} onChange={(e) => setVolunteerForm((s) => ({ ...s, socialMedia: e.target.checked }))} className="h-4 w-4 rounded" /> Social Media</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.events} onChange={(e) => setVolunteerForm((s) => ({ ...s, events: e.target.checked }))} className="h-4 w-4 rounded" /> Events</label>
                    </div>
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={volunteerForm.consent} onChange={(e) => setVolunteerForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "volunteer"} className={btnPrimary} style={{ backgroundColor: primary }}>{submitting === "volunteer" ? "Submitting..." : "Sign Up to Volunteer"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "donate" ? (
                <form onSubmit={onDonateSubmit} className="space-y-5">
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: primary }}>Donate</h3>
                  <div className="flex flex-wrap gap-2">
                    {[25, 50, 100, 250].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDonateForm((s) => ({ ...s, amount, customAmount: "" }))}
                        className={`rounded-lg px-5 py-3 text-sm font-semibold border min-h-[44px] transition-all ${donateForm.amount === amount && !donateForm.customAmount ? "text-white border-transparent" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                        style={donateForm.amount === amount && !donateForm.customAmount ? { backgroundColor: accent } : undefined}
                      >
                        ${amount}
                      </button>
                    ))}
                    <input value={donateForm.customAmount} onChange={(e) => setDonateForm((s) => ({ ...s, customAmount: e.target.value }))} type="number" min={1} max={1200} className={`${inputClass} !w-28`} style={inputRingStyle} placeholder="Other" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={donateForm.donorName} onChange={(e) => setDonateForm((s) => ({ ...s, donorName: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                    <input required type="email" value={donateForm.donorEmail} onChange={(e) => setDonateForm((s) => ({ ...s, donorEmail: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    <input value={donateForm.donorAddress} onChange={(e) => setDonateForm((s) => ({ ...s, donorAddress: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Address" />
                    <input value={donateForm.donorPostalCode} onChange={(e) => setDonateForm((s) => ({ ...s, donorPostalCode: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Postal Code" />
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={donateForm.consent} onChange={(e) => setDonateForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "donate"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "donate" ? "Processing..." : "Donate Securely via Stripe"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "subscribe" ? (
                <form onSubmit={onSubscribeSubmit} className="space-y-5">
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: primary }}>Subscribe for Updates</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={subscribeForm.name} onChange={(e) => setSubscribeForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                    <input required type="email" value={subscribeForm.email} onChange={(e) => setSubscribeForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    <input value={subscribeForm.phone} onChange={(e) => setSubscribeForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Phone" />
                    <input value={subscribeForm.postalCode} onChange={(e) => setSubscribeForm((s) => ({ ...s, postalCode: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Postal Code" />
                  </div>
                  <label className="text-sm flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={subscribeForm.textUpdates} onChange={(e) => setSubscribeForm((s) => ({ ...s, textUpdates: e.target.checked }))} className="h-4 w-4 rounded" /> Text updates</label>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={subscribeForm.consent} onChange={(e) => setSubscribeForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "subscribe"} className={btnPrimary} style={{ backgroundColor: primary }}>{submitting === "subscribe" ? "Submitting..." : "Subscribe"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/*  Live Widgets - Supporter count, poll, activity                */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28" style={{ backgroundColor: hexToTint(primary, 0.03) }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto px-4 sm:px-6"
        >
          <div className={`grid gap-6 ${campaign.activePoll ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            <AnimatedNumber value={campaign.supporterCount} label="Supporters" icon={Users} accentColor={accent} />
            <AnimatedNumber value={campaign.volunteerCount} label="Volunteers" icon={Handshake} accentColor={accent} />
            <AnimatedNumber value={campaign.doorsKnockedCount} label="Doors Knocked" icon={DoorOpen} accentColor={accent} />
            {campaign.activePoll ? <PollWidget poll={campaign.activePoll} accent={accent} /> : null}
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  Quote Banner                                                 */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32" style={{ backgroundColor: primary }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl leading-snug font-black tracking-tight"
          >
            &ldquo;{candidateTagline}&rdquo;
          </motion.p>
          <button
            onClick={() => openInlineForm("support")}
            className="mt-10 rounded-full bg-white text-slate-900 px-8 py-4 font-semibold hover:shadow-xl transition-shadow text-base"
          >
            Add Your Support Today
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PLATFORM                                                     */}
      {/* ============================================================ */}
      <section id="platform" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Platform" title="What I Stand For" subtitle={`Key priorities for ${municipalityLabel(campaign)}`} accentColor={accent} />
          {campaign.customization.issues.length === 0 ? (
            <p className="mb-8 text-slate-500">Campaign is adding platform content soon.</p>
          ) : null}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {platformItems.map((issue, index) => {
              const expanded = expandedIssue === issue.id;
              return (
                <article
                  key={issue.id}
                  id={`issue-${issue.id}`}
                  className="rounded-2xl border border-slate-100 p-6 md:p-8 hover:border-slate-200 transition-colors bg-white"
                >
                  <div className="flex items-start gap-5">
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black tracking-tight text-slate-900">{issue.title}</h3>
                      <p className="mt-2 text-slate-600 leading-relaxed">{issue.summary || "Detailed platform position will be published soon."}</p>
                      <AnimatePresence>
                        {expanded ? (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 text-sm text-slate-700 whitespace-pre-wrap overflow-hidden leading-relaxed"
                          >
                            {issue.details || "More details coming soon."}
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                      <div className="mt-4 flex items-center gap-4">
                        <button
                          onClick={() => setExpandedIssue((id) => (id === issue.id ? null : issue.id))}
                          className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
                          style={{ color: accent }}
                        >
                          {expanded ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Read More</>}
                        </button>
                        <button onClick={() => shareIssueLink(issue.id)} className="text-sm font-medium text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 transition-colors">
                          <Share2 size={14} /> Share
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ABOUT                                                        */}
      {/* ============================================================ */}
      <section id="about" className="py-20 md:py-28" style={{ backgroundColor: hexToTint(primary, 0.03) }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <MediaAvatar
              name={campaign.candidateName}
              imageUrl={aboutPhoto}
              className="h-[400px] md:h-[500px] rounded-3xl"
              bg={primary}
              textClassName="text-white text-5xl font-black"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <SectionTitle eyebrow="About" title={`About ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} accentColor={accent} />
            <p className="text-slate-600 leading-relaxed text-base whitespace-pre-wrap">{campaign.candidateBio || "Campaign bio coming soon."}</p>
            {campaign.customization.communityConnections.length > 0 ? (
              <ul className="mt-8 space-y-3 text-slate-600">
                {campaign.customization.communityConnections.map((connection) => (
                  <li key={connection} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                    {connection}
                  </li>
                ))}
              </ul>
            ) : null}
            {campaign.customization.yearsInCommunity ? (
              <p className="mt-6 text-sm font-semibold text-slate-500">{campaign.customization.yearsInCommunity} years in {municipalityLabel(campaign)}</p>
            ) : null}
            {campaign.customization.videoUrl ? (
              <div className="mt-8 rounded-2xl overflow-hidden">
                {buildYoutubeEmbed(campaign.customization.videoUrl) ? (
                  <iframe
                    title="Candidate video"
                    src={buildYoutubeEmbed(campaign.customization.videoUrl) || undefined}
                    className="w-full h-64"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ENDORSEMENTS                                                 */}
      {/* ============================================================ */}
      {campaign.customization.endorsements.length > 0 ? (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Endorsements" title={`Who Supports ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} accentColor={accent} />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {campaign.customization.endorsements.map((endorsement) => (
                <article key={endorsement.id} className="rounded-2xl border border-slate-100 p-8 hover:border-slate-200 transition-colors">
                  <div className="text-4xl leading-none mb-4" style={{ color: hexToTint(accent, 0.3) }}>&ldquo;</div>
                  <p className="text-slate-700 leading-relaxed">{endorsement.quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    {endorsement.photoUrl ? (
                      <MediaAvatar name={endorsement.name} imageUrl={endorsement.photoUrl} className="h-12 w-12 rounded-full" bg={primary} textClassName="text-white text-sm font-bold" />
                    ) : null}
                    <div>
                      <p className="font-bold text-slate-900">{endorsement.name}</p>
                      {endorsement.role ? <p className="text-sm text-slate-500">{endorsement.role}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  ELECTION HISTORY                                             */}
      {/* ============================================================ */}
      {campaign.electionHistory.length > 0 ? (
        <section id="election-history" className="py-20 md:py-28" style={{ backgroundColor: hexToTint(primary, 0.03) }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Track Record" title="Election History" subtitle={`Past election results for ${campaign.candidateName}`} accentColor={accent} />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              <ElectionHistoryTable records={campaign.electionHistory} />
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  PUBLIC ENGAGEMENT FORMS (Tabbed)                             */}
      {/* ============================================================ */}
      <section id="engagement" className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Get Involved" title="How You Can Help" subtitle="Choose how you want to support this campaign" accentColor={accent} />

          {/* Tab bar — horizontal pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {engagementTabs.map((tab) => {
              const isActive = engagementTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setEngagementTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium min-h-[40px] transition-all ${isActive ? "text-white shadow-sm" : "text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700"}`}
                  style={isActive ? { backgroundColor: primary } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* Support tab */}
            {engagementTab === "support" ? (
              <motion.div key="support" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8">
                  <h3 className="text-xl font-black mb-1" style={{ color: primary }}>I support {campaign.candidateName}</h3>
                  <p className="text-slate-500 text-sm mb-6">Add your name to show your support</p>
                  <form onSubmit={onSupportSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={supportForm.name} onChange={(e) => setSupportForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                      <input required type="email" value={supportForm.email} onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={supportForm.consent} onChange={(e) => setSupportForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "support"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "support" ? "Submitting..." : "Add My Support"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Volunteer tab */}
            {engagementTab === "volunteer" ? (
              <motion.div key="volunteer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8">
                  <h3 className="text-xl font-black mb-6" style={{ color: primary }}>Volunteer Signup</h3>
                  <form onSubmit={onVolunteerSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-3">
                      <input required value={volunteerForm.name} onChange={(e) => setVolunteerForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                      <input required type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                      <input required value={volunteerForm.phone} onChange={(e) => setVolunteerForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Phone *" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.weekends} onChange={(e) => setVolunteerForm((s) => ({ ...s, weekends: e.target.checked }))} className="h-4 w-4 rounded" /> Weekends</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.evenings} onChange={(e) => setVolunteerForm((s) => ({ ...s, evenings: e.target.checked }))} className="h-4 w-4 rounded" /> Evenings</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.canvassing} onChange={(e) => setVolunteerForm((s) => ({ ...s, canvassing: e.target.checked }))} className="h-4 w-4 rounded" /> Canvassing</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.driving} onChange={(e) => setVolunteerForm((s) => ({ ...s, driving: e.target.checked }))} className="h-4 w-4 rounded" /> Driving</label>
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={volunteerForm.consent} onChange={(e) => setVolunteerForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "volunteer"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "volunteer" ? "Submitting..." : "Sign Up"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Lawn sign tab */}
            {engagementTab === "sign" ? (
              <motion.div key="sign" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8">
                  <h3 className="text-xl font-black mb-6" style={{ color: primary }}>Request a Lawn Sign</h3>
                  <form onSubmit={onSignSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={signForm.name} onChange={(e) => setSignForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                      <input required value={signForm.address} onChange={(e) => setSignForm((s) => ({ ...s, address: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Address *" />
                      <input required type="email" value={signForm.email} onChange={(e) => setSignForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                      <input value={signForm.phone} onChange={(e) => setSignForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Phone" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={signForm.consent} onChange={(e) => setSignForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "sign"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "sign" ? "Submitting..." : "Request My Sign"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Question tab */}
            {engagementTab === "question" ? (
              <motion.div key="question" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8">
                  <h3 className="text-xl font-black mb-6" style={{ color: primary }}>Ask a Question</h3>
                  <form onSubmit={onQuestionSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={questionForm.name} onChange={(e) => setQuestionForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                      <input required type="email" value={questionForm.email} onChange={(e) => setQuestionForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    </div>
                    <textarea required value={questionForm.question} onChange={(e) => setQuestionForm((s) => ({ ...s, question: e.target.value }))} className={`${inputClass} min-h-28`} style={inputRingStyle} placeholder={`Your question for ${campaign.candidateName}`} />
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={questionForm.consent} onChange={(e) => setQuestionForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "question"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "question" ? "Submitting..." : "Submit Question"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Events / RSVP tab */}
            {engagementTab === "events" ? (
              <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                {campaign.events.length > 0 ? (
                  <div className="space-y-4">
                    {campaign.events.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-100 bg-white p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            <Calendar size={14} />
                            <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span>&middot;</span>
                            <span>{new Date(event.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                          <h4 className="font-bold text-slate-900">{event.name}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {event.location}</p>
                        </div>
                        <button
                          onClick={() => setRsvpEventId(event.id)}
                          className="rounded-lg text-white px-6 py-3 text-sm font-semibold min-h-[44px] flex-shrink-0 transition-all hover:opacity-90"
                          style={{ backgroundColor: accent }}
                        >
                          RSVP
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
                    <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400">No upcoming events at the moment. Check back soon.</p>
                  </div>
                )}
              </motion.div>
            ) : null}

            {/* Donate tab */}
            {engagementTab === "donate" ? (
              <motion.div key="donate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8">
                  <h3 className="text-xl font-black mb-6" style={{ color: primary }}>Donate to the Campaign</h3>
                  <form onSubmit={onDonateSubmit} className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[25, 50, 100, 250].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setDonateForm((s) => ({ ...s, amount, customAmount: "" }))}
                          className={`rounded-lg px-5 py-3 text-sm font-semibold border min-h-[44px] transition-all ${donateForm.amount === amount && !donateForm.customAmount ? "text-white border-transparent" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                          style={donateForm.amount === amount && !donateForm.customAmount ? { backgroundColor: accent } : undefined}
                        >
                          ${amount}
                        </button>
                      ))}
                      <input value={donateForm.customAmount} onChange={(e) => setDonateForm((s) => ({ ...s, customAmount: e.target.value }))} type="number" min={1} max={1200} className={`${inputClass} !w-28`} style={inputRingStyle} placeholder="Other" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={donateForm.donorName} onChange={(e) => setDonateForm((s) => ({ ...s, donorName: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                      <input required type="email" value={donateForm.donorEmail} onChange={(e) => setDonateForm((s) => ({ ...s, donorEmail: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={donateForm.consent} onChange={(e) => setDonateForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "donate"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "donate" ? "Processing..." : "Donate via Stripe"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  EVENTS (full section)                                        */}
      {/* ============================================================ */}
      {campaign.events.length > 0 ? (
        <section id="events" className="py-20 md:py-28" style={{ backgroundColor: hexToTint(primary, 0.03) }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Events" title="Events and Town Halls" accentColor={accent} />
            <div className="space-y-4">
              {campaign.events.map((event) => (
                <motion.article
                  key={event.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-white border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 hover:border-slate-200 transition-colors"
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 text-center w-20">
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>
                      {new Date(event.eventDate).toLocaleDateString(undefined, { month: "short" })}
                    </p>
                    <p className="text-3xl font-black text-slate-900">{new Date(event.eventDate).getDate()}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(event.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-slate-900">{event.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14} /> {event.location}</p>
                    <p className="text-sm text-slate-400">{[event.city, event.province, event.postalCode].filter(Boolean).join(", ")}</p>
                    {event.description ? <p className="mt-2 text-sm text-slate-500 line-clamp-2">{event.description}</p> : null}
                  </div>
                  <button
                    onClick={() => setRsvpEventId(event.id)}
                    className="rounded-lg text-white px-6 py-3 text-sm font-semibold min-h-[44px] flex-shrink-0 transition-all hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    RSVP
                  </button>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  GALLERY                                                      */}
      {/* ============================================================ */}
      {campaign.customization.gallery.length > 0 ? (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Gallery" title="Campaign Moments" accentColor={accent} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...campaign.customization.gallery].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 12).map((photo) => (
                <div key={photo.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer">
                  <Image src={photo.url} alt={photo.caption || "Campaign photo"} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={photo.url.startsWith("http")} />
                  {photo.caption ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <p className="text-white text-sm font-medium">{photo.caption}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  WARD MAP                                                     */}
      {/* ============================================================ */}
      {mapData.showMap ? (
        <section className="py-20 md:py-28" style={{ backgroundColor: hexToTint(primary, 0.03) }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Ward Map" title={`${campaign.customization.ward || "Ward"} - ${municipalityLabel(campaign)}`} accentColor={accent} />
            <div className="rounded-2xl overflow-hidden border border-slate-100">
              <WardMap boundaryGeoJSON={mapData.boundaryGeoJSON} eventPoints={mapData.eventPoints} officePoint={mapData.officePoint} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  Q & A                                                        */}
      {/* ============================================================ */}
      <section id="qa" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Q and A" title={campaign.customization.faqs.length > 0 ? "Questions and Answers" : `Ask ${campaign.candidateName.split(" ")[0] || campaign.candidateName} a Question`} accentColor={accent} />

          {campaign.customization.faqs.length > 0 ? (
            <div className="space-y-3 mb-12">
              {campaign.customization.faqs.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-colors">
                  <p className="font-bold text-slate-900">Q: {item.q}</p>
                  <p className="mt-2 text-slate-600">A: {item.a}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={onQuestionSubmit} className="rounded-2xl border border-slate-100 p-6 md:p-8 space-y-4">
              <h3 className="text-xl font-black" style={{ color: primary }}>Have a question?</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input required value={questionForm.name} onChange={(e) => setQuestionForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Name *" />
                <input required type="email" value={questionForm.email} onChange={(e) => setQuestionForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} style={inputRingStyle} placeholder="Email *" />
              </div>
              <textarea required value={questionForm.question} onChange={(e) => setQuestionForm((s) => ({ ...s, question: e.target.value }))} className={`${inputClass} min-h-28`} style={inputRingStyle} placeholder={`Your question for ${campaign.candidateName}`} />
              {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
              <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={questionForm.consent} onChange={(e) => setQuestionForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
              <button disabled={submitting === "question"} className={btnPrimary} style={{ backgroundColor: primary }}>{submitting === "question" ? "Submitting..." : "Submit Question"}</button>
            </form>

            <div className="rounded-2xl border border-slate-100 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <MediaAvatar name={campaign.candidateName} imageUrl={heroPhoto} className="h-12 w-12 rounded-full" bg={primary} textClassName="text-white text-sm font-bold" />
                <div>
                  <p className="font-bold text-slate-900">Ask about {campaign.candidateName.split(" ")[0] || campaign.candidateName}&apos;s platform</p>
                  <p className="text-sm text-slate-400">Responses are based on approved campaign content.</p>
                </div>
              </div>
              <form onSubmit={askAdoni} className="mt-5 flex gap-2">
                <input value={adoniPrompt} onChange={(e) => setAdoniPrompt(e.target.value)} className={`${inputClass} flex-1`} style={inputRingStyle} placeholder="Ask a policy question" />
                <button className="rounded-lg text-white px-6 py-3 font-semibold min-h-[44px] transition-all hover:opacity-90" style={{ backgroundColor: accent }}>Ask</button>
              </form>
              {adoniReply ? (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="mt-5 text-slate-600 bg-slate-50 rounded-xl p-5 text-sm leading-relaxed">{adoniReply}</motion.p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer id="campaign-footer" className="py-16 pb-32 md:pb-16" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              {campaign.logoUrl ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                  <Image src={campaign.logoUrl} alt={campaign.candidateName} fill sizes="40px" className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent }}>
                  <span className="text-white text-sm font-bold">{initialsFromName(campaign.candidateName)}</span>
                </div>
              )}
              <div>
                <p className="font-bold text-white">{campaign.candidateName}</p>
                <p className="text-sm text-slate-400">{campaign.candidateTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#platform" className="hover:text-white transition-colors">Platform</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#events" className="hover:text-white transition-colors">Events</a>
              {campaign.donationsEnabled && <button onClick={() => openInlineForm("donate")} className="hover:text-white transition-colors">Donate</button>}
              <button onClick={() => openInlineForm("volunteer")} className="hover:text-white transition-colors">Volunteer</button>
            </div>
          </div>

          {socialLinks.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  {link.icon}
                </a>
              ))}
            </div>
          ) : null}

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-slate-400">
              Authorized by {campaign.candidateName}, candidate for {officeLabel(campaign)}, {municipalityLabel(campaign)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              {campaign.candidateEmail ? <a href={`mailto:${campaign.candidateEmail}`} className="inline-flex items-center gap-1 hover:text-white transition-colors"><Mail size={14} /> Contact Campaign</a> : null}
              {campaign.candidatePhone ? <a href={`tel:${campaign.candidatePhone}`} className="inline-flex items-center gap-1 hover:text-white transition-colors"><Calendar size={14} /> {campaign.candidatePhone}</a> : null}
              {campaign.websiteUrl ? <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white transition-colors"><ExternalLink size={14} /> Website</a> : null}
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
            <div className="mt-4">
              <button onClick={shareCampaign} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
                <Share2 size={14} /> Share this page
              </button>
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-600">Powered by Poll City</p>
        </div>
      </footer>

      {/* ============================================================ */}
      {/*  Mobile Bottom Bar                                            */}
      {/* ============================================================ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 h-16 grid grid-cols-4">
        <button onClick={() => openInlineForm("support")} className="flex flex-col items-center justify-center text-[11px] font-medium text-slate-600 min-h-[44px] gap-0.5">
          <Heart size={18} style={{ color: primary }} />
          Support
        </button>
        <button onClick={() => openInlineForm("volunteer")} className="flex flex-col items-center justify-center text-[11px] font-medium text-slate-600 min-h-[44px] gap-0.5">
          <Handshake size={18} style={{ color: primary }} />
          Volunteer
        </button>
        {campaign.donationsEnabled && (
          <button onClick={() => openInlineForm("donate")} className="flex flex-col items-center justify-center text-[11px] font-medium text-slate-600 min-h-[44px] gap-0.5">
            <DollarSign size={18} style={{ color: accent }} />
            Donate
          </button>
        )}
        <button onClick={() => { shareCampaign(); }} className="flex flex-col items-center justify-center text-[11px] font-medium text-slate-600 min-h-[44px] gap-0.5">
          <Share2 size={18} style={{ color: primary }} />
          Share
        </button>
      </div>

      {/* ============================================================ */}
      {/*  RSVP Modal                                                   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {currentRsvpEvent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRsvpEventId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={springTransition}
              className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black" style={{ color: primary }}>RSVP &mdash; {currentRsvpEvent.name}</h3>
              <p className="text-sm text-slate-400 mt-1">
                {new Date(currentRsvpEvent.eventDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
                {new Date(currentRsvpEvent.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
              <form onSubmit={onRsvpSubmit} className="mt-5 space-y-4">
                <input required value={rsvpForm.name} onChange={(e) => setRsvpForm((s) => ({ ...s, name: e.target.value }))} className={`${inputClass}`} style={inputRingStyle} placeholder="Name *" />
                <input required type="email" value={rsvpForm.email} onChange={(e) => setRsvpForm((s) => ({ ...s, email: e.target.value }))} className={`${inputClass}`} style={inputRingStyle} placeholder="Email *" />
                <input value={rsvpForm.phone} onChange={(e) => setRsvpForm((s) => ({ ...s, phone: e.target.value }))} className={`${inputClass}`} style={inputRingStyle} placeholder="Phone" />
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm text-slate-500 flex items-start gap-2"><input type="checkbox" checked={rsvpForm.consent} onChange={(e) => setRsvpForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4 rounded" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                <div className="flex gap-3">
                  <button disabled={submitting === "rsvp"} className={btnPrimary} style={{ backgroundColor: accent }}>{submitting === "rsvp" ? "Submitting..." : "Confirm RSVP"}</button>
                  <button type="button" onClick={() => setRsvpEventId(null)} className={btnSecondary}>Close</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
