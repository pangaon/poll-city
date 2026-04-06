"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { toast } from "sonner";
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
} from "lucide-react";

const WardMap = dynamic(() => import("./candidate-ward-map"), { ssr: false });

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
  events: CandidateEvent[];
  customization: CandidatePageCustomization;
};

interface CandidatePageClientProps {
  campaign: CandidatePageData;
}

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "PC";
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

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
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
    { id: "events", label: "Events" },
    { id: "get-involved", label: "Get Involved" },
  ];

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href={`#hero`} className="flex items-center gap-2 min-w-0">
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
                className={`text-sm font-medium transition-colors ${activeSection === item.id ? "text-[var(--primary)]" : textClass}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction("support")}
              className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-95 transition-all"
            >
              Support
            </button>
            <button
              onClick={() => onAction("donate")}
              className={`hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold border ${borderClass} ${textClass} hover:bg-black/5 transition-all`}
            >
              Donate
            </button>
            <button
              onClick={() => setMobileOpen((state) => !state)}
              className={`md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border ${borderClass} ${textClass}`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed top-16 left-0 right-0 z-40 bg-white shadow-lg border-b md:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-700">
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { onAction("support"); setMobileOpen(false); }} className="flex-1 rounded-lg bg-[var(--primary)] text-white py-2 text-sm font-semibold">Support</button>
              <button onClick={() => { onAction("donate"); setMobileOpen(false); }} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700">Donate</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

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

  const primary = campaign.primaryColor || "#1a4782";
  const accent = campaign.accentColor || "#d71920";
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

    return {
      showMap,
      boundaryGeoJSON: campaign.customization.boundaryGeoJSON,
      eventPoints,
      officePoint,
    };
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
    const sectionIds = ["hero", "platform", "about", "events", "get-involved", "qa"];
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

  async function submitJson(path: string, payload: Record<string, unknown>, actionKey: string) {
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

      const body = await response.json().catch(() => null) as { error?: string; checkoutUrl?: string } | null;
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
  }

  async function onSupportSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supportForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const result = await submitJson(`/api/public/candidates/${campaign.slug}/support`, {
      name: supportForm.name,
      email: supportForm.email,
      householdCount: supportForm.postalCode || undefined,
    }, "support");

    if (!result) return;
    toast.success("Support recorded. Thank you.");
    setSupportForm({ name: "", email: "", phone: "", postalCode: "", wantsSign: false, wantsVolunteer: false, updates: true, consent: false });
    setOpenForm(null);
  }

  async function onVolunteerSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!volunteerForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const availability = [
      volunteerForm.weekends ? "Weekends" : null,
      volunteerForm.evenings ? "Evenings" : null,
      volunteerForm.flexible ? "Flexible" : null,
    ].filter(Boolean).join(", ");

    const skills = [
      volunteerForm.canvassing ? "Canvassing" : null,
      volunteerForm.driving ? "Driving" : null,
      volunteerForm.dataEntry ? "Data Entry" : null,
      volunteerForm.socialMedia ? "Social Media" : null,
      volunteerForm.events ? "Events" : null,
    ].filter(Boolean).join(", ");

    const result = await submitJson(`/api/public/candidates/${campaign.slug}/volunteer`, {
      name: volunteerForm.name,
      email: volunteerForm.email,
      phone: volunteerForm.phone,
      message: `Availability: ${availability || "Not provided"}. Skills: ${skills || "Not provided"}.`,
    }, "volunteer");

    if (!result) return;
    toast.success("Volunteer request received.");
    setVolunteerForm({ name: "", email: "", phone: "", weekends: false, evenings: false, flexible: true, canvassing: false, driving: false, dataEntry: false, socialMedia: false, events: false, consent: false });
    setOpenForm(null);
  }

  async function onDonateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!donateForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const normalizedAmount = donateForm.customAmount ? Number(donateForm.customAmount) : donateForm.amount;
    const result = await submitJson(`/api/public/candidates/${campaign.slug}/donate`, {
      amount: normalizedAmount,
      donorName: donateForm.donorName,
      donorEmail: donateForm.donorEmail,
      donorAddress: donateForm.donorAddress,
      donorPostalCode: donateForm.donorPostalCode,
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
    if (!subscribeForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const parts = subscribeForm.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    const result = await submitJson("/api/newsletters/subscribe", {
      email: subscribeForm.email,
      firstName,
      lastName,
      postalCode: subscribeForm.postalCode || undefined,
      campaignId: campaign.id,
    }, "subscribe");

    if (!result) return;
    toast.success("Subscribed successfully.");
    setSubscribeForm({ name: "", email: "", phone: "", textUpdates: false, postalCode: "", consent: false });
    setOpenForm(null);
  }

  async function onSignSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!signForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const result = await submitJson(`/api/public/candidates/${campaign.slug}/sign-request`, {
      name: signForm.name,
      email: signForm.email,
      address: signForm.address,
    }, "sign");

    if (!result) return;
    toast.success("Sign request submitted.");
    setSignForm({ name: "", email: "", address: "", phone: "", postalCode: "", cornerLot: false, canDistribute: false, consent: false });
  }

  async function onQuestionSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!questionForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const result = await submitJson(`/api/public/candidates/${campaign.slug}/question`, {
      name: questionForm.name,
      email: questionForm.email,
      question: questionForm.question,
    }, "question");

    if (!result) return;
    toast.success("Question submitted for review.");
    setQuestionForm({ name: "", email: "", question: "", consent: false });
  }

  async function onRsvpSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentRsvpEvent) return;
    if (!rsvpForm.consent) {
      toast.error("Consent is required.");
      return;
    }

    const result = await submitJson(`/api/public/events/${currentRsvpEvent.id}/rsvp`, {
      name: rsvpForm.name,
      email: rsvpForm.email,
      phone: rsvpForm.phone,
      status: "going",
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

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ ["--primary" as string]: primary, ["--accent" as string]: accent } as React.CSSProperties}>
      <CandidateNav campaign={campaign} scrolled={scrolled} activeSection={activeSection} onAction={openInlineForm} />

      <section
        id="hero"
        className="relative min-h-[80vh] md:min-h-screen pt-20 pb-12"
        style={{
          background: campaign.customization.backgroundImageUrl
            ? `linear-gradient(120deg, rgba(17,24,39,0.72), rgba(17,24,39,0.55)), url(${campaign.customization.backgroundImageUrl}) center/cover`
            : `linear-gradient(120deg, ${primary} 0%, ${accent} 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <p className="text-sm md:text-base font-semibold uppercase tracking-wide text-white/85">
              Candidate for {officeLabel(campaign)} - {municipalityLabel(campaign)} - {electionYear(campaign)}
            </p>
            <h1 className="mt-3 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.02]">{campaign.candidateName}</h1>
            <p className="mt-5 text-xl md:text-2xl text-white/90 max-w-2xl">{candidateTagline}</p>

            {countdown ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm md:text-base font-semibold">
                <Clock3 size={18} />
                {countdown} until election day
              </div>
            ) : null}

            <div className="mt-8 grid sm:grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-3">
              <button onClick={() => openInlineForm("support")} className="rounded-xl bg-white text-slate-900 font-semibold px-4 py-3 hover:shadow-lg transition-all">Add Your Support</button>
              <button onClick={() => openInlineForm("volunteer")} className="rounded-xl bg-white/15 border border-white/40 text-white font-semibold px-4 py-3 hover:bg-white/20 transition-all">Volunteer</button>
              <button onClick={() => openInlineForm("donate")} className="rounded-xl bg-[var(--accent)] text-white font-semibold px-4 py-3 hover:brightness-105 transition-all">Donate</button>
              <button onClick={() => openInlineForm("subscribe")} className="rounded-xl bg-white/15 border border-white/40 text-white font-semibold px-4 py-3 hover:bg-white/20 transition-all">Subscribe</button>
            </div>
          </div>

          <div className="relative">
            <MediaAvatar
              name={campaign.candidateName}
              imageUrl={heroPhoto}
              className="h-[460px] md:h-[640px] w-full rounded-2xl"
              bg="linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-2xl" style={{ background: `linear-gradient(180deg, transparent, ${primary}aa)` }} />
          </div>
        </div>
      </section>

      <div ref={formAnchorRef} className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 relative z-20">
        {showStickyTabs ? (
          <div className="sticky top-16 z-30 rounded-xl border border-slate-200 bg-white shadow-sm p-2 mb-4 hidden md:block">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => openInlineForm("support")} className="rounded-lg py-2 font-semibold text-sm text-slate-700 hover:bg-slate-100">Support</button>
              <button onClick={() => openInlineForm("volunteer")} className="rounded-lg py-2 font-semibold text-sm text-slate-700 hover:bg-slate-100">Volunteer</button>
              <button onClick={() => openInlineForm("donate")} className="rounded-lg py-2 font-semibold text-sm text-slate-700 hover:bg-slate-100">Donate</button>
              <button onClick={() => openInlineForm("subscribe")} className="rounded-lg py-2 font-semibold text-sm text-slate-700 hover:bg-slate-100">Subscribe</button>
            </div>
          </div>
        ) : null}

        {openForm ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-5 md:p-6 mb-12 animate-in fade-in slide-in-from-top-2 duration-200">
            {openForm === "support" ? (
              <form onSubmit={onSupportSubmit} className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight">Add Your Support</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input required value={supportForm.name} onChange={(e) => setSupportForm((s) => ({ ...s, name: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                  <input required type="email" value={supportForm.email} onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
                  <input value={supportForm.phone} onChange={(e) => setSupportForm((s) => ({ ...s, phone: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Phone" />
                  <input value={supportForm.postalCode} onChange={(e) => setSupportForm((s) => ({ ...s, postalCode: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Postal Code" />
                </div>
                <div className="grid sm:grid-cols-3 gap-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={supportForm.wantsSign} onChange={(e) => setSupportForm((s) => ({ ...s, wantsSign: e.target.checked }))} /> I want a lawn sign</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={supportForm.wantsVolunteer} onChange={(e) => setSupportForm((s) => ({ ...s, wantsVolunteer: e.target.checked }))} /> I want to volunteer</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={supportForm.updates} onChange={(e) => setSupportForm((s) => ({ ...s, updates: e.target.checked }))} /> Keep me updated</label>
                </div>
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={supportForm.consent} onChange={(e) => setSupportForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
                <div className="flex gap-2">
                  <button disabled={submitting === "support"} className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "support" ? "Submitting..." : "Add My Support"}</button>
                  <button type="button" onClick={() => setOpenForm(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
                </div>
              </form>
            ) : null}

            {openForm === "volunteer" ? (
              <form onSubmit={onVolunteerSubmit} className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight">Volunteer</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <input required value={volunteerForm.name} onChange={(e) => setVolunteerForm((s) => ({ ...s, name: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                  <input required type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm((s) => ({ ...s, email: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
                  <input required value={volunteerForm.phone} onChange={(e) => setVolunteerForm((s) => ({ ...s, phone: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Phone*" />
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-700">Availability</p>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.weekends} onChange={(e) => setVolunteerForm((s) => ({ ...s, weekends: e.target.checked }))} /> Weekends</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.evenings} onChange={(e) => setVolunteerForm((s) => ({ ...s, evenings: e.target.checked }))} /> Evenings</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.flexible} onChange={(e) => setVolunteerForm((s) => ({ ...s, flexible: e.target.checked }))} /> Flexible</label>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-700">Skills</p>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.canvassing} onChange={(e) => setVolunteerForm((s) => ({ ...s, canvassing: e.target.checked }))} /> Canvassing</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.driving} onChange={(e) => setVolunteerForm((s) => ({ ...s, driving: e.target.checked }))} /> Driving</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.dataEntry} onChange={(e) => setVolunteerForm((s) => ({ ...s, dataEntry: e.target.checked }))} /> Data Entry</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.socialMedia} onChange={(e) => setVolunteerForm((s) => ({ ...s, socialMedia: e.target.checked }))} /> Social Media</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={volunteerForm.events} onChange={(e) => setVolunteerForm((s) => ({ ...s, events: e.target.checked }))} /> Events</label>
                  </div>
                </div>
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={volunteerForm.consent} onChange={(e) => setVolunteerForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
                <div className="flex gap-2">
                  <button disabled={submitting === "volunteer"} className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "volunteer" ? "Submitting..." : "Sign Up to Volunteer"}</button>
                  <button type="button" onClick={() => setOpenForm(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
                </div>
              </form>
            ) : null}

            {openForm === "donate" ? (
              <form onSubmit={onDonateSubmit} className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight">Donate</h3>
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 100, 250].map((amount) => (
                    <button key={amount} type="button" onClick={() => setDonateForm((s) => ({ ...s, amount, customAmount: "" }))} className={`rounded-lg px-3 py-2 text-sm font-semibold border ${donateForm.amount === amount && !donateForm.customAmount ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-slate-300"}`}>${amount}</button>
                  ))}
                  <input value={donateForm.customAmount} onChange={(e) => setDonateForm((s) => ({ ...s, customAmount: e.target.value }))} type="number" min={1} max={1200} className="border border-slate-300 rounded-lg px-3 py-2 w-28" placeholder="Other" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <input required value={donateForm.donorName} onChange={(e) => setDonateForm((s) => ({ ...s, donorName: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                  <input required type="email" value={donateForm.donorEmail} onChange={(e) => setDonateForm((s) => ({ ...s, donorEmail: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
                  <input value={donateForm.donorAddress} onChange={(e) => setDonateForm((s) => ({ ...s, donorAddress: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Address" />
                  <input value={donateForm.donorPostalCode} onChange={(e) => setDonateForm((s) => ({ ...s, donorPostalCode: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Postal Code" />
                </div>
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={donateForm.consent} onChange={(e) => setDonateForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
                <div className="flex gap-2">
                  <button disabled={submitting === "donate"} className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "donate" ? "Processing..." : "Donate Securely via Stripe"}</button>
                  <button type="button" onClick={() => setOpenForm(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
                </div>
              </form>
            ) : null}

            {openForm === "subscribe" ? (
              <form onSubmit={onSubscribeSubmit} className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight">Subscribe for Updates</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <input required value={subscribeForm.name} onChange={(e) => setSubscribeForm((s) => ({ ...s, name: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                  <input required type="email" value={subscribeForm.email} onChange={(e) => setSubscribeForm((s) => ({ ...s, email: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
                  <input value={subscribeForm.phone} onChange={(e) => setSubscribeForm((s) => ({ ...s, phone: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Phone" />
                  <input value={subscribeForm.postalCode} onChange={(e) => setSubscribeForm((s) => ({ ...s, postalCode: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Postal Code" />
                </div>
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={subscribeForm.textUpdates} onChange={(e) => setSubscribeForm((s) => ({ ...s, textUpdates: e.target.checked }))} /> Text updates</label>
                {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
                <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={subscribeForm.consent} onChange={(e) => setSubscribeForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
                <div className="flex gap-2">
                  <button disabled={submitting === "subscribe"} className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "subscribe" ? "Submitting..." : "Subscribe"}</button>
                  <button type="button" onClick={() => setOpenForm(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="py-16" style={{ background: primary }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-white">
          <p className="text-2xl md:text-4xl leading-relaxed font-semibold">
            "{candidateTagline}"
          </p>
          <button onClick={() => openInlineForm("support")} className="mt-8 rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:shadow-lg transition-all">Add Your Support Today</button>
        </div>
      </section>

      <section id="platform" className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Platform" title="My Platform" subtitle={`What I will fight for in ${municipalityLabel(campaign)}`} />
          {campaign.customization.issues.length === 0 ? (
            <p className="mb-6 text-slate-600">Campaign is adding platform content soon.</p>
          ) : null}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {platformItems.map((issue) => {
              const Icon = issueIcon(issue.title);
              const expanded = expandedIssue === issue.id;
              return (
                <article key={issue.id} id={`issue-${issue.id}`} className="rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all p-5 bg-white">
                  <Icon className="h-7 w-7 text-[var(--primary)]" />
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{issue.title}</h3>
                  <p className="mt-3 text-slate-600">{issue.summary || "Detailed platform position will be published soon."}</p>
                  {expanded ? <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{issue.details || "More details coming soon."}</p> : null}
                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={() => setExpandedIssue((id) => (id === issue.id ? null : issue.id))} className="text-sm font-semibold text-[var(--primary)] hover:underline">{expanded ? "Show Less" : "Read More"}</button>
                    <button onClick={() => shareIssueLink(issue.id)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"><Share2 size={14} /> Share</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 items-start">
          <MediaAvatar
            name={campaign.candidateName}
            imageUrl={aboutPhoto}
            className="h-[380px] md:h-[460px] rounded-2xl"
            bg={`linear-gradient(135deg, ${primary}, ${accent})`}
            textClassName="text-white text-5xl font-extrabold"
          />
          <div>
            <SectionTitle eyebrow="About" title={`About ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} />
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{campaign.candidateBio || "Campaign bio coming soon."}</p>
            {campaign.customization.communityConnections.length > 0 ? (
              <ul className="mt-4 space-y-2 text-slate-700">
                {campaign.customization.communityConnections.map((connection) => (
                  <li key={connection} className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]" />{connection}</li>
                ))}
              </ul>
            ) : null}
            {campaign.customization.yearsInCommunity ? (
              <p className="mt-4 text-sm font-semibold text-slate-600">{campaign.customization.yearsInCommunity} years in {municipalityLabel(campaign)}</p>
            ) : null}
            {campaign.customization.videoUrl ? (
              <div className="mt-5 rounded-xl overflow-hidden border border-slate-200">
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
          </div>
        </div>
      </section>

      {campaign.events.length > 0 ? (
        <section id="events" className="py-16 md:py-20 bg-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Events" title="Events and Town Halls" />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {campaign.events.map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-white shadow-md hover:shadow-lg transition-all p-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span>{new Date(event.eventDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">{event.name}</h3>
                  <p className="mt-1 text-sm text-slate-700">{event.location}</p>
                  <p className="text-sm text-slate-600">{[event.city, event.province, event.postalCode].filter(Boolean).join(", ")}</p>
                  {event.description ? <p className="mt-3 text-sm text-slate-600 line-clamp-4">{event.description}</p> : null}
                  <button onClick={() => setRsvpEventId(event.id)} className="mt-4 rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition-all">RSVP - Free</button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {campaign.customization.gallery.length > 0 ? (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Gallery" title="Campaign Moments" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...campaign.customization.gallery].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 12).map((photo) => (
                <div key={photo.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <Image src={photo.url} alt={photo.caption || "Campaign photo"} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" unoptimized={photo.url.startsWith("http")} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {campaign.customization.endorsements.length > 0 ? (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Endorsements" title={`Who Supports ${campaign.candidateName.split(" ")[0] || campaign.candidateName}`} />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {campaign.customization.endorsements.map((endorsement) => (
                <article key={endorsement.id} className="rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all p-5 bg-white">
                  <MediaAvatar name={endorsement.name} imageUrl={endorsement.photoUrl} className="h-16 w-16 rounded-full" bg={primary} textClassName="text-white text-lg font-bold" />
                  <p className="mt-4 text-slate-700 leading-relaxed">"{endorsement.quote}"</p>
                  <p className="mt-4 font-semibold text-slate-900">- {endorsement.name}</p>
                  {endorsement.role ? <p className="text-sm text-slate-600">{endorsement.role}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-16 md:py-20" style={{ background: primary }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-white p-6 md:p-8 shadow-lg">
            <SectionTitle eyebrow="Lawn Sign" title="Show Your Support - Request a Lawn Sign" />
            <form onSubmit={onSignSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <input required value={signForm.name} onChange={(e) => setSignForm((s) => ({ ...s, name: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                <input required value={signForm.address} onChange={(e) => setSignForm((s) => ({ ...s, address: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Address*" />
                <input value={signForm.phone} onChange={(e) => setSignForm((s) => ({ ...s, phone: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Phone*" />
                <input value={signForm.postalCode} onChange={(e) => setSignForm((s) => ({ ...s, postalCode: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Postal Code" />
                <input required type="email" value={signForm.email} onChange={(e) => setSignForm((s) => ({ ...s, email: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 md:col-span-2" placeholder="Email*" />
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={signForm.cornerLot} onChange={(e) => setSignForm((s) => ({ ...s, cornerLot: e.target.checked }))} /> I have a corner lot</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={signForm.canDistribute} onChange={(e) => setSignForm((s) => ({ ...s, canDistribute: e.target.checked }))} /> I can help distribute signs</label>
              </div>
              {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
              <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={signForm.consent} onChange={(e) => setSignForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
              <button disabled={submitting === "sign"} className="rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 font-semibold disabled:opacity-60">{submitting === "sign" ? "Submitting..." : "Request My Sign"}</button>
            </form>
          </div>
        </div>
      </section>

      <section id="get-involved" className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Get Involved" title="Help Build Momentum" />
          <div className="grid md:grid-cols-3 gap-5">
            <article className="rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all p-5">
              <Handshake className="h-7 w-7 text-[var(--primary)]" />
              <h3 className="mt-3 text-xl font-bold">Volunteer</h3>
              <p className="mt-2 text-slate-600">Join our team to canvass, call voters, and power campaign events.</p>
              <button onClick={() => openInlineForm("volunteer")} className="mt-4 rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold">Join Us</button>
            </article>
            <article className="rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all p-5">
              <HeartPulse className="h-7 w-7 text-[var(--accent)]" />
              <h3 className="mt-3 text-xl font-bold">Donate</h3>
              <p className="mt-2 text-slate-600">Fuel outreach and voter contact with a contribution of any size.</p>
              <button onClick={() => openInlineForm("donate")} className="mt-4 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-semibold">Donate</button>
            </article>
            <article className="rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all p-5">
              <Megaphone className="h-7 w-7 text-[var(--primary)]" />
              <h3 className="mt-3 text-xl font-bold">Share</h3>
              <p className="mt-2 text-slate-600">Tell your neighbors and friends about this campaign.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={shareCampaign} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold inline-flex items-center gap-2"><Share2 size={14} /> Share Link</button>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "https://poll.city"}/candidates/${campaign.slug}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Facebook</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {mapData.showMap ? (
        <section className="py-16 md:py-20 bg-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionTitle eyebrow="Ward Map" title={`${campaign.customization.ward || "Ward"} - ${municipalityLabel(campaign)}`} />
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md">
              <WardMap boundaryGeoJSON={mapData.boundaryGeoJSON} eventPoints={mapData.eventPoints} officePoint={mapData.officePoint} />
            </div>
          </div>
        </section>
      ) : null}

      <section id="qa" className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Q and A" title={campaign.customization.faqs.length > 0 ? "Questions and Answers" : `Ask ${campaign.candidateName.split(" ")[0] || campaign.candidateName} a Question`} />

          {campaign.customization.faqs.length > 0 ? (
            <div className="space-y-4 mb-8">
              {campaign.customization.faqs.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-5">
                  <p className="font-semibold text-slate-900">Q: {item.q}</p>
                  <p className="mt-2 text-slate-700">A: {item.a}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={onQuestionSubmit} className="rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-xl font-bold">Have a question?</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input required value={questionForm.name} onChange={(e) => setQuestionForm((s) => ({ ...s, name: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
                <input required type="email" value={questionForm.email} onChange={(e) => setQuestionForm((s) => ({ ...s, email: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
              </div>
              <textarea required value={questionForm.question} onChange={(e) => setQuestionForm((s) => ({ ...s, question: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 min-h-28 w-full" placeholder={`Your question for ${campaign.candidateName}`} />
              {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
              <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={questionForm.consent} onChange={(e) => setQuestionForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
              <button disabled={submitting === "question"} className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "question" ? "Submitting..." : "Submit Question"}</button>
            </form>

            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <MediaAvatar name={campaign.candidateName} imageUrl={heroPhoto} className="h-12 w-12 rounded-full" bg={primary} textClassName="text-white text-sm font-bold" />
                <div>
                  <p className="font-semibold">Ask me about {campaign.candidateName.split(" ")[0] || campaign.candidateName}'s platform</p>
                  <p className="text-sm text-slate-600">Responses are based on approved campaign platform content.</p>
                </div>
              </div>
              <form onSubmit={askAdoni} className="mt-4 flex gap-2">
                <input value={adoniPrompt} onChange={(e) => setAdoniPrompt(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" placeholder="Ask a policy question" />
                <button className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold">Ask</button>
              </form>
              {adoniReply ? <p className="mt-4 text-slate-700 bg-slate-50 rounded-lg p-3">{adoniReply}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <footer id="campaign-footer" className="bg-slate-950 text-slate-100 py-12 pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {campaign.logoUrl ? (
                <div className="relative w-10 h-10 rounded-md overflow-hidden">
                  <Image src={campaign.logoUrl} alt={campaign.candidateName} fill sizes="40px" className="object-cover" unoptimized />
                </div>
              ) : null}
              <div>
                <p className="font-semibold text-white">{campaign.candidateName}</p>
                <p className="text-sm text-slate-300">{campaign.candidateTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <a href="#platform" className="hover:text-white">Platform</a>
              <a href="#about" className="hover:text-white">About</a>
              <a href="#events" className="hover:text-white">Events</a>
              <button onClick={() => openInlineForm("donate")} className="hover:text-white">Donate</button>
              <button onClick={() => openInlineForm("volunteer")} className="hover:text-white">Volunteer</button>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-300">
            Authorized by {campaign.candidateName}, candidate for {officeLabel(campaign)}, {municipalityLabel(campaign)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            {campaign.candidateEmail ? <a href={`mailto:${campaign.candidateEmail}`} className="inline-flex items-center gap-1 hover:text-white"><Mail size={14} /> Contact Campaign</a> : null}
            {campaign.candidatePhone ? <a href={`tel:${campaign.candidatePhone}`} className="inline-flex items-center gap-1 hover:text-white"><Calendar size={14} /> {campaign.candidatePhone}</a> : null}
            {campaign.websiteUrl ? <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white"><ExternalLink size={14} /> Website</a> : null}
            <a href="/privacy-policy" className="hover:text-white">Privacy Policy</a>
          </div>
          <p className="mt-6 text-xs text-slate-400">Powered by Poll City | poll.city</p>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white h-16 grid grid-cols-4">
        <button onClick={() => openInlineForm("support")} className="text-xs font-semibold text-slate-700">Support</button>
        <button onClick={() => openInlineForm("volunteer")} className="text-xs font-semibold text-slate-700">Volunteer</button>
        <button onClick={() => openInlineForm("donate")} className="text-xs font-semibold text-slate-700">Donate</button>
        <button onClick={() => openInlineForm("subscribe")} className="text-xs font-semibold text-slate-700">Subscribe</button>
      </div>

      {currentRsvpEvent ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-5 shadow-xl">
            <h3 className="text-xl font-bold">RSVP - {currentRsvpEvent.name}</h3>
            <form onSubmit={onRsvpSubmit} className="mt-4 space-y-3">
              <input required value={rsvpForm.name} onChange={(e) => setRsvpForm((s) => ({ ...s, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Name*" />
              <input required type="email" value={rsvpForm.email} onChange={(e) => setRsvpForm((s) => ({ ...s, email: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Email*" />
              <input value={rsvpForm.phone} onChange={(e) => setRsvpForm((s) => ({ ...s, phone: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Phone" />
              {captchaEnabled ? <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} resetSignal={captchaResetSignal} /> : null}
              <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={rsvpForm.consent} onChange={(e) => setRsvpForm((s) => ({ ...s, consent: e.target.checked }))} className="mt-1" />By submitting you consent to being contacted by {campaign.candidateName}'s campaign.</label>
              <div className="flex gap-2">
                <button disabled={submitting === "rsvp"} className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting === "rsvp" ? "Submitting..." : "Confirm RSVP"}</button>
                <button type="button" onClick={() => setRsvpEventId(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Close</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
