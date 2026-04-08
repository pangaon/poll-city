"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { motion, AnimatePresence, useInView } from "framer-motion";
import TurnstileWidget from "@/components/security/turnstile-widget";
import {
  Calendar,
  Bus,
  Shield,
  Building2,
  Trees,
  Briefcase,
  HeartPulse,
  Wrench,
  DollarSign,
  Home,
  GraduationCap,
  UserRound,
  Star,
  Clock3,
  Handshake,
  Megaphone,
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

function issueIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes("housing") || key.includes("rent") || key.includes("afford")) return Home;
  if (key.includes("transit") || key.includes("bus") || key.includes("subway") || key.includes("transport")) return Bus;
  if (key.includes("environment") || key.includes("climate") || key.includes("green")) return Trees;
  if (key.includes("safety") || key.includes("crime") || key.includes("police")) return Shield;
  if (key.includes("development") || key.includes("zoning") || key.includes("planning")) return Building2;
  if (key.includes("seniors") || key.includes("elderly") || key.includes("aging")) return UserRound;
  if (key.includes("children") || key.includes("youth") || key.includes("school")) return GraduationCap;
  if (key.includes("business") || key.includes("economy") || key.includes("jobs")) return Briefcase;
  if (key.includes("parks") || key.includes("recreation") || key.includes("community")) return Trees;
  if (key.includes("health")) return HeartPulse;
  if (key.includes("road") || key.includes("infrastructure")) return Wrench;
  if (key.includes("tax") || key.includes("budget") || key.includes("finance")) return DollarSign;
  return Star;
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

function AnimatedNumber({ value, label, icon: Icon }: { value: number; label: string; icon: typeof Users }) {
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
    <motion.div ref={ref} variants={fadeUp} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Icon className="h-6 w-6" style={{ color: GREEN }} />
      <span className="text-3xl font-extrabold tracking-tight" style={{ color: NAVY }}>
        {display.toLocaleString()}
      </span>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </motion.div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-2 text-slate-600 text-base md:text-lg">{subtitle}</p> : null}
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
      <span className={textClassName || "text-white text-3xl font-extrabold tracking-tight"}>{initialsFromName(name)}</span>
    </div>
  );
}

function SocialButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={springTransition}
      className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-colors"
    >
      {icon}
    </motion.a>
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
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={springTransition}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-3 py-1 text-sm font-semibold text-white"
    >
      <CheckCircle2 size={16} className="text-emerald-300" />
      Verified Official
    </motion.span>
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
}: {
  campaign: CandidatePageData;
  scrolled: boolean;
  activeSection: string;
  onAction: (type: ActionFormType) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const textClass = scrolled ? "text-slate-900" : "text-white";
  const borderClass = scrolled ? "border-slate-300" : "border-white/50";

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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-transparent"}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2 min-w-0">
            {campaign.logoUrl ? (
              <div className="relative h-8 w-8 rounded-md overflow-hidden bg-white/20 flex-shrink-0">
                <Image src={campaign.logoUrl} alt={campaign.candidateName} fill sizes="32px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <span className={`font-bold text-base truncate ${textClass}`}>{campaign.candidateName}</span>
          </a>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-sm font-medium transition-colors ${activeSection === item.id ? "" : textClass}`}
                style={activeSection === item.id ? { color: GREEN } : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={springTransition}
              onClick={() => onAction("support")}
              className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: NAVY }}
            >
              Support
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={springTransition}
              onClick={() => onAction("donate")}
              className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Donate
            </motion.button>
            <button
              onClick={() => setMobileOpen((state) => !state)}
              className={`md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border ${borderClass} ${textClass}`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
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
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700 py-1">
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { onAction("support"); setMobileOpen(false); }}
                  className="flex-1 rounded-lg text-white py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: NAVY }}
                >
                  Support
                </button>
                <button
                  onClick={() => { onAction("donate"); setMobileOpen(false); }}
                  className="flex-1 rounded-lg text-white py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: GREEN }}
                >
                  Donate
                </button>
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

function PollWidget({ poll }: { poll: ActivePollData }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5" style={{ color: GREEN }} />
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
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: GREEN }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">{poll.totalResponses} responses</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Election History Table                                             */
/* ------------------------------------------------------------------ */

function ElectionHistoryTable({ records }: { records: ElectionHistoryRecord[] }) {
  if (records.length === 0) return null;
  return (
    <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200" style={{ backgroundColor: `${NAVY}08` }}>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Year</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Jurisdiction</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden sm:table-cell">Party</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-700">Votes</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-700">%</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700">Result</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{new Date(r.electionDate).getFullYear()}</td>
              <td className="px-4 py-3 text-slate-600 capitalize">{r.electionType}</td>
              <td className="px-4 py-3 text-slate-600">{r.jurisdiction}</td>
              <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{r.partyName ?? "-"}</td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium">{r.votesReceived.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium">{r.percentage.toFixed(1)}%</td>
              <td className="px-4 py-3 text-center">
                {r.won ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50">
                    <Trophy size={12} /> Won
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-red-600 bg-red-50">
                    <XCircle size={12} /> Lost
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
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

  const primary = campaign.primaryColor || NAVY;
  const accent = campaign.accentColor || GREEN;
  const heroPhoto = campaign.customization.candidatePhotoUrl || campaign.logoUrl;
  const aboutPhoto = campaign.customization.candidatePhotoUrl2 || heroPhoto;
  const candidateTagline = campaign.tagline || `Fighting for ${municipalityLabel(campaign)} residents in ${electionYear(campaign)}.`;

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
    { key: "donate", label: "Donate", icon: DollarSign },
  ];

  const inputClass = "border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition-all min-h-[44px]";
  const btnPrimary = "rounded-xl text-white px-5 py-3 font-semibold min-h-[44px] transition-all hover:shadow-lg disabled:opacity-60";
  const btnSecondary = "rounded-xl border border-slate-300 px-5 py-3 font-semibold min-h-[44px] transition-all hover:bg-slate-50";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Shimmer animation keyframe via style tag */}
      <style>{`@keyframes shimmer{to{transform:translateX(100%)}}`}</style>

      <CandidateNav campaign={campaign} scrolled={scrolled} activeSection={activeSection} onAction={openInlineForm} />

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section
        id="hero"
        className="relative min-h-[85vh] md:min-h-screen pt-20 pb-16 overflow-hidden"
        style={{
          background: campaign.customization.backgroundImageUrl
            ? `linear-gradient(135deg, rgba(10,35,66,0.82), rgba(10,35,66,0.6)), url(${campaign.customization.backgroundImageUrl}) center/cover`
            : `linear-gradient(135deg, ${NAVY} 0%, #153366 50%, ${GREEN}55 100%)`,
        }}
      >
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="text-white">
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 mb-4">
              <p className="text-sm md:text-base font-semibold uppercase tracking-wide text-white/80">
                Candidate for {officeLabel(campaign)} &middot; {municipalityLabel(campaign)} &middot; {electionYear(campaign)}
              </p>
              {campaign.isVerified ? <VerifiedBadge /> : null}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.02]">
              {campaign.candidateName}
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-xl md:text-2xl text-white/90 max-w-2xl">
              {candidateTagline}
            </motion.p>

            {countdown ? (
              <motion.div variants={fadeUp} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm md:text-base font-semibold">
                <Clock3 size={18} />
                {countdown} until election day
              </motion.div>
            ) : null}

            {/* Social media buttons */}
            {socialLinks.length > 0 ? (
              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <SocialButton key={link.label} href={link.href} label={link.label} icon={link.icon} />
                ))}
              </motion.div>
            ) : null}

            <motion.div variants={fadeUp} className="mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => openInlineForm("support")}
                className="rounded-xl bg-white text-slate-900 font-semibold px-5 py-3.5 min-h-[44px] hover:shadow-xl transition-shadow"
              >
                Support this Candidate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => openInlineForm("volunteer")}
                className="rounded-xl bg-white/15 border border-white/30 text-white font-semibold px-5 py-3.5 min-h-[44px] hover:bg-white/20 transition-all"
              >
                Volunteer
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => openInlineForm("donate")}
                className="rounded-xl text-white font-semibold px-5 py-3.5 min-h-[44px] hover:brightness-110 transition-all"
                style={{ backgroundColor: GREEN }}
              >
                Donate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => openInlineForm("subscribe")}
                className="rounded-xl bg-white/15 border border-white/30 text-white font-semibold px-5 py-3.5 min-h-[44px] hover:bg-white/20 transition-all"
              >
                Subscribe
              </motion.button>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...springTransition, delay: 0.2 }} className="relative">
            <MediaAvatar
              name={campaign.candidateName}
              imageUrl={heroPhoto}
              className="h-[420px] md:h-[580px] w-full rounded-3xl shadow-2xl"
              bg={`linear-gradient(180deg, ${NAVY}dd, ${NAVY})`}
              textClassName="text-white text-6xl font-extrabold tracking-tight"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 rounded-b-3xl"
              style={{ background: `linear-gradient(180deg, transparent, ${NAVY}99)` }}
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Inline form anchor + sticky tabs                             */}
      {/* ============================================================ */}
      <div ref={formAnchorRef} className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 relative z-20">
        {showStickyTabs ? (
          <div className="sticky top-16 z-30 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm p-2 mb-4 hidden md:block">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => openInlineForm("support")} className="rounded-xl py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors">Support</button>
              <button onClick={() => openInlineForm("volunteer")} className="rounded-xl py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors">Volunteer</button>
              <button onClick={() => openInlineForm("donate")} className="rounded-xl py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors">Donate</button>
              <button onClick={() => openInlineForm("subscribe")} className="rounded-xl py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors">Subscribe</button>
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
              className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 md:p-8 mb-12"
            >
              {openForm === "support" ? (
                <form onSubmit={onSupportSubmit} className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Add Your Support</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={supportForm.name} onChange={(e) => setSupportForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                    <input required type="email" value={supportForm.email} onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                    <input value={supportForm.phone} onChange={(e) => setSupportForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} placeholder="Phone" />
                    <input value={supportForm.postalCode} onChange={(e) => setSupportForm((s) => ({ ...s, postalCode: e.target.value }))} className={inputClass} placeholder="Postal Code" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-sm">
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.wantsSign} onChange={(e) => setSupportForm((s) => ({ ...s, wantsSign: e.target.checked }))} className="h-4 w-4" /> I want a lawn sign</label>
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.wantsVolunteer} onChange={(e) => setSupportForm((s) => ({ ...s, wantsVolunteer: e.target.checked }))} className="h-4 w-4" /> I want to volunteer</label>
                    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={supportForm.updates} onChange={(e) => setSupportForm((s) => ({ ...s, updates: e.target.checked }))} className="h-4 w-4" /> Keep me updated</label>
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={supportForm.consent} onChange={(e) => setSupportForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "support"} className={btnPrimary} style={{ backgroundColor: NAVY }}>{submitting === "support" ? "Submitting..." : "Add My Support"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "volunteer" ? (
                <form onSubmit={onVolunteerSubmit} className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Volunteer</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input required value={volunteerForm.name} onChange={(e) => setVolunteerForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                    <input required type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                    <input required value={volunteerForm.phone} onChange={(e) => setVolunteerForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} placeholder="Phone *" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Availability</p>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.weekends} onChange={(e) => setVolunteerForm((s) => ({ ...s, weekends: e.target.checked }))} className="h-4 w-4" /> Weekends</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.evenings} onChange={(e) => setVolunteerForm((s) => ({ ...s, evenings: e.target.checked }))} className="h-4 w-4" /> Evenings</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.flexible} onChange={(e) => setVolunteerForm((s) => ({ ...s, flexible: e.target.checked }))} className="h-4 w-4" /> Flexible</label>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Skills</p>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.canvassing} onChange={(e) => setVolunteerForm((s) => ({ ...s, canvassing: e.target.checked }))} className="h-4 w-4" /> Canvassing</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.driving} onChange={(e) => setVolunteerForm((s) => ({ ...s, driving: e.target.checked }))} className="h-4 w-4" /> Driving</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.dataEntry} onChange={(e) => setVolunteerForm((s) => ({ ...s, dataEntry: e.target.checked }))} className="h-4 w-4" /> Data Entry</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.socialMedia} onChange={(e) => setVolunteerForm((s) => ({ ...s, socialMedia: e.target.checked }))} className="h-4 w-4" /> Social Media</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.events} onChange={(e) => setVolunteerForm((s) => ({ ...s, events: e.target.checked }))} className="h-4 w-4" /> Events</label>
                    </div>
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={volunteerForm.consent} onChange={(e) => setVolunteerForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "volunteer"} className={btnPrimary} style={{ backgroundColor: NAVY }}>{submitting === "volunteer" ? "Submitting..." : "Sign Up to Volunteer"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "donate" ? (
                <form onSubmit={onDonateSubmit} className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Donate</h3>
                  <div className="flex flex-wrap gap-2">
                    {[25, 50, 100, 250].map((amount) => (
                      <motion.button
                        key={amount}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={springTransition}
                        onClick={() => setDonateForm((s) => ({ ...s, amount, customAmount: "" }))}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold border min-h-[44px] transition-colors ${donateForm.amount === amount && !donateForm.customAmount ? "text-white border-transparent" : "border-slate-300 text-slate-700"}`}
                        style={donateForm.amount === amount && !donateForm.customAmount ? { backgroundColor: GREEN } : undefined}
                      >
                        ${amount}
                      </motion.button>
                    ))}
                    <input value={donateForm.customAmount} onChange={(e) => setDonateForm((s) => ({ ...s, customAmount: e.target.value }))} type="number" min={1} max={1200} className={`${inputClass} w-28`} placeholder="Other" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={donateForm.donorName} onChange={(e) => setDonateForm((s) => ({ ...s, donorName: e.target.value }))} className={inputClass} placeholder="Name *" />
                    <input required type="email" value={donateForm.donorEmail} onChange={(e) => setDonateForm((s) => ({ ...s, donorEmail: e.target.value }))} className={inputClass} placeholder="Email *" />
                    <input value={donateForm.donorAddress} onChange={(e) => setDonateForm((s) => ({ ...s, donorAddress: e.target.value }))} className={inputClass} placeholder="Address" />
                    <input value={donateForm.donorPostalCode} onChange={(e) => setDonateForm((s) => ({ ...s, donorPostalCode: e.target.value }))} className={inputClass} placeholder="Postal Code" />
                  </div>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={donateForm.consent} onChange={(e) => setDonateForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "donate"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "donate" ? "Processing..." : "Donate Securely via Stripe"}</button>
                    <button type="button" onClick={() => setOpenForm(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : null}

              {openForm === "subscribe" ? (
                <form onSubmit={onSubscribeSubmit} className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Subscribe for Updates</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input required value={subscribeForm.name} onChange={(e) => setSubscribeForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                    <input required type="email" value={subscribeForm.email} onChange={(e) => setSubscribeForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                    <input value={subscribeForm.phone} onChange={(e) => setSubscribeForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} placeholder="Phone" />
                    <input value={subscribeForm.postalCode} onChange={(e) => setSubscribeForm((s) => ({ ...s, postalCode: e.target.value }))} className={inputClass} placeholder="Postal Code" />
                  </div>
                  <label className="text-sm flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={subscribeForm.textUpdates} onChange={(e) => setSubscribeForm((s) => ({ ...s, textUpdates: e.target.checked }))} className="h-4 w-4" /> Text updates</label>
                  {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                  <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={subscribeForm.consent} onChange={(e) => setSubscribeForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                  <div className="flex gap-3">
                    <button disabled={submitting === "subscribe"} className={btnPrimary} style={{ backgroundColor: NAVY }}>{submitting === "subscribe" ? "Submitting..." : "Subscribe"}</button>
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
      <section className="py-12 bg-slate-50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-4 sm:px-6"
        >
          <div className={`grid gap-5 ${campaign.activePoll ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            <AnimatedNumber value={campaign.supporterCount} label="Supporters" icon={Users} />
            <AnimatedNumber value={campaign.volunteerCount} label="Volunteers" icon={Handshake} />
            <AnimatedNumber value={campaign.doorsKnockedCount} label="Doors Knocked" icon={DoorOpen} />
            {campaign.activePoll ? <PollWidget poll={campaign.activePoll} /> : null}
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  Quote Banner                                                 */}
      {/* ============================================================ */}
      <section className="py-16" style={{ background: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springTransition}
            className="text-2xl md:text-4xl leading-relaxed font-semibold"
          >
            &ldquo;{candidateTagline}&rdquo;
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
            onClick={() => openInlineForm("support")}
            className="mt-8 rounded-xl bg-white text-slate-900 px-6 py-3.5 font-semibold hover:shadow-xl transition-shadow min-h-[44px]"
          >
            Add Your Support Today
          </motion.button>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PLATFORM                                                     */}
      {/* ============================================================ */}
      <section id="platform" className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Platform" title="My Platform" subtitle={`What I will fight for in ${municipalityLabel(campaign)}`} />
          {campaign.customization.issues.length === 0 ? (
            <p className="mb-6 text-slate-600">Campaign is adding platform content soon.</p>
          ) : null}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {platformItems.map((issue) => {
              const Icon = issueIcon(issue.title);
              const expanded = expandedIssue === issue.id;
              return (
                <motion.article
                  key={issue.id}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  transition={springTransition}
                  id={`issue-${issue.id}`}
                  className="rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-shadow p-6 bg-white"
                >
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl" style={{ backgroundColor: `${GREEN}15` }}>
                    <Icon className="h-6 w-6" style={{ color: GREEN }} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{issue.title}</h3>
                  <p className="mt-3 text-slate-600">{issue.summary || "Detailed platform position will be published soon."}</p>
                  <AnimatePresence>
                    {expanded ? (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-sm text-slate-700 whitespace-pre-wrap overflow-hidden"
                      >
                        {issue.details || "More details coming soon."}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedIssue((id) => (id === issue.id ? null : issue.id))}
                      className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
                      style={{ color: GREEN }}
                    >
                      {expanded ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Read More</>}
                    </button>
                    <button onClick={() => shareIssueLink(issue.id)} className="text-sm font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ABOUT                                                        */}
      {/* ============================================================ */}
      <section id="about" className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={springTransition}
          >
            <MediaAvatar
              name={campaign.candidateName}
              imageUrl={aboutPhoto}
              className="h-[380px] md:h-[460px] rounded-3xl shadow-lg"
              bg={`linear-gradient(135deg, ${NAVY}, ${GREEN})`}
              textClassName="text-white text-5xl font-extrabold"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={springTransition}
          >
            <SectionTitle eyebrow="About" title={`About ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} />
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{campaign.candidateBio || "Campaign bio coming soon."}</p>
            {campaign.customization.communityConnections.length > 0 ? (
              <ul className="mt-6 space-y-3 text-slate-700">
                {campaign.customization.communityConnections.map((connection) => (
                  <li key={connection} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: GREEN }} />
                    {connection}
                  </li>
                ))}
              </ul>
            ) : null}
            {campaign.customization.yearsInCommunity ? (
              <p className="mt-4 text-sm font-semibold text-slate-600">{campaign.customization.yearsInCommunity} years in {municipalityLabel(campaign)}</p>
            ) : null}
            {campaign.customization.videoUrl ? (
              <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
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
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Endorsements" title={`Who Supports ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {campaign.customization.endorsements.map((endorsement) => (
                <motion.article key={endorsement.id} variants={fadeUp} whileHover={{ y: -4 }} transition={springTransition} className="rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-shadow p-6 bg-white">
                  <MediaAvatar name={endorsement.name} imageUrl={endorsement.photoUrl} className="h-16 w-16 rounded-full" bg={NAVY} textClassName="text-white text-lg font-bold" />
                  <p className="mt-4 text-slate-700 leading-relaxed italic">&ldquo;{endorsement.quote}&rdquo;</p>
                  <p className="mt-4 font-semibold text-slate-900">&mdash; {endorsement.name}</p>
                  {endorsement.role ? <p className="text-sm text-slate-500">{endorsement.role}</p> : null}
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  ELECTION HISTORY                                             */}
      {/* ============================================================ */}
      {campaign.electionHistory.length > 0 ? (
        <section id="election-history" className="py-16 md:py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Track Record" title="Election History" subtitle={`Past election results for ${campaign.candidateName}`} />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
            >
              <ElectionHistoryTable records={campaign.electionHistory} />
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  PUBLIC ENGAGEMENT FORMS (Tabbed)                             */}
      {/* ============================================================ */}
      <section id="engagement" className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Get Involved" title="How You Can Help" subtitle="Choose how you want to support this campaign" />

          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-8">
            {engagementTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = engagementTab === tab.key;
              return (
                <motion.button
                  key={tab.key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTransition}
                  onClick={() => setEngagementTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-colors ${isActive ? "text-white shadow-md" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}
                  style={isActive ? { backgroundColor: NAVY } : undefined}
                >
                  <Icon size={16} />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* Support tab */}
            {engagementTab === "support" ? (
              <motion.div key="support" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-1" style={{ color: NAVY }}>I support {campaign.candidateName}</h3>
                  <p className="text-slate-500 text-sm mb-4">Add your name to show your support</p>
                  <form onSubmit={onSupportSubmit} className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={supportForm.name} onChange={(e) => setSupportForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                      <input required type="email" value={supportForm.email} onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={supportForm.consent} onChange={(e) => setSupportForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "support"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "support" ? "Submitting..." : "Add My Support"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Volunteer tab */}
            {engagementTab === "volunteer" ? (
              <motion.div key="volunteer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ color: NAVY }}>Volunteer Signup</h3>
                  <form onSubmit={onVolunteerSubmit} className="space-y-3">
                    <div className="grid md:grid-cols-3 gap-3">
                      <input required value={volunteerForm.name} onChange={(e) => setVolunteerForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                      <input required type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                      <input required value={volunteerForm.phone} onChange={(e) => setVolunteerForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} placeholder="Phone *" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.weekends} onChange={(e) => setVolunteerForm((s) => ({ ...s, weekends: e.target.checked }))} className="h-4 w-4" /> Weekends</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.evenings} onChange={(e) => setVolunteerForm((s) => ({ ...s, evenings: e.target.checked }))} className="h-4 w-4" /> Evenings</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.canvassing} onChange={(e) => setVolunteerForm((s) => ({ ...s, canvassing: e.target.checked }))} className="h-4 w-4" /> Canvassing</label>
                      <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={volunteerForm.driving} onChange={(e) => setVolunteerForm((s) => ({ ...s, driving: e.target.checked }))} className="h-4 w-4" /> Driving</label>
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={volunteerForm.consent} onChange={(e) => setVolunteerForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "volunteer"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "volunteer" ? "Submitting..." : "Sign Up"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Lawn sign tab */}
            {engagementTab === "sign" ? (
              <motion.div key="sign" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ color: NAVY }}>Request a Lawn Sign</h3>
                  <form onSubmit={onSignSubmit} className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={signForm.name} onChange={(e) => setSignForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                      <input required value={signForm.address} onChange={(e) => setSignForm((s) => ({ ...s, address: e.target.value }))} className={inputClass} placeholder="Address *" />
                      <input required type="email" value={signForm.email} onChange={(e) => setSignForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                      <input value={signForm.phone} onChange={(e) => setSignForm((s) => ({ ...s, phone: e.target.value }))} className={inputClass} placeholder="Phone" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={signForm.consent} onChange={(e) => setSignForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "sign"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "sign" ? "Submitting..." : "Request My Sign"}</button>
                  </form>
                </div>
              </motion.div>
            ) : null}

            {/* Question tab */}
            {engagementTab === "question" ? (
              <motion.div key="question" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ color: NAVY }}>Ask a Question</h3>
                  <form onSubmit={onQuestionSubmit} className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={questionForm.name} onChange={(e) => setQuestionForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                      <input required type="email" value={questionForm.email} onChange={(e) => setQuestionForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
                    </div>
                    <textarea required value={questionForm.question} onChange={(e) => setQuestionForm((s) => ({ ...s, question: e.target.value }))} className={`${inputClass} min-h-28 w-full`} placeholder={`Your question for ${campaign.candidateName}`} />
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={questionForm.consent} onChange={(e) => setQuestionForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "question"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "question" ? "Submitting..." : "Submit Question"}</button>
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
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            <Calendar size={14} />
                            <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span>&middot;</span>
                            <span>{new Date(event.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                          <h4 className="font-bold text-slate-900">{event.name}</h4>
                          <p className="text-sm text-slate-600 flex items-center gap-1"><MapPin size={14} /> {event.location}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          transition={springTransition}
                          onClick={() => setRsvpEventId(event.id)}
                          className="rounded-xl text-white px-5 py-3 text-sm font-semibold min-h-[44px] flex-shrink-0"
                          style={{ backgroundColor: GREEN }}
                        >
                          RSVP
                        </motion.button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No upcoming events at the moment. Check back soon.</p>
                  </div>
                )}
              </motion.div>
            ) : null}

            {/* Donate tab */}
            {engagementTab === "donate" ? (
              <motion.div key="donate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={springTransition}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-4" style={{ color: NAVY }}>Donate to the Campaign</h3>
                  <form onSubmit={onDonateSubmit} className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[25, 50, 100, 250].map((amount) => (
                        <motion.button
                          key={amount}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={springTransition}
                          onClick={() => setDonateForm((s) => ({ ...s, amount, customAmount: "" }))}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold border min-h-[44px] ${donateForm.amount === amount && !donateForm.customAmount ? "text-white border-transparent" : "border-slate-300 text-slate-700"}`}
                          style={donateForm.amount === amount && !donateForm.customAmount ? { backgroundColor: GREEN } : undefined}
                        >
                          ${amount}
                        </motion.button>
                      ))}
                      <input value={donateForm.customAmount} onChange={(e) => setDonateForm((s) => ({ ...s, customAmount: e.target.value }))} type="number" min={1} max={1200} className={`${inputClass} w-28`} placeholder="Other" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <input required value={donateForm.donorName} onChange={(e) => setDonateForm((s) => ({ ...s, donorName: e.target.value }))} className={inputClass} placeholder="Name *" />
                      <input required type="email" value={donateForm.donorEmail} onChange={(e) => setDonateForm((s) => ({ ...s, donorEmail: e.target.value }))} className={inputClass} placeholder="Email *" />
                    </div>
                    {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                    <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={donateForm.consent} onChange={(e) => setDonateForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />I consent to being contacted by this campaign.</label>
                    <button disabled={submitting === "donate"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "donate" ? "Processing..." : "Donate via Stripe"}</button>
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
        <section id="events" className="py-16 md:py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Events" title="Events and Town Halls" />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {campaign.events.map((event) => (
                <motion.article key={event.id} variants={fadeUp} whileHover={{ y: -4 }} transition={springTransition} className="rounded-2xl border border-slate-200 bg-white shadow-md hover:shadow-xl transition-shadow p-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span>{new Date(event.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">{event.name}</h3>
                  <p className="mt-1 text-sm text-slate-700 flex items-center gap-1"><MapPin size={14} /> {event.location}</p>
                  <p className="text-sm text-slate-600">{[event.city, event.province, event.postalCode].filter(Boolean).join(", ")}</p>
                  {event.description ? <p className="mt-3 text-sm text-slate-600 line-clamp-4">{event.description}</p> : null}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springTransition}
                    onClick={() => setRsvpEventId(event.id)}
                    className="mt-4 rounded-xl text-white px-4 py-2.5 text-sm font-semibold min-h-[44px] hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: GREEN }}
                  >
                    RSVP &mdash; Free
                  </motion.button>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  GALLERY                                                      */}
      {/* ============================================================ */}
      {campaign.customization.gallery.length > 0 ? (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Gallery" title="Campaign Moments" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...campaign.customization.gallery].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 12).map((photo) => (
                <motion.div key={photo.id} whileHover={{ scale: 1.02 }} transition={springTransition} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <Image src={photo.url} alt={photo.caption || "Campaign photo"} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" unoptimized={photo.url.startsWith("http")} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  WARD MAP                                                     */}
      {/* ============================================================ */}
      {mapData.showMap ? (
        <section className="py-16 md:py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Ward Map" title={`${campaign.customization.ward || "Ward"} - ${municipalityLabel(campaign)}`} />
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <WardMap boundaryGeoJSON={mapData.boundaryGeoJSON} eventPoints={mapData.eventPoints} officePoint={mapData.officePoint} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/*  Q & A                                                        */}
      {/* ============================================================ */}
      <section id="qa" className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Q and A" title={campaign.customization.faqs.length > 0 ? "Questions and Answers" : `Ask ${campaign.candidateName.split(" ")[0] || campaign.candidateName} a Question`} />

          {campaign.customization.faqs.length > 0 ? (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-4 mb-8">
              {campaign.customization.faqs.map((item) => (
                <motion.article key={item.id} variants={fadeUp} className="rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                  <p className="font-semibold text-slate-900">Q: {item.q}</p>
                  <p className="mt-2 text-slate-700">A: {item.a}</p>
                </motion.article>
              ))}
            </motion.div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={onQuestionSubmit} className="rounded-2xl border border-slate-200 p-6 space-y-3">
              <h3 className="text-xl font-bold" style={{ color: NAVY }}>Have a question?</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input required value={questionForm.name} onChange={(e) => setQuestionForm((s) => ({ ...s, name: e.target.value }))} className={inputClass} placeholder="Name *" />
                <input required type="email" value={questionForm.email} onChange={(e) => setQuestionForm((s) => ({ ...s, email: e.target.value }))} className={inputClass} placeholder="Email *" />
              </div>
              <textarea required value={questionForm.question} onChange={(e) => setQuestionForm((s) => ({ ...s, question: e.target.value }))} className={`${inputClass} min-h-28 w-full`} placeholder={`Your question for ${campaign.candidateName}`} />
              {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
              <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={questionForm.consent} onChange={(e) => setQuestionForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
              <button disabled={submitting === "question"} className={btnPrimary} style={{ backgroundColor: NAVY }}>{submitting === "question" ? "Submitting..." : "Submit Question"}</button>
            </form>

            <div className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <MediaAvatar name={campaign.candidateName} imageUrl={heroPhoto} className="h-12 w-12 rounded-full" bg={NAVY} textClassName="text-white text-sm font-bold" />
                <div>
                  <p className="font-semibold">Ask about {campaign.candidateName.split(" ")[0] || campaign.candidateName}&apos;s platform</p>
                  <p className="text-sm text-slate-500">Responses are based on approved campaign content.</p>
                </div>
              </div>
              <form onSubmit={askAdoni} className="mt-4 flex gap-2">
                <input value={adoniPrompt} onChange={(e) => setAdoniPrompt(e.target.value)} className={`${inputClass} flex-1`} placeholder="Ask a policy question" />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={springTransition} className="rounded-xl text-white px-5 py-3 font-semibold min-h-[44px]" style={{ backgroundColor: GREEN }}>Ask</motion.button>
              </form>
              {adoniReply ? (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="mt-4 text-slate-700 bg-slate-50 rounded-xl p-4">{adoniReply}</motion.p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer id="campaign-footer" className="py-12 pb-28 md:pb-12" style={{ backgroundColor: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {campaign.logoUrl ? (
                <div className="relative w-10 h-10 rounded-md overflow-hidden">
                  <Image src={campaign.logoUrl} alt={campaign.candidateName} fill sizes="40px" className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: GREEN }}>
                  <span className="text-white text-sm font-bold">{initialsFromName(campaign.candidateName)}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{campaign.candidateName}</p>
                <p className="text-sm text-slate-300">{campaign.candidateTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="#platform" className="hover:text-white transition-colors">Platform</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#events" className="hover:text-white transition-colors">Events</a>
              <button onClick={() => openInlineForm("donate")} className="hover:text-white transition-colors">Donate</button>
              <button onClick={() => openInlineForm("volunteer")} className="hover:text-white transition-colors">Volunteer</button>
            </div>
          </div>

          {socialLinks.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all">
                  {link.icon}
                </a>
              ))}
            </div>
          ) : null}

          <p className="mt-6 text-sm text-slate-300">
            Authorized by {campaign.candidateName}, candidate for {officeLabel(campaign)}, {municipalityLabel(campaign)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            {campaign.candidateEmail ? <a href={`mailto:${campaign.candidateEmail}`} className="inline-flex items-center gap-1 hover:text-white transition-colors"><Mail size={14} /> Contact Campaign</a> : null}
            {campaign.candidatePhone ? <a href={`tel:${campaign.candidatePhone}`} className="inline-flex items-center gap-1 hover:text-white transition-colors"><Calendar size={14} /> {campaign.candidatePhone}</a> : null}
            {campaign.websiteUrl ? <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white transition-colors"><ExternalLink size={14} /> Website</a> : null}
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={shareCampaign} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Share2 size={14} /> Share this page
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-400">Powered by Poll City | poll.city</p>
        </div>
      </footer>

      {/* ============================================================ */}
      {/*  Mobile Bottom Bar                                            */}
      {/* ============================================================ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md h-16 grid grid-cols-4">
        <button onClick={() => openInlineForm("support")} className="flex flex-col items-center justify-center text-xs font-semibold text-slate-700 min-h-[44px]">
          <Heart size={18} style={{ color: NAVY }} />
          Support
        </button>
        <button onClick={() => openInlineForm("volunteer")} className="flex flex-col items-center justify-center text-xs font-semibold text-slate-700 min-h-[44px]">
          <Handshake size={18} style={{ color: NAVY }} />
          Volunteer
        </button>
        <button onClick={() => openInlineForm("donate")} className="flex flex-col items-center justify-center text-xs font-semibold text-slate-700 min-h-[44px]">
          <DollarSign size={18} style={{ color: GREEN }} />
          Donate
        </button>
        <button onClick={() => { shareCampaign(); }} className="flex flex-col items-center justify-center text-xs font-semibold text-slate-700 min-h-[44px]">
          <Share2 size={18} style={{ color: NAVY }} />
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
            className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setRsvpEventId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={springTransition}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold" style={{ color: NAVY }}>RSVP &mdash; {currentRsvpEvent.name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(currentRsvpEvent.eventDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
                {new Date(currentRsvpEvent.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
              <form onSubmit={onRsvpSubmit} className="mt-4 space-y-3">
                <input required value={rsvpForm.name} onChange={(e) => setRsvpForm((s) => ({ ...s, name: e.target.value }))} className={`${inputClass} w-full`} placeholder="Name *" />
                <input required type="email" value={rsvpForm.email} onChange={(e) => setRsvpForm((s) => ({ ...s, email: e.target.value }))} className={`${inputClass} w-full`} placeholder="Email *" />
                <input value={rsvpForm.phone} onChange={(e) => setRsvpForm((s) => ({ ...s, phone: e.target.value }))} className={`${inputClass} w-full`} placeholder="Phone" />
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={rsvpForm.consent} onChange={(e) => setRsvpForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1 h-4 w-4" />By submitting you consent to being contacted by {campaign.candidateName}&apos;s campaign.</label>
                <div className="flex gap-3">
                  <button disabled={submitting === "rsvp"} className={btnPrimary} style={{ backgroundColor: GREEN }}>{submitting === "rsvp" ? "Submitting..." : "Confirm RSVP"}</button>
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
