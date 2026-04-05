"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Menu, X, ArrowRight, Shield, Lock, MapPin, Users, BarChart3, Bell,
  Printer, Star, Zap, Globe, ChevronDown, ChevronUp, Check, Phone,
  Mail, Twitter, Linkedin, Facebook, Heart, Target, MessageSquare,
  ClipboardList, Megaphone, Database, Monitor, Smartphone, CheckCircle,
  AlertCircle, Award, TrendingUp, FileText, Building2,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Variant = "primary" | "outline" | "ghost" | "white" | "red" | "dark";
type Size = "sm" | "md" | "lg";

/* ─── Button Component ───────────────────────────────────────────────────── */
function Btn({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  onClick,
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer";
  const sizes: Record<Size, string> = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-[#1E3A8A] text-white hover:bg-blue-900 shadow-sm",
    outline: "border-2 border-[#1E3A8A] text-[#1E3A8A] bg-white hover:bg-blue-50",
    ghost: "text-[#1E3A8A] hover:bg-blue-50",
    white: "bg-white text-[#1E3A8A] hover:bg-blue-50 shadow-sm",
    red: "bg-[#DC2626] text-white hover:bg-red-700 shadow-sm",
    dark: "border-2 border-white/40 text-white hover:bg-white/10 bg-transparent",
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (onClick) {
    return (
      <button onClick={onClick} className={cls}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href ?? "#"} className={cls}>
      {children}
    </Link>
  );
}

/* ─── Nav links ──────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#candidates", label: "For Candidates" },
  { href: "/social", label: "For Voters", external: true },
  { href: "/officials", label: "Officials Directory", external: true },
  { href: "#blog", label: "Blog" },
  { href: "#about", label: "About" },
];

/* ─── Pricing data ───────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: "Free Trial",
    tagline: "14 Days Free",
    price: 0,
    annualPrice: 0,
    highlight: false,
    badge: null,
    borderColour: "border-gray-200",
    ctaLabel: "Start Free Trial",
    ctaVariant: "outline" as Variant,
    features: [
      "Full platform access",
      "Up to 100 contacts",
      "Candidate public page",
      "Mobile canvassing app",
      "Email support",
    ],
  },
  {
    name: "Starter",
    tagline: "For small campaigns",
    price: 199,
    annualPrice: 159,
    highlight: false,
    badge: null,
    borderColour: "border-blue-300",
    ctaLabel: "Start Free Trial",
    ctaVariant: "outline" as Variant,
    features: [
      "Everything in Free Trial",
      "Up to 2,500 contacts",
      "Full CRM and canvassing",
      "GOTV engine",
      "Volunteer management",
      "Sign tracking",
      "Task management",
      "Donation tracking",
      "Poll City Print access",
      "Poll City Social profile",
    ],
  },
  {
    name: "Pro",
    tagline: "For serious campaigns",
    price: 399,
    annualPrice: 319,
    highlight: true,
    badge: "Most Popular",
    borderColour: "border-[#1E3A8A]",
    ctaLabel: "Start Free Trial",
    ctaVariant: "white" as Variant,
    features: [
      "Everything in Starter",
      "Unlimited contacts",
      "AI campaign assistant",
      "Advanced analytics and heat maps",
      "Route optimisation",
      "Custom campaign fields",
      "Import and export voter files",
      "Push notifications to voters",
      "Custom domain for candidate page",
      "Multiple team members",
      "Priority support",
    ],
  },
  {
    name: "Command",
    tagline: "For major campaigns",
    price: 799,
    annualPrice: 639,
    highlight: false,
    badge: null,
    borderColour: "border-gray-800",
    ctaLabel: "Contact Sales",
    ctaVariant: "primary" as Variant,
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Dedicated database — data fully isolated",
      "API access",
      "Dedicated onboarding call",
      "Phone support",
      "White glove data import",
      "SLA guarantee",
    ],
  },
  {
    name: "Elected Official",
    tagline: "For current officeholders",
    price: 299,
    annualPrice: 239,
    highlight: false,
    badge: null,
    borderColour: "border-yellow-400",
    ctaLabel: "Claim Your Profile",
    ctaVariant: "outline" as Variant,
    features: [
      "Verified official badge on Poll City Social",
      "Constituent engagement dashboard",
      "Public Q&A management",
      "Sentiment and polling dashboard",
      "Town hall and event tools",
      "Re-election campaign tools",
      "Dedicated database",
    ],
  },
];

/* ─── FAQ data ───────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Your 14-day free trial starts immediately with no credit card required. You only pay when you choose a plan.",
  },
  {
    q: "Can I use my own domain like votegeorge.ca?",
    a: "Yes. Pro and above plans support custom domains that point to your Poll City candidate page. Setup takes under 5 minutes.",
  },
  {
    q: "Is my data secure and private?",
    a: "Yes. Poll City is PIPEDA compliant, uses AES-256 encryption at rest and TLS 1.3 in transit, and all data is stored on Canadian servers. Command and above plans include a dedicated database where your data is physically isolated from other campaigns.",
  },
  {
    q: "Does it work for school board trustee candidates?",
    a: "Yes. Poll City works for any municipal election including school board trustees, regional councillors, reeves, and mayors across Ontario and BC.",
  },
  {
    q: "How does Poll City Social work for voter engagement?",
    a: "Voters enter their postal code and discover every candidate and official representing them at all levels of government. They can follow you, answer your polls, request signs, and opt in to receive your election day push notifications.",
  },
  {
    q: "Can I import my existing voter list?",
    a: "Yes. Pro and above plans support CSV import of your existing contact lists with automatic field mapping and duplicate detection.",
  },
  {
    q: "What is Poll City Print?",
    a: "A print marketplace where you post your campaign print job — door hangers, lawn signs, flyers, and more — and local print shops compete to win your business with their best price and turnaround time.",
  },
  {
    q: "When are the 2026 municipal elections?",
    a: "Ontario municipal elections are October 26, 2026. BC municipal elections are October 17, 2026. Ontario nominations open May 1, 2026 and close August 21, 2026.",
  },
];

/* ─── Product cards data ─────────────────────────────────────────────────── */
const PRODUCTS = [
  {
    title: "Poll City Platform",
    tagline: "The complete campaign operations platform",
    colour: "from-blue-600 to-blue-800",
    textColour: "text-blue-700",
    bgLight: "bg-blue-50",
    border: "border-blue-200",
    features: [
      "Campaign website with custom domain like votegeorge.ca",
      "Contact CRM with household grouping and tagging",
      "Mobile canvassing app with offline sync and background sync",
      "Smart walk list builder with route optimisation",
      "Turf cutting by ward, poll number, odd/even streets",
      "GOTV engine with supporter scoring and prioritisation",
      "Volunteer management with scheduling and tracking",
      "Volunteer onboarding links, group leadership, and shift check-ins",
      "Sign tracking with map view",
      "Enterprise smart import with AI mapping, cleaning, duplicate detection, and import history",
      "Donation tracking and pledge management",
      "Budget tracker with allocation versus actual spend",
      "Volunteer expenses and reimbursement workflow",
      "Canvassing script builder and lookup quick actions",
      "Household-level soft-supporter updates from lookup in one tap",
      "Campaign operations hub: media, coalitions, events, and opponent intelligence",
      "Communications command center for email, SMS, social, and campaign ads",
      "Task management with team assignments",
      "Push notifications to opted-in voters on election day",
      "AI campaign assistant for strategy and targeting",
      "Import and export voter files with field mapping",
      "Custom per-campaign fields",
      "Role-based access: Admin, Manager, Canvasser, Finance",
      "Campaign website QR code — print on flyers, yard signs, and door hangers",
      "One-click copy, share to Twitter, download QR PNG from Page Builder",
      "Enterprise team management with role-based permissions (5 roles)",
      "7 specialized CSV exports: GOTV, walk list, signs, donations, volunteers, interactions",
      "Feature flags and tier gating — never hide locked features, always show upgrade path",
      "Detailed error system with recovery guidance on every error",
    ],
  },
  {
    title: "Analytics & Heat Maps",
    tagline: "Real-time election data visualization",
    colour: "from-amber-600 to-orange-700",
    textColour: "text-amber-700",
    bgLight: "bg-amber-50",
    border: "border-amber-200",
    features: [
      "Real GIS choropleth maps — Ontario municipal boundaries from ArcGIS Open Data",
      "Live Leaflet map with hover tooltips: winner, vote %, total votes cast",
      "Color-coded by vote intensity: red (close race <40%), blue (moderate), dark blue (dominant >60%)",
      "GeoJSON boundary polygons joined to election result data by jurisdiction",
      "Voter turnout heat maps by municipality",
      "Top 10 municipalities by turnout bar charts",
      "Trend analysis across 2014, 2018, and 2022 Ontario elections",
      "Enterprise analytics suite: Overview, Canvassing, Supporters, GOTV, Signs, Volunteers, Donations, Communications, Predictions",
      "Campaign risk flags and win-probability modeling for daily war-room decisions",
      "Poll-by-poll breakdown table with sortable columns",
      "Export data as CSV for campaign materials",
      "Reports suite and compliance-ready executive export snapshots",
      "Filter by municipality, province, election year",
      "Ward-level granularity to identify target areas",
      "Identify underperforming neighbourhoods for targeting",
    ],
  },
  {
    title: "Customizable Dashboard",
    tagline: "Data visualization that works for you",
    colour: "from-indigo-600 to-indigo-800",
    textColour: "text-indigo-700",
    bgLight: "bg-indigo-50",
    border: "border-indigo-200",
    features: [
      "Drag-and-drop widgetization of your dashboard",
      "Mission-control command center with health gauge, election countdown, weather pulse, funnel, and sentiment donut",
      "8 real-time data widgets: contacts, doors, signs, volunteers, donations, GOTV, activity, calls",
      "Canvasser leaderboard and city-level sign deployment intelligence",
      "Show/hide widgets with one click",
      "Four preset layouts: Field View, Finance View, GOTV View, Overview",
      "Persistent layout saves per user via localStorage",
      "Mobile-responsive single-column layout",
      "Real-time data refresh on every widget",
      "Last updated timestamp on each widget",
      "Colour-coded widget indicators",
      "Arrange by campaign priority",
    ],
  },
  {
    title: "Poll City Social",
    tagline: "The public civic engagement platform",
    colour: "from-green-600 to-emerald-700",
    textColour: "text-green-700",
    bgLight: "bg-green-50",
    border: "border-green-200",
    features: [
      "Voters discover candidates by postal code",
      "World-class Officials Directory: 7,000+ MPs, MPPs, mayors, councillors, trustees, and reeves",
      "Party colour–coded profiles for every Canadian political party",
      "Individual official pages with election history, Q&A, countdown to election day",
      "Verified badge + claim your profile workflow",
      "2025 election data: current MPs and MPPs marked active",
      "Follow officials at federal, provincial, and municipal level",
      "Cryptographically anonymous polling — SHA-256 hashed votes, zero-knowledge receipts",
      "Voter receipt verification at /verify-vote — prove your vote was counted",
      "Transparency page at /how-polling-works — see exactly how anonymity works",
      "Answer civic polls and questions from candidates",
      "Request campaign signs from their address",
      "Express support publicly or privately",
      "Opt in to receive election day reminders",
      "Opted-in supporters flow directly into campaign CRM",
      "PIPEDA-compliant consent management throughout",
    ],
  },
  {
    title: "Poll City Print",
    tagline: "The campaign print marketplace",
    colour: "from-orange-500 to-orange-700",
    textColour: "text-orange-700",
    bgLight: "bg-orange-50",
    border: "border-orange-200",
    features: [
      "Vistaprint-level quality with 8 campaign products and competitive local pricing",
      "Post your print job to the marketplace",
      "Local print shops submit competitive bids",
      "Review bids, compare prices and turnaround times",
      "Award job to winning shop",
      "Track order from production to delivery",
      "Upload print-ready files or use designer link",
    ],
  },
  {
    title: "Candidate Public Page",
    tagline: "World-class campaign website — built in minutes",
    colour: "from-purple-600 to-purple-800",
    textColour: "text-purple-700",
    bgLight: "bg-purple-50",
    border: "border-purple-200",
    features: [
      "Live at poll.city/candidates/your-name — zero setup",
      "6 themes: Classic Blue, Bold Red, Modern Dark, Campaign Green, Clean White, Royal Purple",
      "5 font pairs including Playfair Display, Montserrat, and Merriweather",
      "4 page layouts: Professional, Modern, Bold, Minimal",
      "Hero banner image and autoplay background video",
      "Social proof bar showing real-time supporter count",
      "Election countdown timer",
      "Up to 10 endorsement cards with org logo and quote",
      "Custom FAQ (up to 10 Q&A items)",
      "Live poll results from your campaign polls",
      "Email capture widget connected to campaign CRM",
      "Donation widget with custom amounts",
      "Office hours, committees, and voting record (Official plan)",
      "Accomplishments timeline (up to 20 entries)",
      "Newsletter signup and town hall scheduler",
      "Custom SEO title and meta description",
      "Downloadable QR code (PNG + SVG)",
      "Custom domain — votegeorge.ca points here (Pro+)",
      "White label — remove Poll City branding (Command)",
      "Custom CSS for full design control (Command)",
      "Live page builder preview — see changes before saving",
      "Page view analytics",
      "Volunteer signup, sign request, support signal forms — all CRM-connected",
      "Mobile-first, SEO-optimised, OpenGraph sharing",
      "Replaces your $5,000 static campaign website",
      "26 customization features across 4 plan tiers",
    ],
  },
];

/* ─── Blog posts ─────────────────────────────────────────────────────────── */
const BLOG_POSTS = [
  {
    category: "Strategy",
    date: "April 2026",
    title: "5 Things Every Municipal Candidate Needs Before Declaring",
    excerpt:
      "Ontario nominations open May 1. Here is what every serious candidate should have in place before they file their papers.",
  },
  {
    category: "Technology",
    date: "March 2026",
    title: "How GOTV Technology Won 3 Ontario Elections in 2022",
    excerpt:
      "A deep dive into how data-driven get-out-the-vote operations outperformed traditional phone banking by 3 to 1.",
  },
  {
    category: "Platform",
    date: "March 2026",
    title: "Why Campaign Websites Are Dead — And What Replaces Them",
    excerpt:
      "The $5,000 static campaign website is dead. Here is what winning candidates use instead and why it connects directly to their voter database.",
  },
];

/* ─── Testimonials ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    stars: 5,
    quote:
      "Poll City replaced our $4,500 campaign website and gave us tools we never had before. We knocked three times more doors with the canvassing app and our volunteer coordination was completely transformed.",
    name: "Sarah M.",
    title: "Ward Councillor Candidate, Hamilton ON",
    initials: "SM",
  },
  {
    stars: 5,
    quote:
      "The GOTV push notifications on election day were a game changer. We reached 2,400 opted-in supporters with one click and our voter turnout in target polls was up 12 per cent.",
    name: "David K.",
    title: "Mayoral Candidate, Barrie ON",
    initials: "DK",
  },
  {
    stars: 5,
    quote:
      "As an elected official I can finally engage with constituents between elections. The constituent dashboard and Q&A tools have completely changed how I connect with the people I represent.",
    name: "Councillor J.T.",
    title: "City of Toronto",
    initials: "JT",
  },
];

/* ─── Push notification mock data ───────────────────────────────────────── */
const PUSH_NOTIFICATIONS = [
  {
    title: "🗳️ Polls are open!",
    body: "Vote for George Smith at your local community centre. Open until 8pm tonight.",
    time: "8:00 AM",
    colour: "bg-blue-600",
  },
  {
    title: "⏰ Polls close in 2 hours",
    body: "Have you voted yet? Find your polling station here.",
    time: "6:02 PM",
    colour: "bg-red-600",
  },
  {
    title: "🙏 Thank you for your support",
    body: "Results coming tonight — follow along at poll.city",
    time: "7:45 PM",
    colour: "bg-green-600",
  },
];

const LIVE_ACTIVITY = [
  "Sarah M. just signed up in Hamilton, ON",
  "New sign request in Ward 3, Toronto",
  "David K. sent election-day notifications to 2,400 supporters",
  "Councillor Jennifer T. claimed her Poll City profile",
  "New volunteer joined the Barrie mayoral campaign",
  "Team in Kitchener marked 112 doors before noon",
  "Support signal received from North Bay voter feed",
  "Campaign in London launched first turf assignment",
  "New donor pledge logged in Peel Region",
  "Canvassing shift filled for Saturday morning in Oshawa",
];

const HOME_STATS = [
  { label: "Municipalities", value: 444, suffix: "" },
  { label: "Officials", value: 7000, suffix: "" },
  { label: "Provinces", value: 2, suffix: "" },
  { label: "Days To Election", value: 204, suffix: "" },
] as const;

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function MarketingClient() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [roleTab, setRoleTab] = useState<"campaign" | "voter">("campaign");
  const [arrowBounce, setArrowBounce] = useState(true);
  const [heroPostalCode, setHeroPostalCode] = useState("");
  const [candidatePostalCode, setCandidatePostalCode] = useState("");
  const [liveIndex, setLiveIndex] = useState(0);
  const [liveVisible, setLiveVisible] = useState(true);
  const [demoTab, setDemoTab] = useState<"dashboard" | "mobile" | "social">("dashboard");
  const [animatedStats, setAnimatedStats] = useState<number[]>(HOME_STATS.map(() => 0));
  const [statsStarted, setStatsStarted] = useState(false);
  const [nominationsCountdown, setNominationsCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const statsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("poll-city-banner-dismissed");
    if (!dismissed) setBannerDismissed(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setArrowBounce(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsStarted) return;
    const start = performance.now();
    const duration = 1400;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedStats(HOME_STATS.map((s) => Math.round(s.value * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [statsStarted]);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveVisible(false);
      setTimeout(() => {
        setLiveIndex((i) => (i + 1) % LIVE_ACTIVITY.length);
        setLiveVisible(true);
      }, 220);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const nominationsOpenAt = new Date("2026-05-01T00:00:00-04:00").getTime();
    const update = () => {
      const diff = Math.max(0, nominationsOpenAt - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setNominationsCountdown({ days, hours, minutes, seconds });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const activeDemo = useMemo(() => {
    if (demoTab === "dashboard") {
      return {
        title: "Campaign Dashboard",
        description: "A single war-room view for supporter growth, canvass progress, and election readiness.",
      };
    }
    if (demoTab === "mobile") {
      return {
        title: "Mobile Canvassing App",
        description: "Tinder-speed walk list with one-thumb actions, offline sync, and live route context.",
      };
    }
    return {
      title: "Poll City Social",
      description: "Voter-facing discovery, swipe polls, follows, and election reminders in one civic feed.",
    };
  }, [demoTab]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    localStorage.setItem("poll-city-banner-dismissed", "1");
  }, []);

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id.replace("#", ""));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navigateToOfficialsSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        router.push("/officials");
        return;
      }
      router.push(`/officials?search=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Election Banner ── */}
      {!bannerDismissed && (
        <div className="w-full bg-[#DC2626] text-white px-4 py-2.5 flex items-center justify-between gap-4 relative z-50">
          <div className="flex-1 text-center text-sm font-medium">
            🗳️ Ontario Oct 26 · BC Oct 17 · Nominations open May 2026 — Launch your campaign today
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/login" className="text-sm font-bold text-white hover:text-red-100 whitespace-nowrap">
              Start Free Trial →
            </Link>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss banner"
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Navigation ── */}
      <header
        className={`sticky top-0 z-40 border-b transition-all duration-200 ${
          scrolled ? "bg-white/95 backdrop-blur-sm shadow-md border-gray-200" : "bg-white border-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image src="/logo.png" alt="Poll City" width={40} height={40} priority />
            <span className="font-extrabold text-xl tracking-tight" style={{ color: "#1E3A8A" }}>
              Poll City
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label, external }) =>
              external ? (
                <Link key={href} href={href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {label}
                </Link>
              ) : (
                <button
                  key={href}
                  onClick={() => scrollTo(href)}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors bg-transparent border-none cursor-pointer"
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#1E3A8A] hover:text-blue-900 transition-colors px-3 py-1.5"
            >
              Login
            </Link>
            <Btn href="/login" size="sm" variant="primary">
              Start Free Trial
            </Btn>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile slide-from-right menu */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} />
            <div className="w-72 bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-bold text-[#1E3A8A]">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="px-4 py-4 flex flex-col gap-1 flex-1">
                {NAV_LINKS.map(({ href, label, external }) =>
                  external ? (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                      className="text-sm font-medium text-gray-700 hover:text-[#1E3A8A] py-2.5 px-3 rounded-lg hover:bg-blue-50 transition-colors block">
                      {label}
                    </Link>
                  ) : (
                    <button
                      key={href}
                      onClick={() => scrollTo(href)}
                      className="text-sm font-medium text-gray-700 hover:text-[#1E3A8A] py-2.5 px-3 rounded-lg hover:bg-blue-50 text-left transition-colors w-full"
                    >
                      {label}
                    </button>
                  )
                )}
              </nav>
              <div className="flex flex-col gap-2 px-4 py-4 border-t border-gray-100">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-[#1E3A8A] py-2.5 px-3 rounded-lg hover:bg-blue-50 text-center transition-colors"
                >
                  Login
                </Link>
                <Btn href="/login" size="md" variant="primary" className="w-full">
                  Start Free Trial
                </Btn>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center text-white px-4 py-24 sm:py-32 min-h-[90vh]"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #312e81 100%)" }}
      >
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            🇨🇦 Built for Canadian Municipal Elections 2026
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tighter">
            The Complete Political
            <br />
            <span className="text-blue-200">Operating System</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Win your election with the only platform built for Canadian municipal candidates.
            Campaign website, voter CRM, mobile canvassing, GOTV, and print marketplace — all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Btn href="/login" size="lg" variant="white">
              Start Free Trial — No Credit Card Required <ArrowRight className="w-4 h-4" />
            </Btn>
            <Btn href="#how-it-works" size="lg" variant="dark" onClick={() => scrollTo("#how-it-works")}>
              Watch 2-min Demo
            </Btn>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateToOfficialsSearch(heroPostalCode);
            }}
            className="max-w-xl mx-auto mb-10"
          >
            <label htmlFor="hero-postal-search" className="block text-sm font-semibold text-blue-100 mb-2 text-left">
              Find officials and candidates by postal code
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="hero-postal-search"
                type="text"
                value={heroPostalCode}
                onChange={(e) => setHeroPostalCode(e.target.value)}
                placeholder="Enter postal code (e.g. M5V 2T6)"
                className="w-full rounded-lg border border-white/30 bg-white/15 px-4 py-3 text-white placeholder:text-blue-100/80 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#1E3A8A] hover:bg-blue-50 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Social proof */}
          <p className="text-blue-200 text-sm font-medium mb-8">
            500+ campaigns · 7,000+ officials tracked · Ontario &amp; BC 2026
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-blue-100">
            {[
              { icon: Shield, label: "PIPEDA Compliant" },
              { icon: Lock, label: "SHA-256 Anonymous Polling" },
              { icon: Heart, label: "Canadian Made 🍁" },
              { icon: Database, label: "Data Stays in Canada" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-blue-300" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 ${arrowBounce ? "animate-bounce" : ""}`}
        >
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── Live Activity Ticker ── */}
      <section className="bg-[#0f172a] border-y border-slate-700 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Live on Poll City</span>
          <div className="h-7 overflow-hidden flex-1">
            <p className={`text-sm text-slate-100 transition-all duration-200 ${liveVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}>
              {LIVE_ACTIVITY[liveIndex]}
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section ref={statsRef} className="bg-white border-y border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {HOME_STATS.map((stat, idx) => (
            <div key={stat.label}>
              <p className="text-5xl font-black text-[#1E3A8A] leading-none">{animatedStats[idx].toLocaleString()}{stat.suffix}</p>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blue-50 py-14 px-4 border-b border-blue-100">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1E3A8A] mb-3">For Voters</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Find Your Candidates</h2>
            <p className="text-gray-600 text-lg">
              Enter your postal code to instantly see the candidates and elected officials that represent your address.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateToOfficialsSearch(candidatePostalCode);
            }}
            className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6"
          >
            <label htmlFor="candidate-postal-search" className="block text-sm font-semibold text-gray-700 mb-2">
              Postal code lookup
            </label>
            <input
              id="candidate-postal-search"
              type="text"
              value={candidatePostalCode}
              onChange={(e) => setCandidatePostalCode(e.target.value)}
              placeholder="A1A 1A1"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
            >
              Find My Candidates
            </button>
          </form>
        </div>
      </section>

      {/* ── Product Demo Tabs ── */}
      <section className="bg-white py-20 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">See Poll City in action</h2>
            <p className="text-gray-500">Three workflows your team and your voters use every day.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { id: "dashboard", label: "Campaign Dashboard" },
              { id: "mobile", label: "Mobile Canvassing App" },
              { id: "social", label: "Poll City Social" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDemoTab(tab.id as "dashboard" | "mobile" | "social")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${demoTab === tab.id ? "bg-[#1E3A8A] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-xl min-h-[280px]">
              {demoTab === "dashboard" && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Supporters", "1,284"],
                    ["Doors Today", "96"],
                    ["Volunteers", "34"],
                    ["Sign Requests", "58"],
                    ["Notifications", "2.4K"],
                    ["Readiness", "78%"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3 text-white">
                      <p className="text-[11px] text-slate-200">{label}</p>
                      <p className="text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {demoTab === "mobile" && (
                <div className="max-w-[220px] mx-auto rounded-[28px] border-4 border-slate-700 bg-black p-2">
                  <div className="rounded-[20px] bg-white p-3 space-y-2">
                    {["101 Main St", "103 Main St", "105 Main St"].map((door, i) => (
                      <div key={door} className="border rounded-xl p-2.5">
                        <p className="font-bold text-sm text-gray-900">{door}</p>
                        <p className="text-xs text-gray-500">{i === 1 ? "Undecided" : "Leaning support"} · {i + 1} min away</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {demoTab === "social" && (
                <div className="max-w-sm mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Swipe Poll</p>
                  <h3 className="text-xl font-extrabold mt-2 mb-6">Should the city add all-day transit passes?</h3>
                  <div className="space-y-2">
                    <div className="rounded-xl bg-white/15 px-4 py-3">Yes, prioritize affordability</div>
                    <div className="rounded-xl bg-white/10 px-4 py-3">No, keep current fare structure</div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] mb-2">Product Demo</p>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3">{activeDemo.title}</h3>
              <p className="text-gray-600 mb-6">{activeDemo.description}</p>
              <Btn href="/login" size="lg" variant="primary">
                Try It Free <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="bg-gray-50 py-20 px-4" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Stop losing votes to chaos
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Most campaigns cobble together 5 disconnected tools. Poll City replaces them all.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Old way */}
            <div className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm">
              <h3 className="font-bold text-xl text-[#DC2626] mb-6 flex items-center gap-2">
                <X className="w-5 h-5" /> The old way
              </h3>
              <ul className="space-y-3">
                {[
                  "$5,000 website that does nothing for your campaign",
                  "Spreadsheets to track your supporters",
                  "Paper walk sheets for canvassing",
                  "WhatsApp groups for volunteers",
                  "No idea how many supporters you actually have",
                  "Paying for 5 different disconnected tools",
                  "Missing voters on election day",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <X className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Poll City way */}
            <div className="bg-white rounded-2xl p-8 border border-green-200 shadow-sm relative">
              <div className="absolute -top-3 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Poll City
              </div>
              <h3 className="font-bold text-xl text-[#1E3A8A] mb-6 flex items-center gap-2">
                <Check className="w-5 h-5" /> The Poll City way
              </h3>
              <ul className="space-y-3">
                {[
                  "Professional campaign website live in minutes",
                  "Full CRM with household grouping and supporter scoring",
                  "Mobile canvassing app with offline sync",
                  "Volunteer management with shift scheduling",
                  "Real-time supporter tracking and GOTV scoring",
                  "Everything connected in one platform",
                  "Push notifications to every opted-in voter on election day",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Four Product Cards ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Everything your campaign needs
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Four integrated products. One platform. One subscription.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PRODUCTS.map((p) => (
              <div key={p.title} className={`rounded-2xl border ${p.border} overflow-hidden shadow-sm`}>
                {/* Card header */}
                <div className={`bg-gradient-to-r ${p.colour} px-6 py-5 text-white`}>
                  <h3 className="font-extrabold text-lg">{p.title}</h3>
                  <p className="text-white/80 text-sm mt-1">{p.tagline}</p>
                </div>
                {/* Card features */}
                <div className={`${p.bgLight} px-6 py-5`}>
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.textColour}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Make Your Page Yours ── */}
      <section className="py-20 px-4 bg-white" id="customization">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">Page Builder</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Make your page yours</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              26 customization features turn your Poll City page into a world-class campaign website — no developer needed, live preview built in.
            </p>
          </div>

          {/* Before / After */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {/* Before */}
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/><div className="w-2.5 h-2.5 rounded-full bg-green-400"/></div>
                <span className="text-xs text-gray-400 font-mono flex-1 text-center">Default page (Free plan)</span>
              </div>
              <div className="p-5 bg-gray-50">
                <div className="h-16 bg-blue-900 rounded-xl mb-4 flex items-center px-4 gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">JS</div>
                  <div><div className="text-white text-sm font-bold">Jane Smith</div><div className="text-blue-300 text-xs">Ward 5 Candidate</div></div>
                </div>
                <div className="space-y-2">
                  {["About", "Platform", "Volunteer"].map(l => <div key={l} className="h-6 bg-gray-200 rounded text-xs flex items-center px-2 text-gray-400">{l}</div>)}
                </div>
                <p className="text-xs text-gray-300 text-center mt-3">Default theme · Default font</p>
              </div>
            </div>

            {/* After */}
            <div className="rounded-2xl overflow-hidden border-2 border-purple-300 shadow-xl ring-2 ring-purple-200">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/><div className="w-2.5 h-2.5 rounded-full bg-green-400"/></div>
                <span className="text-xs text-gray-400 font-mono flex-1 text-center">Customized page (Pro plan)</span>
                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">After</span>
              </div>
              <div className="p-5 bg-white">
                <div className="h-20 rounded-xl mb-4 flex items-center px-4 gap-3 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-purple-400 flex items-center justify-center text-white font-bold">JS</div>
                  <div>
                    <div className="text-white font-bold flex items-center gap-1.5">Jane Smith <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">✓ Verified</span></div>
                    <div className="text-purple-200 text-xs">Ward 5 · Municipal</div>
                    <div className="text-white/80 text-xs mt-0.5">⭐ 247 supporters</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { l: "📋 Endorsements (8)", c: "bg-purple-600 text-white" },
                    { l: "❓ FAQ", c: "bg-purple-50 text-purple-700 border border-purple-200" },
                    { l: "📬 Stay in the loop", c: "bg-gray-50 text-gray-600 border border-gray-200" },
                  ].map(({ l, c }) => <div key={l} className={`h-7 rounded-lg text-xs font-medium flex items-center px-3 ${c}`}>{l}</div>)}
                </div>
                <p className="text-xs text-purple-400 text-center mt-3 font-medium">Royal Purple theme · Playfair Display font</p>
              </div>
            </div>
          </div>

          {/* 6 theme swatches */}
          <div className="mb-14">
            <p className="text-center text-sm font-semibold text-gray-600 mb-5">6 built-in themes — pick yours in one click</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Classic Blue",    bg: "#1e3a8a", text: "bg-blue-50" },
                { label: "Bold Red",        bg: "#dc2626", text: "bg-red-50" },
                { label: "Modern Dark",     bg: "#111827", text: "bg-gray-50" },
                { label: "Clean White",     bg: "#2563eb", text: "bg-white" },
                { label: "Campaign Green",  bg: "#15803d", text: "bg-green-50" },
                { label: "Royal Purple",    bg: "#7c3aed", text: "bg-purple-50" },
              ].map((t) => (
                <div key={t.label} className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${t.text}`}>
                  <div className="h-12" style={{ backgroundColor: t.bg }} />
                  <p className="text-xs text-center py-2 font-medium text-gray-600 px-1">{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature highlights grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              { icon: "🎨", title: "Themes & Colours", desc: "6 professional themes, custom primary and accent colours, 5 font pairs.", tier: "Starter+" },
              { icon: "🖼️", title: "Hero Banner & Video", desc: "Full-bleed background image or autoplay video with overlay for drama.", tier: "Pro+" },
              { icon: "⭐", title: "Endorsements", desc: "Up to 10 endorsement cards with organisation logo and pull quote.", tier: "Pro+" },
              { icon: "❓", title: "Custom FAQ", desc: "Answer voters' top questions directly on your page — up to 10 Q&A items.", tier: "Pro+" },
              { icon: "📊", title: "Live Polls & Counter", desc: "Embed your campaign polls and show a live doors-knocked counter.", tier: "Pro+" },
              { icon: "🏛️", title: "Elected Official Tools", desc: "Office hours, committees, voting record, accomplishments timeline.", tier: "Official+" },
              { icon: "📬", title: "Email & Donations", desc: "Email capture and donation widgets both feed directly into your CRM.", tier: "Pro+" },
              { icon: "🔍", title: "SEO + Analytics", desc: "Custom meta title and description. Page view analytics in your dashboard.", tier: "Pro+" },
              { icon: "📱", title: "QR Code Download", desc: "One-click QR code for print materials — download PNG or SVG instantly.", tier: "Pro+" },
              { icon: "🌐", title: "Custom Domain", desc: "votegeorge.ca points to your Poll City page. Setup in 5 minutes.", tier: "Pro+" },
              { icon: "✏️", title: "White Label", desc: "Remove Poll City branding. Add custom CSS. Your page, your brand.", tier: "Command" },
              { icon: "👁️", title: "Live Preview", desc: "See every change in real-time before saving — Squarespace-quality builder.", tier: "All plans" },
            ].map((f) => (
              <div key={f.title} className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{f.tier}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="/signup">
              <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg transition-colors">
                Start Customizing — Free to Try
              </button>
            </a>
            <p className="text-gray-400 text-sm mt-3">No credit card required · Live in minutes · Cancel any time</p>
          </div>
        </div>
      </section>

      {/* ── Replace Campaign Websites ── */}
      <section className="py-20 px-4" id="candidates" style={{ background: "#1E3A8A" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Replace your $5,000 campaign website for $199/month
            </h2>
            <p className="text-blue-200 max-w-xl mx-auto">
              Your Poll City candidate page does everything a custom website does — and connects directly to your campaign CRM.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Feature list */}
            <div className="text-white">
              <ul className="space-y-4">
                {[
                  { icon: Users, text: "Volunteer signup goes straight to your database" },
                  { icon: MapPin, text: "Sign requests appear on your map instantly" },
                  { icon: TrendingUp, text: "Support signals update your GOTV scores" },
                  { icon: Bell, text: "Events sync to your campaign calendar" },
                  { icon: Globe, text: "Custom domain support on Pro and above" },
                  { icon: Zap, text: "Live in minutes not weeks" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-200" />
                    </div>
                    <span className="text-blue-100 text-sm pt-1">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Domain mockup */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="bg-gray-100 border-b flex items-center gap-2 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded text-xs text-gray-400 px-3 py-1 text-center font-mono">
                  votegeorge.ca
                  <span className="text-gray-300 mx-1">→</span>
                  poll.city/candidates/george-smith-ward-3
                </div>
              </div>
              {/* Page mockup */}
              <div className="p-5 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white font-bold text-lg">
                    GS
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">George Smith</div>
                    <div className="text-xs text-gray-500">Ward 3 Councillor Candidate</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-green-600 font-medium">Verified Candidate</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Volunteer", "Request a Sign", "Show Support", "Donate"].map((label, i) => (
                    <div
                      key={label}
                      className={`h-8 rounded-lg text-xs font-semibold flex items-center px-3 ${
                        i === 0
                          ? "bg-[#1E3A8A] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-4">Powered by Poll City · poll.city</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Election Day Push Notifications ── */}
      <section className="bg-blue-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Send election day reminders to every supporter who opted in
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Voters follow you on Poll City Social and opt in to notifications. On election day, one button reaches all of them.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 items-center justify-center">
            {/* Phone mockup */}
            <div className="flex-shrink-0">
              <div className="w-64 bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                <div className="bg-gray-800 rounded-[2rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-5 py-2 text-white text-xs">
                    <span>9:00 AM</span>
                    <span>●●●</span>
                  </div>
                  {/* Lock screen */}
                  <div className="bg-gradient-to-b from-gray-800 to-gray-900 px-3 pb-5 space-y-2">
                    {PUSH_NOTIFICATIONS.map((n, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 text-white">
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-lg ${n.colour} flex items-center justify-center flex-shrink-0 text-xs`}>
                            🔔
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">{n.title}</span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">{n.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="max-w-sm text-center lg:text-left">
              <div className="text-5xl font-extrabold text-[#1E3A8A] mb-3">1 button.</div>
              <div className="text-5xl font-extrabold text-gray-900 mb-6">Thousands reminded.</div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Every supporter who follows you on Poll City Social can opt in to receive your notifications. On election day, one click reaches all of them with their polling station, voting hours, and a personal message from you.
              </p>
              <Btn href="/login" size="lg" variant="primary">
                Start Building Your List <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ── Turf Cutting & Canvassing ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Smart canvassing that wins elections
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Our route optimisation engine builds the most efficient walk lists so your canvassers knock more doors in less time.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: MapPin,
                title: "Smart turf creation",
                desc: "Create turfs by ward, poll number, street, or odd/even house number sides for maximum efficiency.",
                colour: "bg-blue-100 text-[#1E3A8A]",
              },
              {
                icon: Target,
                title: "Route optimisation",
                desc: "Nearest-neighbour algorithm calculates the shortest walking path between every door on your list.",
                colour: "bg-green-100 text-green-700",
              },
              {
                icon: Building2,
                title: "Odd/even street splitting",
                desc: "Split any street by odd or even house numbers so two canvassers cover both sides simultaneously.",
                colour: "bg-orange-100 text-orange-700",
              },
              {
                icon: Zap,
                title: "Offline sync",
                desc: "Works without cell signal in any neighbourhood. Interactions queue and sync automatically when you reconnect.",
                colour: "bg-purple-100 text-purple-700",
              },
              {
                icon: Monitor,
                title: "Real-time manager map",
                desc: "Campaign managers see every canvasser's GPS location and turf completion status on a live map.",
                colour: "bg-cyan-100 text-cyan-700",
              },
              {
                icon: Award,
                title: "Leaderboard and gamification",
                desc: "Canvasser performance leaderboard with doors knocked, support updates, and completed turfs.",
                colour: "bg-yellow-100 text-yellow-700",
              },
            ].map(({ icon: Icon, title, desc, colour }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className={`w-10 h-10 rounded-xl ${colour} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gray-50 py-20 px-4" id="how-it-works">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">How Poll City works</h2>
            <p className="text-gray-500">Whether you are running a campaign or exercising your vote, Poll City has you covered.</p>
          </div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-10">
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
              {(["campaign", "voter"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoleTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    roleTab === tab
                      ? "bg-[#1E3A8A] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "campaign" ? "🗺️ For Campaigns" : "🗳️ For Voters"}
                </button>
              ))}
            </div>
          </div>

          {roleTab === "campaign" ? (
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  icon: Zap,
                  title: "Create your campaign in minutes",
                  body: "Your candidate page goes live immediately at poll.city/candidates/your-name. Set up your team, import your contacts, and customise your fields.",
                },
                {
                  step: "2",
                  icon: Users,
                  title: "Build your supporter list",
                  body: "Canvass doors with the mobile app, import existing lists, and grow through Poll City Social as voters discover and follow you.",
                },
                {
                  step: "3",
                  icon: Target,
                  title: "Win on election day",
                  body: "Activate your GOTV engine, send push notifications to opted-in supporters, coordinate your volunteer team, and track every vote.",
                },
              ].map(({ step, icon: Icon, title, body }) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#1E3A8A] text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    {step}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6" id="voters">
              {[
                {
                  step: "1",
                  icon: MapPin,
                  title: "Enter your postal code",
                  body: "Find every candidate and official representing you — federal, provincial, and municipal — all in one place.",
                },
                {
                  step: "2",
                  icon: MessageSquare,
                  title: "Follow and engage",
                  body: "Answer polls from candidates, ask questions, request signs, and show your support publicly or privately.",
                },
                {
                  step: "3",
                  icon: Bell,
                  title: "Vote",
                  body: "Receive election day reminders from campaigns you support. Know where to vote and when polls close.",
                },
              ].map(({ step, icon: Icon, title, body }) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    {step}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white py-20 px-4" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 mb-6">Start free. Scale as your campaign grows. No hidden fees.</p>

            {/* Annual toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  annual ? "bg-[#1E3A8A]" : "bg-gray-200"
                }`}
                aria-label="Toggle annual billing"
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    annual ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
                Annual
                <span className="ml-1.5 bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 ${plan.borderColour} overflow-hidden flex flex-col shadow-sm ${
                  plan.highlight ? "bg-[#1E3A8A] text-white scale-[1.03] shadow-2xl ring-2 ring-blue-500" : "bg-white"
                }`}
              >
                {/* Badge */}
                <div className="h-6 flex items-center justify-center">
                  {plan.badge && (
                    <span className="text-xs font-bold bg-[#DC2626] text-white px-3 py-0.5 rounded-b-lg">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className={`font-extrabold text-base mb-0.5 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    {plan.price === 0 ? (
                      <div className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                        $0
                      </div>
                    ) : (
                      <div>
                        {annual && (
                          <div className={`text-sm line-through ${plan.highlight ? "text-blue-300" : "text-gray-400"}`}>
                            ${plan.price}/mo
                          </div>
                        )}
                        <div className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                          ${annual ? plan.annualPrice : plan.price}
                          <span className={`text-sm font-normal ml-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                            /mo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check
                          className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                            plan.highlight ? "text-blue-300" : "text-green-500"
                          }`}
                        />
                        <span className={plan.highlight ? "text-blue-100" : "text-gray-600"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Btn
                    href="/login"
                    size="sm"
                    variant={plan.ctaVariant}
                    className={`w-full justify-center ${
                      plan.highlight
                        ? "bg-white text-[#1E3A8A] hover:bg-blue-50"
                        : ""
                    }`}
                  >
                    {plan.ctaLabel}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Trusted by campaigns across Ontario
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                {/* Decorative quote mark */}
                <div className="absolute top-3 right-4 text-gray-100 font-black text-8xl leading-none select-none pointer-events-none">&rdquo;</div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 relative">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog Preview ── */}
      <section className="bg-white py-20 px-4" id="blog">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Campaign intelligence from the Poll City team
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <div key={post.title} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <FileText className="w-12 h-12 text-[#1E3A8A]/30" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-white bg-[#1E3A8A] px-2.5 py-0.5 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-400">{post.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug">{post.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{post.excerpt}</p>
                  <a href="#blog" className="text-xs font-semibold text-[#1E3A8A] hover:text-blue-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read More <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-blue-50 py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${openFaq === i ? "border-blue-200" : "border-gray-200"}`}>
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm text-gray-900">{faq.q}</span>
                  <div className={`transition-transform duration-200 flex-shrink-0 ${openFaq === i ? "rotate-180" : "rotate-0"}`}>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: openFaq === i ? "300px" : "0px" }}
                >
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Urgency Countdown ── */}
      <section className="bg-[#B91C1C] py-16 px-4 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-red-100 mb-2">Election Urgency</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Nominations open in {nominationsCountdown.days} days</h2>
          <p className="text-red-100 mb-8">Candidates who start early win.</p>
          <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { label: "Days", value: nominationsCountdown.days },
              { label: "Hours", value: nominationsCountdown.hours },
              { label: "Minutes", value: nominationsCountdown.minutes },
              { label: "Seconds", value: nominationsCountdown.seconds },
            ].map((unit) => (
              <div key={unit.label} className="rounded-xl bg-white/10 border border-white/20 py-4">
                <p className="text-3xl font-black">{String(unit.value).padStart(2, "0")}</p>
                <p className="text-xs uppercase tracking-wide text-red-100">{unit.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="py-24 px-4 text-white text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Image src="/logo.png" alt="Poll City" width={40} height={40} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Your campaign starts here
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Ontario nominations open May 1, 2026. Every day you wait is a day your opponent is building their list.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Btn href="/login" size="lg" variant="white">
              Start Free Trial — No Credit Card Required <ArrowRight className="w-4 h-4" />
            </Btn>
            <Btn href="#how-it-works" size="lg" variant="dark" onClick={() => scrollTo("#how-it-works")}>
              Book a Demo
            </Btn>
          </div>
          <p className="text-blue-300 text-sm">Limited early-bird pricing available through May 2026</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="about" className="py-16 px-4" style={{ background: "#0f172a" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="Poll City" width={36} height={36} />
                <span className="font-extrabold text-white text-lg">Poll City</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                The complete political operating system for Canadian campaigns.
              </p>
              <div className="flex gap-2 mb-5">
                {[Twitter, Linkedin, Facebook].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-2 text-xs text-gray-400">
                <a href="mailto:hello@poll.city" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5" /> hello@poll.city
                </a>
                <a href="tel:+14165550100" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" /> 1-416-555-0100
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Products</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {["Poll City Platform", "Poll City Social", "Poll City Print", "Officials Directory", "Candidate Pages", "Pricing"].map(
                  (item) => (
                    <li key={item}>
                      <a href="#features" className="hover:text-white transition-colors">
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* For Candidates */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">For Candidates</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {[
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Features", href: "#features" },
                  { label: "Turf Cutting", href: "#features" },
                  { label: "GOTV Engine", href: "#features" },
                  { label: "Push Notifications", href: "#features" },
                  { label: "Start Free Trial", href: "/login" },
                  { label: "Officials Directory", href: "/officials" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {["About Us", "Blog", "Contact Us", "Careers", "Partners", "Press"].map((item) => (
                  <li key={item}>
                    <a href="#about" className="hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {["Privacy Policy", "Terms of Service", "PIPEDA Compliance", "Cookie Policy", "Security", "Accessibility"].map(
                  (item) => (
                    <li key={item}>
                      <a href="#" className="hover:text-white transition-colors">
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© 2026 Poll City Technologies Inc. · Made in Canada 🍁 · All rights reserved</p>
            <p>Data stored on Canadian servers · PIPEDA compliant</p>
          </div>
        </div>
      </footer>

      {/* Floating chat button */}
      <a
        href="mailto:admin@pollcity.dev"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1E3A8A] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-900 transition-all hover:scale-110 hover:shadow-blue-500/30"
        title="Chat with us"
        aria-label="Contact support"
      >
        <MessageSquare className="w-6 h-6" />
      </a>
    </div>
  );
}
