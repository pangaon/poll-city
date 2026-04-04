"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle, Menu, X, ArrowRight, Shield, Lock, MapPin, Users,
  BarChart3, Bell, Printer, Star, Zap, Vote, Globe, ChevronRight,
  Check, Phone, Mail, Building2, Smartphone, Monitor, AlertCircle,
  Target, MessageSquare, ClipboardList, Megaphone, Database, Play,
  Twitter, Linkedin, Facebook, Heart, Award, TrendingUp, FileText,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function Btn({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: {
  href: string;
  variant?: "primary" | "outline" | "ghost" | "white" | "red";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const sizes = { sm: "px-3.5 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
    ghost: "text-blue-600 hover:bg-blue-50",
    white: "bg-white text-blue-700 hover:bg-blue-50 shadow-sm",
    red: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

function FeatureCheck({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className={`flex items-start gap-2 text-sm ${dark ? "text-blue-100" : "text-gray-600"}`}>
      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${dark ? "text-blue-300" : "text-green-500"}`} />
      <span>{children}</span>
    </li>
  );
}

/* ─── Dashboard Mockup ────────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 bg-white">
      <div className="bg-gray-100 border-b flex items-center gap-2 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-xs text-gray-400 px-3 py-1 text-center">
          app.poll.city/dashboard
        </div>
      </div>
      <div className="flex" style={{ height: 290 }}>
        <div className="w-14 bg-blue-700 flex flex-col items-center py-4 gap-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-white/20" />
          {[Users, MapPin, BarChart3, Printer, Bell, Globe].map((Icon, i) => (
            <Icon key={i} className={`w-5 h-5 ${i === 0 ? "text-white" : "text-blue-300"}`} />
          ))}
        </div>
        <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="h-3 bg-gray-800 rounded w-32 mb-1.5" />
              <div className="h-2 bg-gray-300 rounded w-24" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-blue-600 rounded-lg" />
              <div className="h-7 w-16 bg-white border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Supporters", val: "2,847", c: "text-blue-600" },
              { label: "Doors", val: "8,120", c: "text-green-600" },
              { label: "Signs", val: "341", c: "text-purple-600" },
              { label: "Volunteers", val: "89", c: "text-rose-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg p-2.5 border">
                <div className={`text-base font-bold ${s.c}`}>{s.val}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border overflow-hidden">
              {["Margaret Liu", "Robert Chen", "Priya Patel"].map((name, i) => (
                <div key={name} className={`flex items-center gap-2 px-2.5 py-1.5 ${i > 0 ? "border-t" : ""}`}>
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[9px] flex items-center justify-center font-bold flex-shrink-0">{name[0]}</div>
                  <div className="h-2 bg-gray-200 rounded flex-1" />
                  <div className="h-3 w-8 rounded-full bg-green-100" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border p-2.5">
              <div className="h-2 bg-gray-200 rounded w-16 mb-2" />
              <div className="space-y-1">
                {[70, 45, 85, 30].map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-2 bg-gray-100 rounded-full flex-1">
                      <div className="h-2 bg-blue-400 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400">{w}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Candidate Page Mockup ──────────────────────────────────────────────── */
function CandidatePageMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white max-w-xs mx-auto">
      <div className="bg-gray-100 flex items-center gap-2 px-3 py-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-[10px] text-gray-400 px-2 py-0.5 text-center">
          votegeorge.ca
        </div>
      </div>
      <div className="bg-blue-600 py-6 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-white mx-auto mb-2 flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">GH</span>
        </div>
        <h3 className="text-white font-bold">George Hatzis</h3>
        <p className="text-blue-200 text-xs mt-0.5">Candidate · Ward 7 · Hamilton</p>
      </div>
      <div className="p-4">
        <p className="text-gray-500 text-xs mb-4 leading-relaxed">Fighting for safer streets, better transit, and community-first development in Ward 7.</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[["1,247", "Supporters"], ["89", "Volunteers"], ["341", "Signs"]].map(([val, label]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-blue-600 text-sm">{val}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <button className="w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg">Volunteer with George</button>
          <button className="w-full border text-xs font-semibold py-2 rounded-lg text-gray-600">Request a Lawn Sign</button>
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-[10px] text-gray-400 text-center">Powered by Poll City · <span className="text-blue-500">poll.city</span></p>
        </div>
      </div>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#blog", label: "Blog" },
  { href: "#about", label: "About" },
  { href: "mailto:hello@poll.city", label: "Contact" },
];

const PRODUCTS = [
  {
    icon: BarChart3,
    colour: "blue",
    badge: "Core Platform",
    title: "Poll City Platform",
    tagline: "The complete campaign operations hub",
    description: "Everything a campaign needs to win — from first door knock to election night. Built for the realities of Ontario municipal politics.",
    features: [
      "Voter CRM with support level tracking (1–5)",
      "Canvassing walk lists, mobile app, GPS tracking",
      "GOTV engine with same-day voted list upload",
      "Real-time canvasser coverage map",
      "Volunteer management and shift scheduling",
      "Sign tracking — request, deploy, map",
      "Donation and expense tracking",
      "Campaign task manager",
      "CSV import with automatic field mapping",
      "Role-based access for your whole team",
      "PIPEDA-compliant data handling",
    ],
  },
  {
    icon: Globe,
    colour: "purple",
    badge: "Civic Engagement",
    title: "Poll City Social",
    tagline: "Connect voters to their local democracy",
    description: "The voter-facing side of Poll City. Citizens discover candidates, engage on issues, and participate in local democracy — all in one place.",
    features: [
      "Public candidate and elected official profiles",
      "Live voter polls on any issue",
      "Question & answer threads with officials",
      "Ward and riding boundary display",
      "Voting location lookup by address",
      "Election countdown and key dates",
      "Voter notification opt-in",
      "Issue tracking and commitment logging",
      "School board and trustee district data",
      "Federal and provincial riding overlap",
    ],
  },
  {
    icon: Printer,
    colour: "orange",
    badge: "Print Marketplace",
    title: "Poll City Print",
    tagline: "Campaign materials. Competitive bids.",
    description: "Post a print job and receive competitive bids from verified Ontario print shops within 24 hours. No phone tag, no surprise pricing.",
    features: [
      "Door hangers, lawn signs, flyers, palm cards",
      "Mailers, postcards, banners, buttons, window signs",
      "Post a job in under 2 minutes",
      "Receive bids from pre-vetted Ontario vendors",
      "Compare price, turnaround, and samples",
      "File upload and proof approval workflow",
      "Delivery tracking",
      "Reorder previous jobs with one click",
      "Budget tracking against campaign spend",
      "Save 15–30% vs. direct print quotes",
    ],
  },
  {
    icon: Vote,
    colour: "green",
    badge: "Replaces $5,000 website",
    title: "Candidate Public Page",
    tagline: "Your campaign on the web — instantly",
    description: "A professional candidate page that does everything a $5,000 custom website does, built into your platform. Live in under 10 minutes.",
    features: [
      "Custom URL: votegeorge.ca or yourname.poll.city",
      "Volunteer signup form → straight to your CRM",
      "Lawn sign request form → straight to your sign list",
      "Supporter pledge counter and live progress bar",
      "Embedded voter polls",
      "Bio, photo, platform, and policy positions",
      "Social sharing and SEO-optimised",
      "Election day push notification opt-in",
      "Mobile-first design",
      "Zero design skills required — live in 10 minutes",
    ],
  },
];

const COLOUR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100",   badge: "bg-blue-100 text-blue-700" },
  green:  { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100",  badge: "bg-green-100 text-green-700" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", badge: "bg-purple-100 text-purple-700" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", badge: "bg-orange-100 text-orange-700" },
};

const PLANS = [
  {
    name: "Free Trial",
    price: 0,
    label: "14 days free",
    description: "Try the full platform risk-free. No credit card required.",
    highlight: false,
    cta: "Start free trial",
    features: [
      "Full platform access for 14 days",
      "Up to 500 contacts",
      "Candidate public page",
      "Canvassing app",
      "1 team member",
    ],
  },
  {
    name: "Starter",
    price: 199,
    label: "/ month",
    description: "For ward council and school board candidates running a focused campaign.",
    highlight: false,
    cta: "Start free trial",
    features: [
      "Up to 5,000 contacts",
      "Full canvassing suite",
      "GOTV engine",
      "Print marketplace",
      "Candidate public page",
      "Push notifications (1,000 subscribers)",
      "Up to 5 team members",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: 399,
    label: "/ month",
    description: "For mayoral candidates and multi-ward campaigns that need more scale.",
    highlight: true,
    cta: "Start free trial",
    features: [
      "Up to 25,000 contacts",
      "Advanced GOTV analytics",
      "Turf cutting and route optimisation",
      "Push notifications (10,000 subscribers)",
      "Up to 15 team members",
      "Role-based access control",
      "CSV export",
      "Priority support",
    ],
  },
  {
    name: "Command",
    price: 799,
    label: "/ month",
    description: "City-wide campaigns, party slates, and county councils needing full control.",
    highlight: false,
    cta: "Start free trial",
    features: [
      "Unlimited contacts",
      "Multi-ward management",
      "Unlimited push subscribers",
      "Unlimited team members",
      "Custom fields and tags",
      "Election data visualisation maps",
      "Dashboard customisation",
      "API access",
      "White-glove onboarding",
      "Dedicated account manager",
    ],
  },
  {
    name: "Elected Official",
    price: 299,
    label: "/ month",
    description: "For sitting councillors, MPPs, and trustees managing ongoing constituent relations.",
    highlight: false,
    cta: "Get started",
    features: [
      "Constituent CRM",
      "Poll City Social profile",
      "Issue and commitment tracker",
      "Public Q&A management",
      "Voter notification broadcasts",
      "Office team access",
      "Annual subscription option",
    ],
  },
];

const TESTIMONIALS = [
  {
    quote: "Poll City gave our volunteer team the tools to knock 8,000 doors before election day. We won by 340 votes.",
    name: "Sarah M.",
    role: "Ward 4 Councillor, Hamilton",
    initials: "SM",
  },
  {
    quote: "The sign tracker alone saved us hours every week. Our sign crew knew exactly where to go every morning.",
    name: "James P.",
    role: "Campaign Manager, Brampton",
    initials: "JP",
  },
  {
    quote: "I ran as an independent with no party backing. Poll City's print marketplace saved me 30% on my flyer order.",
    name: "Diane L.",
    role: "Trustee Candidate, Toronto DSB",
    initials: "DL",
  },
];

const BLOG_POSTS = [
  {
    tag: "GOTV",
    title: "The 72-Hour GOTV Sprint: A Playbook for Ontario Municipal Campaigns",
    excerpt: "How successful campaigns compress their get-out-the-vote effort into a three-day blitz that maximises every volunteer hour.",
    date: "March 2026",
    icon: TrendingUp,
  },
  {
    tag: "Canvassing",
    title: "Door-Knocking in the Digital Age: What the Data Says About Contact Rates",
    excerpt: "An analysis of 40,000 canvass contacts reveals the best days, times, and scripts for building genuine supporter relationships.",
    date: "February 2026",
    icon: MapPin,
  },
  {
    tag: "Technology",
    title: "Why Campaign Websites Alone Are Not Enough in 2026",
    excerpt: "A candidate page without CRM behind it is just a brochure. Here's how integrated platforms change the outcome math.",
    date: "January 2026",
    icon: FileText,
  },
];

const TRUST_BADGES = [
  { icon: Shield, text: "PIPEDA Compliant" },
  { icon: Lock, text: "Bank-level Security" },
  { icon: Award, text: "Canadian Made" },
  { icon: Database, text: "Data Stays in Canada" },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function MarketingClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [roleTab, setRoleTab] = useState<"campaign" | "voter">("campaign");
  const [annualBilling, setAnnualBilling] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── Ontario Election 2026 Banner ── */}
      {!bannerDismissed && (
        <div className="bg-red-600 text-white">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-center flex-1">
              🗳️ <strong>Ontario Municipal Elections 2026</strong> — Candidates declare May 2026 —{" "}
              <a href="#pricing" className="underline font-semibold hover:no-underline" onClick={() => setBannerDismissed(false)}>
                Launch your campaign today →
              </a>
            </p>
            <button onClick={() => setBannerDismissed(true)} className="text-white/70 hover:text-white flex-shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Nav ── */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-200 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-white"}`}>
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Vote className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">Poll City</span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
            <Btn href="/login" size="sm">Start Free Trial</Btn>
          </div>

          <button className="md:hidden p-2 text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-5 flex flex-col gap-4">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t">
              <Link href="/login" className="text-sm font-medium text-gray-600 text-center py-2">Login</Link>
              <Btn href="/login" className="w-full justify-center">Start Free Trial</Btn>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 text-white pt-20 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
              <Zap className="w-3.5 h-3.5" />
              Declarations open May 2026 — get your campaign ready today
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.07] tracking-tight mb-6">
              The Complete Political<br />
              <span className="text-blue-200">Operating System</span>
            </h1>
            <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Voter CRM, canvassing tools, GOTV engine, print marketplace, and a public candidate page
              — everything your Ontario campaign needs, in one platform. Built in Canada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
              <Btn href="/login" size="lg" variant="white">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Btn>
              <button className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold rounded-lg border border-white/30 text-white hover:bg-white/10 transition-all">
                <Play className="w-4 h-4 fill-current" />
                Watch Demo
              </button>
            </div>
            <p className="text-xs text-blue-300">No credit card required · Cancel any time · Canadian data residency</p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-5 mt-8 pt-8 border-t border-white/10">
              {TRUST_BADGES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                  <Icon className="w-4 h-4 text-blue-300" /> {text}
                </div>
              ))}
            </div>
          </div>

          <DashboardMockup />
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Stop duct-taping your campaign together</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Most campaigns cobble together spreadsheets, WhatsApp threads, and generic tools that
              weren't built for politics. There's a better way.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-red-100 p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h3 className="font-semibold text-gray-900">The old way</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Voter lists scattered across spreadsheets",
                  "Canvassers texting updates into a group chat",
                  "No idea which supporters have actually voted",
                  "Print quotes take days of phone calls",
                  "$5,000+ for a campaign website that just sits there",
                  "Volunteer sign-ups arrive by email and get lost",
                  "Election day is chaos — no real-time picture",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-500">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-green-100 p-8 relative">
              <div className="absolute -top-3 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Poll City</div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">The Poll City way</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Centralised voter CRM — every contact, every note",
                  "Live canvassing map with real-time field sync",
                  "GOTV engine auto-matches voted list to your supporters",
                  "Print bids in your inbox within 24 hours",
                  "Professional candidate page live in 10 minutes",
                  "Volunteer sign-ups land directly in your CRM",
                  "Real-time election day dashboard — total visibility",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Cards ── */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Full platform</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Four products. One login. Zero chaos.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every module is built for how Ontario campaigns actually work — from nomination day
              to election night.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PRODUCTS.map((product) => {
              const c = COLOUR_MAP[product.colour];
              const Icon = product.icon;
              return (
                <div key={product.title} className={`rounded-2xl border ${c.border} bg-white p-8 hover:shadow-lg transition-shadow flex flex-col`}>
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{product.badge}</span>
                      <h3 className="font-bold text-xl text-gray-900 mt-1">{product.title}</h3>
                      <p className={`text-sm font-medium ${c.text}`}>{product.tagline}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{product.description}</p>
                  <ul className="space-y-2 flex-1">
                    {product.features.map((f) => <FeatureCheck key={f}>{f}</FeatureCheck>)}
                  </ul>
                  <div className="mt-6 pt-5 border-t">
                    <Btn href="/login" variant="outline" size="sm">Learn more <ArrowRight className="w-3.5 h-3.5" /></Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Pricing</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-6">
              No hidden fees. No voter-data upsells. Pay for the plan that fits your race.
            </p>
            <div className="inline-flex items-center gap-3">
              <span className={`text-sm font-medium ${!annualBilling ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
              <button
                onClick={() => setAnnualBilling(!annualBilling)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annualBilling ? "bg-blue-600" : "bg-gray-300"}`}
                aria-label="Toggle annual billing"
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${annualBilling ? "translate-x-7" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm font-medium ${annualBilling ? "text-gray-900" : "text-gray-400"}`}>
                Annual <span className="text-green-600 font-semibold">save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => {
              const displayPrice = plan.price && annualBilling ? Math.round(plan.price * 0.8) : plan.price;
              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl flex flex-col p-6 relative ${
                    plan.highlight
                      ? "bg-blue-600 text-white border-2 border-blue-500 shadow-xl lg:scale-[1.03]"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                      Most popular
                    </div>
                  )}
                  <h3 className={`font-bold text-base mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-2">
                    {displayPrice ? (
                      <>
                        <span className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>${displayPrice}</span>
                        <span className={`text-sm mb-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>{plan.label}</span>
                      </>
                    ) : (
                      <span className={`text-lg font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>{plan.label}</span>
                    )}
                  </div>
                  <p className={`text-xs mb-5 leading-relaxed min-h-[3rem] ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>{plan.description}</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-xs ${plan.highlight ? "text-blue-100" : "text-gray-600"}`}>
                        <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-blue-200" : "text-green-500"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      plan.highlight ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            All paid plans include a 14-day free trial. No credit card required. Prices in CAD. HST not included.
          </p>
        </div>
      </section>

      {/* ── Dashboard Roles ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-block bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Role-based access</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">The right view for every role on your team</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              One login. Every person on your team — from the campaign manager to the volunteer
              canvasser to the print buyer — sees exactly what they need, nothing they don't.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Monitor,
                colour: "blue",
                title: "Campaign Manager",
                description: "Full platform visibility. Analytics, team management, broadcasts, billing, and strategic reporting.",
                perms: ["All modules", "Team & roles", "Broadcast messages", "Reports & export"],
              },
              {
                icon: Smartphone,
                colour: "green",
                title: "Canvasser",
                description: "Mobile walk lists and contact capture. No sensitive data — just what's needed to knock doors.",
                perms: ["Assigned walk lists", "Contact entry", "Support tracking", "Field map"],
              },
              {
                icon: Globe,
                colour: "purple",
                title: "Social Voter",
                description: "Discover local candidates, vote in polls, ask questions, and opt in to notifications.",
                perms: ["Candidate pages", "Voter polls", "Q&A threads", "Push notifications"],
              },
              {
                icon: Printer,
                colour: "orange",
                title: "Print Buyer",
                description: "Submit jobs, review bids, approve proofs, and track delivery — without touching voter data.",
                perms: ["Job creation", "Bid review", "Proof approvals", "Delivery tracking"],
              },
            ].map(({ icon: Icon, colour, title, description, perms }) => {
              const c = COLOUR_MAP[colour];
              return (
                <div key={title} className={`border ${c.border} rounded-2xl p-6 hover:shadow-md transition-shadow`}>
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{description}</p>
                  <ul className="space-y-1.5">
                    {perms.map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Replace Campaign Website ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-green-500/20 text-green-300 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-green-500/30">
                Replaces your $5,000 website
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Replace your $5,000 campaign website for $199/month
              </h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                A custom campaign website runs $3,000–$8,000 to build and sits there doing nothing.
                Your Poll City candidate page does everything a website does — and more. It's live in
                10 minutes, connected to your CRM, and costs less than a coffee per day.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Custom domain: votegeorge.ca or yourname.poll.city",
                  "Volunteer signups → directly into your CRM",
                  "Lawn sign requests → directly into your sign list",
                  "Embedded voter polls and live supporter counter",
                  "Bio, photo, platform, issues, and social links",
                  "SEO-optimised and mobile-first",
                  "Live in under 10 minutes. No developer. No design skills.",
                ].map((item) => <FeatureCheck key={item} dark>{item}</FeatureCheck>)}
              </ul>
              <Btn href="/login" size="lg" variant="white">
                Launch your page free <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
            <CandidatePageMockup />
          </div>
        </div>
      </section>

      {/* ── Push Notifications ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Phone mockup */}
            <div className="flex justify-center order-last md:order-first">
              <div className="w-64">
                <div className="rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl">
                  <div className="rounded-[2rem] bg-white overflow-hidden">
                    <div className="bg-gray-50 flex items-center justify-between px-5 py-2">
                      <span className="text-xs text-gray-500 font-medium">9:41</span>
                      <div className="flex gap-0.5 items-end">
                        {[3, 3.5, 4, 4.5].map((h, i) => (
                          <div key={i} className={`w-1 rounded-sm ${i < 3 ? "bg-gray-700" : "bg-gray-300"}`} style={{ height: h * 4 }} />
                        ))}
                      </div>
                    </div>
                    <div className="p-3 space-y-2 bg-gray-100">
                      {[
                        { title: "🗳️ Election Day!", body: "Polls close at 8 PM. Your station: Copps Coliseum, 101 York Blvd. Have you voted?", time: "9:00 AM", colour: "bg-blue-500" },
                        { title: "⏰ 3 Hours Left", body: "Polls close at 8 PM tonight. Don't forget to vote for George Hatzis, Ward 7!", time: "5:00 PM", colour: "bg-red-500" },
                        { title: "📣 GOTV Alert", body: "We're getting out the vote! Can you remind 5 friends? Share your voting selfie!", time: "6:15 PM", colour: "bg-green-500" },
                      ].map((n) => (
                        <div key={n.title} className="bg-white rounded-xl p-3 shadow-sm flex gap-3">
                          <div className={`w-8 h-8 rounded-lg ${n.colour} flex items-center justify-center flex-shrink-0`}>
                            <Bell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-800">{n.title}</span>
                              <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{n.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-block bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full mb-5">
                Election Day Push Notifications
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Send election day reminders to every supporter — one button, 5,000 voters reminded where to vote
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Supporters opt in with one tap on your candidate page. On election day, broadcast
                targeted push notifications at exactly the right moment — polling station locations,
                closing time reminders, and final GOTV pushes.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "One-tap opt-in from your candidate page",
                  "Targeted by ward, support level, or segment",
                  "Scheduled election-day reminder sequences",
                  "Delivery receipts and open-rate analytics",
                  "Works on iOS, Android, and desktop browsers",
                  "CASL-compliant consent and opt-out",
                ].map((item) => <FeatureCheck key={item}>{item}</FeatureCheck>)}
              </ul>
              <Btn href="/login" size="lg">
                Start collecting opt-ins <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How Poll City works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Whether you're running a campaign or exercising your vote, Poll City has you covered.</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white border rounded-lg p-1 gap-1 shadow-sm">
              {(["campaign", "voter"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoleTab(tab)}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                    roleTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "campaign" ? (
                    <><Target className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />For Campaigns</>
                  ) : (
                    <><Vote className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />For Voters</>
                  )}
                </button>
              ))}
            </div>
          </div>

          {roleTab === "campaign" && (
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: Building2,
                  title: "Set up your campaign",
                  body: "Create your campaign profile, add team members with the right roles, and import your existing contact list. You're ready to canvass in under an hour.",
                },
                {
                  step: "02",
                  icon: MapPin,
                  title: "Build your voter database",
                  body: "Go door-to-door with the mobile canvassing app. Capture support levels, issues, and follow-up notes at every door. Your manager sees coverage in real time.",
                },
                {
                  step: "03",
                  icon: Vote,
                  title: "Win election day with GOTV",
                  body: "Upload the voted list, auto-match it to your supporters, and direct your volunteers to the right doors in real time. Every vote counts — find the ones still out.",
                },
              ].map(({ step, icon: Icon, title, body }) => (
                <div key={step} className="bg-white rounded-2xl border p-7 relative">
                  <div className="text-4xl font-black text-blue-100 mb-3">{step}</div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          )}

          {roleTab === "voter" && (
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: Globe,
                  title: "Discover your local candidates",
                  body: "Browse verified candidate pages for every race in your ward — school board, city council, mayor, and more. Compare platforms side by side.",
                },
                {
                  step: "02",
                  icon: MessageSquare,
                  title: "Engage on the issues",
                  body: "Ask candidates questions directly. Participate in live voter polls on the issues that matter in your community. See how candidates respond.",
                },
                {
                  step: "03",
                  icon: Bell,
                  title: "Stay informed and vote",
                  body: "Subscribe for election day reminders. Get your polling station details, voting hours, and a reminder when polls close. Democracy is easier with Poll City.",
                },
              ].map(({ step, icon: Icon, title, body }) => (
                <div key={step} className="bg-white rounded-2xl border p-7">
                  <div className="text-4xl font-black text-purple-100 mb-3">{step}</div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">What campaigns are saying</h2>
            <div className="flex justify-center gap-0.5 mt-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              <span className="text-sm text-gray-500 ml-2 self-center">5.0 from 40+ campaigns</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 border rounded-2xl p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm mb-5 leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{t.initials}</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog ── */}
      <section id="blog" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">Campaign Playbook</div>
              <h2 className="text-2xl font-bold text-gray-900">Tactics and research for Ontario candidates</h2>
            </div>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 hidden sm:flex">
              All posts <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => {
              const Icon = post.icon;
              return (
                <div key={post.title} className="bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                    <Icon className="w-14 h-14 text-blue-200" />
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{post.tag}</span>
                    <h3 className="font-semibold text-gray-900 text-sm mt-1.5 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{post.excerpt}</p>
                    <span className="text-xs text-gray-400">{post.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="container mx-auto max-w-2xl text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Vote className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Declarations open May 2026.<br />Get your campaign ready today.
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            The campaigns that win start building their voter database before the writ drops.
            Start your free trial and be ready when declarations open.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Btn href="/login" size="lg" variant="white">
              Start Free Trial — no card needed <ArrowRight className="w-4 h-4" />
            </Btn>
            <Btn href="#pricing" size="lg" className="border border-white/30 text-white hover:bg-white/10 bg-transparent inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all px-7 py-3.5 text-base">
              Compare plans
            </Btn>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-blue-300">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />14-day free trial</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Cancel any time</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />PIPEDA compliant</span>
            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 fill-current" />Made in Canada</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="about" className="bg-gray-950 text-gray-400">
        <div className="container mx-auto px-4 pt-16 pb-10 max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Vote className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white text-lg">Poll City</span>
              </div>
              <p className="text-sm leading-relaxed mb-5 max-w-xs">
                The complete political operating system for Ontario municipal campaigns.
                Built by Canadians, hosted in Canada, compliant with PIPEDA.
              </p>
              <div className="flex gap-2 mb-5">
                {[Twitter, Linkedin, Facebook].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-2 text-xs">
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
              <ul className="space-y-3 text-sm">
                {["Poll City Platform", "Poll City Social", "Poll City Print", "Candidate Public Page", "Push Notifications", "GOTV Engine"].map((item) => (
                  <li key={item}><a href="#features" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: "About", href: "#about" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Blog", href: "#blog" },
                  { label: "Candidates", href: "/candidates" },
                  { label: "Print Shops", href: "/print/shops" },
                  { label: "Contact", href: "mailto:hello@poll.city" },
                  { label: "Careers", href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal & Trust</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Security", href: "#" },
                  { label: "PIPEDA Compliance", href: "#" },
                  { label: "Data Residency", href: "#" },
                  { label: "Accessibility", href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Poll City Inc. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Made in Canada 🍁 · Toronto, Ontario</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
