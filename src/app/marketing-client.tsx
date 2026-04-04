"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle, Menu, X, ArrowRight, Shield, Lock, MapPin, Users,
  BarChart3, Bell, Printer, Star, Zap, Vote, Globe, ChevronRight,
  Check, Phone, Mail, Building2, Smartphone, Monitor, AlertCircle,
  FileText, Target, MessageSquare, ClipboardList, Megaphone, Database,
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
  variant?: "primary" | "outline" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2";
  const sizes = { sm: "px-3.5 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
    ghost: "text-blue-600 hover:bg-blue-50",
    white: "bg-white text-blue-700 hover:bg-blue-50 shadow-sm",
  };
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

function FeatureCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600">
      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

/* ─── Dashboard mockup ────────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
      {/* Browser chrome */}
      <div className="bg-gray-100 border-b flex items-center gap-2 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded text-xs text-gray-400 px-3 py-1 text-center truncate">
          app.poll.city/dashboard
        </div>
      </div>
      {/* App layout */}
      <div className="flex" style={{ height: 280 }}>
        {/* Sidebar */}
        <div className="w-14 bg-blue-700 flex flex-col items-center py-4 gap-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-white/20" />
          {[Users, MapPin, BarChart3, Printer, Bell].map((Icon, i) => (
            <Icon key={i} className={`w-5 h-5 ${i === 0 ? "text-white" : "text-blue-300"}`} />
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="h-3 bg-gray-800 rounded w-28 mb-1" />
              <div className="h-2 bg-gray-300 rounded w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-16 bg-blue-600 rounded-lg" />
              <div className="h-7 w-20 bg-white border rounded-lg" />
            </div>
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Supporters", val: "2,847", colour: "blue" },
              { label: "Doors Knocked", val: "8,120", colour: "green" },
              { label: "Signs Out", val: "341", colour: "purple" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg p-3 border">
                <div className={`text-lg font-bold text-${s.colour}-600`}>{s.val}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Table rows */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {["Margaret Liu", "Robert Chen", "Priya Patel"].map((name, i) => (
              <div key={name} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? "border-t" : ""}`}>
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  {name[0]}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-700 rounded w-24" />
                </div>
                <div className="h-4 w-12 rounded-full bg-green-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/candidates", label: "Candidates" },
];

const PRODUCTS = [
  {
    icon: Users,
    title: "Voter CRM",
    colour: "blue",
    tagline: "Know every voter. Win every ward.",
    features: [
      "Support level tracking (1–5 scale)",
      "Issue tagging & contact notes",
      "Household and neighbour linking",
      "Custom fields and import from CSV",
      "Full activity timeline per contact",
    ],
  },
  {
    icon: MapPin,
    title: "Canvassing",
    colour: "green",
    tagline: "Put your volunteers on the right doors.",
    features: [
      "Auto-generated walk lists by street",
      "Mobile-optimised field data capture",
      "Real-time team coverage map",
      "Offline mode — syncs when back online",
      "Script prompts per door",
    ],
  },
  {
    icon: BarChart3,
    title: "GOTV Engine",
    colour: "purple",
    tagline: "Turn out the vote on election day.",
    features: [
      "Upload same-day voted list (CSV)",
      "Auto-match against your supporter list",
      "Identify strong supporters still out",
      "Live team priority queue",
      "Day-of analytics dashboard",
    ],
  },
  {
    icon: Printer,
    title: "Print Marketplace",
    colour: "orange",
    tagline: "Great materials. Competitive prices.",
    features: [
      "Post a job in under 2 minutes",
      "Receive bids from verified Ontario shops",
      "Door hangers, lawn signs, flyers, mailers",
      "Compare price, turnaround, and samples",
      "Reorder previous jobs with one click",
    ],
  },
  {
    icon: Globe,
    title: "Candidate Page",
    colour: "teal",
    tagline: "Your campaign on the web. Instantly.",
    features: [
      "Public profile with bio and platform",
      "Volunteer signup & sign request forms",
      "Embedded voter polls",
      "Shareable link — no website needed",
      "Supporter pledge counter",
    ],
  },
  {
    icon: Bell,
    title: "Push Notifications",
    colour: "rose",
    tagline: "Reach supporters on election day.",
    features: [
      "One-tap subscribe for supporters",
      "Targeted broadcast messages",
      "Election-day GOTV reminders",
      "Event and canvass night alerts",
      "Delivery receipts and open rates",
    ],
  },
];

const COLOUR_MAP: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", pill: "bg-blue-100 text-blue-700" },
  green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100", pill: "bg-green-100 text-green-700" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", pill: "bg-purple-100 text-purple-700" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", pill: "bg-orange-100 text-orange-700" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100", pill: "bg-teal-100 text-teal-700" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", pill: "bg-rose-100 text-rose-700" },
};

const PLANS = [
  {
    name: "Starter",
    price: 0,
    period: "forever",
    description: "For exploratory candidates and first-time campaigns.",
    features: ["Up to 250 contacts", "Candidate public page", "Basic canvassing", "1 user"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Campaign",
    price: 79,
    period: "/ month",
    description: "The complete toolkit for a serious local campaign.",
    features: [
      "Up to 5,000 contacts",
      "Unlimited canvassing",
      "GOTV engine",
      "Print marketplace access",
      "Push notifications (1,000 subscribers)",
      "Up to 5 team members",
      "Priority email support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Campaign Pro",
    price: 149,
    period: "/ month",
    description: "For larger campaigns running across multiple wards.",
    features: [
      "Up to 25,000 contacts",
      "Advanced GOTV analytics",
      "Push notifications (5,000 subscribers)",
      "Up to 15 team members",
      "Role-based access control",
      "CSV export",
      "Dedicated support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "City-Wide",
    price: 299,
    period: "/ month",
    description: "For mayoral races, school boards, and county campaigns.",
    features: [
      "Unlimited contacts",
      "Multi-ward management",
      "Unlimited push subscribers",
      "Unlimited team members",
      "Custom fields & tags",
      "API access",
      "White-glove onboarding",
    ],
    cta: "Contact sales",
    highlight: false,
  },
  {
    name: "Party / Slate",
    price: null,
    period: "",
    description: "Co-ordinated campaigns under one roof. Custom pricing.",
    features: [
      "Multiple campaigns under one org",
      "Shared volunteer pool",
      "Consolidated reporting",
      "SSO & advanced permissions",
      "Dedicated account manager",
      "SLA-backed support",
    ],
    cta: "Talk to us",
    highlight: false,
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
  },
  {
    tag: "Canvassing",
    title: "Door-Knocking in the Digital Age: What the Data Says About Contact Rates",
    excerpt: "An analysis of 40,000 canvass contacts reveals the best days, times, and scripts for building genuine supporter relationships.",
    date: "February 2026",
  },
  {
    tag: "Technology",
    title: "Why Campaign Websites Alone Are Not Enough in 2026",
    excerpt: "A candidate page without CRM behind it is just a brochure. Here's how integrated platforms change the outcome math.",
    date: "January 2026",
  },
];

const HOW_CAMPAIGNS = [
  { step: "01", title: "Set up your campaign", body: "Create your campaign profile, add team members with role-based access, and import your existing contact list via CSV." },
  { step: "02", title: "Build your voter database", body: "Go door-to-door with the mobile canvassing app. Capture support levels, issues, and follow-up notes at every door." },
  { step: "03", title: "Publish your candidate page", body: "Launch your public page in minutes. Collect volunteer sign-ups, sign requests, and supporter pledges automatically." },
  { step: "04", title: "Win election day with GOTV", body: "Upload the voted list, identify strong supporters still out, and direct your team to the right doors in real time." },
];

const HOW_VOTERS = [
  { icon: Vote, title: "Discover local candidates", body: "Browse verified candidate pages for every race in your ward — school board, council, mayor, and more." },
  { icon: MessageSquare, title: "Ask questions and take polls", body: "Engage directly with candidates on the issues that matter to you. Participate in live voter polls on each candidate page." },
  { icon: Bell, title: "Get election day reminders", body: "Subscribe with one tap. Receive reminders about voting hours, your polling station, and last-minute candidate updates." },
  { icon: ClipboardList, title: "Track commitments", body: "See what candidates have promised and how they vote once elected. Democracy works better with accountability." },
];

const TRUST_BADGES = [
  { icon: Shield, text: "MFIPPA Compliant" },
  { icon: Lock, text: "End-to-end encryption" },
  { icon: Database, text: "Data stays in Canada" },
  { icon: FileText, text: "Full audit logs" },
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
        <div className="bg-gradient-to-r from-red-700 to-red-600 text-white">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Ontario Municipal Election 2026</strong> — early access pricing available now.{" "}
                <a href="#pricing" className="underline font-medium hover:no-underline">Lock in your rate →</a>
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-white/70 hover:text-white flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Nav ── */}
      <header className={`sticky top-0 z-50 border-b transition-all ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-white"}`}>
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Vote className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">Poll City</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
            <Btn href="/login" size="sm">Get started free</Btn>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Link href="/login" className="text-sm font-medium text-gray-600 text-center py-2">Sign in</Link>
              <Btn href="/login" className="w-full justify-center">Get started free</Btn>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-blue-700 via-blue-600 to-blue-500 text-white pt-20 pb-28 px-4 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/40 text-blue-100 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-400/30">
              <Zap className="w-3.5 h-3.5" /> Trusted by campaigns across Ontario
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6">
              The Complete Political<br className="hidden sm:block" />
              <span className="text-blue-200"> Operating System</span>
            </h1>
            <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Voter CRM, canvassing tools, GOTV engine, print marketplace, and a public
              candidate page — everything your campaign needs, in one platform built for Ontario.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Btn href="/login" size="lg" variant="white">
                Start your free trial <ArrowRight className="w-4 h-4" />
              </Btn>
              <Btn href="#features" size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent">
                See all features
              </Btn>
            </div>
            <p className="text-xs text-blue-200">No credit card required · 14-day free trial · Cancel any time</p>
          </div>

          {/* Dashboard mockup */}
          <DashboardMockup />

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {TRUST_BADGES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                <Icon className="w-4 h-4" /> {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Stop duct-taping your campaign together</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Most campaigns cobble together spreadsheets, WhatsApp groups, and generic CRMs that weren't
              built for politics. There's a better way.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Without */}
            <div className="bg-white rounded-2xl border border-red-100 p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Without Poll City</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Voter lists scattered across spreadsheets",
                  "Canvassers texting in updates manually",
                  "No idea which supporters voted yet",
                  "Printing quotes take days of phone calls",
                  "Campaign website requires a developer",
                  "Data scattered, no single source of truth",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-500">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* With */}
            <div className="bg-white rounded-2xl border border-green-100 p-8 relative">
              <div className="absolute -top-3 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Poll City</div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
                <h3 className="font-semibold text-gray-900">With Poll City</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Centralised voter CRM with full history",
                  "Live canvassing map with real-time sync",
                  "GOTV engine auto-matches voted list",
                  "Print bids in your inbox within 24 hours",
                  "Candidate page live in under 10 minutes",
                  "One platform. One login. One source of truth.",
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
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Full platform</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Six tools. One login. Zero chaos.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every module is built for how Ontario municipal campaigns actually work — from first
              canvass to election night.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.map((product) => {
              const c = COLOUR_MAP[product.colour];
              const Icon = product.icon;
              return (
                <div key={product.title} className={`rounded-2xl border ${c.border} bg-white p-7 hover:shadow-lg transition-shadow flex flex-col`}>
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{product.title}</h3>
                  <p className={`text-sm font-medium ${c.text} mb-4`}>{product.tagline}</p>
                  <ul className="space-y-2 flex-1">
                    {product.features.map((f) => <FeatureCheck key={f}>{f}</FeatureCheck>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Replace Your Campaign Website ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-blue-500/30">
                Candidate public page
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Replace your campaign website. Seriously.
              </h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Your Poll City candidate page does everything a campaign website does — and more.
                It's automatically indexed, mobile-first, and connected to your CRM. When someone
                signs up to volunteer, they're in your database instantly.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Custom domain support (yourname.poll.city)",
                  "Volunteer and sign request capture → CRM",
                  "Live voter polls embedded on your page",
                  "Bio, platform, contact info, and social links",
                  "Supporter pledge counter and progress bar",
                  "Zero design skills required",
                ].map((item) => <FeatureCheck key={item}>{item}</FeatureCheck>)}
              </ul>
              <Btn href="/login" size="lg" variant="white">
                Launch your page free <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 p-1 backdrop-blur">
              <div className="rounded-xl bg-white overflow-hidden">
                <div className="bg-blue-600 py-8 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-white mx-auto mb-3 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">JD</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Jane Doe</h3>
                  <p className="text-blue-200 text-sm">Candidate for Ward 7 · Hamilton City Council</p>
                </div>
                <div className="p-5 text-gray-700 text-sm">
                  <p className="mb-4 text-gray-500 text-xs">Lifelong Hamilton resident. Fighting for safer streets, affordable housing, and community recreation.</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { val: "1,247", label: "Supporters" },
                      { val: "89", label: "Volunteers" },
                      { val: "341", label: "Signs Out" },
                      { val: "5", label: "Days Left" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="font-bold text-blue-600 text-base">{s.val}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg">Volunteer</button>
                    <button className="flex-1 border text-xs font-semibold py-2 rounded-lg text-gray-600">Request a Sign</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Election Day Push Notifications ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Phone mockup */}
            <div className="order-last md:order-first flex justify-center">
              <div className="relative w-64">
                <div className="rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl">
                  <div className="rounded-[2rem] bg-white overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-gray-50 flex items-center justify-between px-5 py-2">
                      <span className="text-xs text-gray-500 font-medium">9:41</span>
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`w-1 rounded-sm ${i < 3 ? "bg-gray-700 h-2.5" : "bg-gray-300 h-2.5"}`} />
                        ))}
                      </div>
                    </div>
                    {/* Notifications */}
                    <div className="p-3 space-y-2 bg-gray-100">
                      {[
                        { title: "Election Day!", body: "Polls close in 6 hours. Your polling station: Copps Coliseum, 101 York Blvd.", time: "9:00 AM", colour: "bg-blue-500" },
                        { title: "GOTV Alert", body: "Your polling station closes at 8 PM. Have you voted yet? Tap to confirm.", time: "5:00 PM", colour: "bg-red-500" },
                        { title: "Thank you!", body: "Jane Doe is ahead! Help push across the finish line — can you phone-bank tonight?", time: "7:15 PM", colour: "bg-green-500" },
                      ].map((n) => (
                        <div key={n.title} className="bg-white rounded-xl p-3 shadow-sm flex gap-3">
                          <div className={`w-8 h-8 rounded-lg ${n.colour} flex items-center justify-center flex-shrink-0`}>
                            <Bell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-gray-800 truncate">{n.title}</span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{n.time}</span>
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
                Push Notifications
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Reach supporters directly on election day
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                When every vote counts, direct communication wins races. Supporters opt in with one tap
                on your candidate page, and you can broadcast targeted push notifications at exactly
                the right moment.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "One-tap opt-in from your candidate page",
                  "Send targeted broadcasts by ward, support level, or segment",
                  "Scheduled election-day reminder sequences",
                  "Delivery receipts and open-rate analytics",
                  "Works on iOS, Android, and desktop browsers",
                ].map((item) => <FeatureCheck key={item}>{item}</FeatureCheck>)}
              </ul>
              <Btn href="/login" size="lg">
                Start sending notifications <ArrowRight className="w-4 h-4" />
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for campaigns and voters alike</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Poll City connects the team running the campaign with the voters they're trying to reach.
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white border rounded-lg p-1 gap-1">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_CAMPAIGNS.map(({ step, title, body }) => (
                <div key={step} className="bg-white rounded-2xl border p-6">
                  <div className="text-3xl font-black text-blue-100 mb-3">{step}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          )}

          {roleTab === "voter" && (
            <div className="grid sm:grid-cols-2 gap-6">
              {HOW_VOTERS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-white rounded-2xl border p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Dashboard Role Showcase ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">The right tools for every role on your team</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From the candidate to the volunteer to the print coordinator — Poll City gives
              everyone the access they need, nothing they don't.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Monitor,
                title: "Candidate / Manager",
                description: "Full dashboard access — overview analytics, team management, broadcast messages, and strategic reports.",
                perms: ["All modules", "Team management", "Broadcast notifications", "Export & billing"],
              },
              {
                icon: Smartphone,
                title: "Canvasser / Volunteer",
                description: "Mobile-optimised walk list and contact capture. No sensitive data — just the info needed to knock doors effectively.",
                perms: ["Assigned walk lists", "Contact data entry", "Support level capture", "Real-time map"],
              },
              {
                icon: Building2,
                title: "Print Coordinator",
                description: "Submit and manage print jobs, review bids, approve proofs, and track delivery — without touching voter data.",
                perms: ["Print job creation", "Bid review", "Proof approvals", "Delivery tracking"],
              },
            ].map(({ icon: Icon, title, description, perms }) => (
              <div key={title} className="border rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{description}</p>
                <ul className="space-y-1.5">
                  {perms.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
              No surprise fees. No voter-data upsells. Just the tools your campaign needs at a price
              that fits your ward.
            </p>
            {/* Annual toggle */}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {PLANS.map((plan) => {
              const monthly = plan.price ? (annualBilling ? Math.round(plan.price * 0.8) : plan.price) : null;
              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl border flex flex-col p-6 relative ${
                    plan.highlight
                      ? "border-blue-500 bg-blue-600 text-white shadow-xl scale-[1.02]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Most popular
                    </div>
                  )}
                  <h3 className={`font-bold text-base mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-2">
                    {monthly !== null ? (
                      <>
                        <span className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>${monthly}</span>
                        <span className={`text-sm mb-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>{plan.period}</span>
                      </>
                    ) : (
                      <span className={`text-lg font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>Custom</span>
                    )}
                  </div>
                  <p className={`text-xs mb-5 leading-relaxed ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>{plan.description}</p>
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
                      plan.highlight
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            All paid plans include a 14-day free trial. No credit card required. HST not included.
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What campaigns are saying</h2>
            <div className="flex justify-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-sm text-gray-500 ml-2 self-center">5.0 from 40+ campaigns</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 border rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-5 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {t.initials}
                  </div>
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

      {/* ── Blog Preview ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Campaign playbook</h2>
              <p className="text-gray-500 text-sm mt-1">Tactics and research for Ontario candidates</p>
            </div>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
              All posts <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <div key={post.title} className="bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
                <div className="h-36 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <Megaphone className="w-12 h-12 text-blue-300" />
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{post.tag}</span>
                  <h3 className="font-semibold text-gray-900 text-sm mt-1.5 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{post.excerpt}</p>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-700 to-blue-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto max-w-3xl text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 border border-white/20">
            <Vote className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Ready to run a smarter campaign?
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Ontario candidates who use Poll City to organise their teams,
            track supporters, and win elections. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Btn href="/login" size="lg" variant="white">
              Start free trial — no card needed <ArrowRight className="w-4 h-4" />
            </Btn>
            <Btn href="#pricing" size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent">
              Compare plans
            </Btn>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-blue-300 mt-2">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />14-day free trial</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Cancel any time</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Data stays in Canada</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Vote className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white text-lg">Poll City</span>
              </div>
              <p className="text-sm leading-relaxed mb-5">
                The complete political operating system for Ontario municipal campaigns.
                Built by Canadians. Hosted in Canada.
              </p>
              <div className="flex gap-3">
                {[Mail, Phone].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                {["Voter CRM", "Canvassing", "GOTV Engine", "Print Marketplace", "Candidate Page", "Push Notifications"].map((item) => (
                  <li key={item}><a href="#features" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: "About", href: "/about" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Blog", href: "#blog" },
                  { label: "Candidates", href: "/candidates" },
                  { label: "Print Shops", href: "/print/shops" },
                  { label: "Contact", href: "mailto:hello@poll.city" },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Legal / Trust */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Trust & Legal</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Security", href: "/security" },
                  { label: "MFIPPA Compliance", href: "/compliance" },
                  { label: "Data Residency", href: "/data-residency" },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Poll City Inc. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-red-600" />
              <span>Made in Canada 🍁</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
