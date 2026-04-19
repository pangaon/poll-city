"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Check, ArrowRight, Shield, Globe, ChevronDown, ChevronRight,
  Star, Crown, CheckCircle2, Lock, Zap, Users, Target,
  Vote, MapPin, Building2, ArrowLeft, ExternalLink, Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 — ROLE
   ═══════════════════════════════════════════════════════════════════════════ */

type Role = "trustee" | "councillor" | "mayor" | "regional" | "mpp" | "mp";

interface RoleOption {
  id: Role;
  label: string;
  office: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  level: "municipal" | "provincial" | "federal";
}

const ROLES: RoleOption[] = [
  { id: "trustee", label: "School Board Trustee", office: "School Board", desc: "Education board ward race", color: "#059669", icon: Building2, level: "municipal" },
  { id: "councillor", label: "City Councillor", office: "City Council", desc: "Municipal ward or at-large seat", color: "#2563EB", icon: Users, level: "municipal" },
  { id: "mayor", label: "Mayor", office: "Mayor's Office", desc: "City-wide municipal campaign", color: "#D97706", icon: Crown, level: "municipal" },
  { id: "regional", label: "Regional Councillor", office: "Regional Council", desc: "Upper-tier regional government", color: "#7C3AED", icon: MapPin, level: "municipal" },
  { id: "mpp", label: "MPP", office: "Queen's Park", desc: "Ontario provincial riding", color: "#DC2626", icon: Vote, level: "provincial" },
  { id: "mp", label: "MP", office: "Parliament", desc: "Federal constituency", color: "#0F172A", icon: Target, level: "federal" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 — LOCATION (Ontario municipalities / ridings)
   ═══════════════════════════════════════════════════════════════════════════ */

interface Location {
  id: string;
  name: string;
  region: string;
  population: number;
  wards?: number;
  tier: "small" | "medium" | "large";
}

// Ontario municipalities and ridings seeded for pricing
const MUNICIPAL_LOCATIONS: Location[] = [
  // Small (under 30K)
  { id: "pelham", name: "Pelham", region: "Niagara", population: 18000, wards: 3, tier: "small" },
  { id: "lincoln", name: "Lincoln", region: "Niagara", population: 25000, wards: 4, tier: "small" },
  { id: "grimsby", name: "Grimsby", region: "Niagara", population: 28000, wards: 4, tier: "small" },
  { id: "innisfil", name: "Innisfil", region: "Simcoe", population: 42000, wards: 4, tier: "small" },
  { id: "cobourg", name: "Cobourg", region: "Northumberland", population: 20000, wards: 4, tier: "small" },
  { id: "midland", name: "Midland", region: "Simcoe", population: 17000, wards: 4, tier: "small" },
  { id: "collingwood", name: "Collingwood", region: "Simcoe", population: 24000, wards: 0, tier: "small" },
  { id: "orangeville", name: "Orangeville", region: "Dufferin", population: 30000, wards: 0, tier: "small" },
  // Medium (30K–150K)
  { id: "stcatharines", name: "St. Catharines", region: "Niagara", population: 136000, wards: 6, tier: "medium" },
  { id: "barrie", name: "Barrie", region: "Simcoe", population: 154000, wards: 10, tier: "medium" },
  { id: "guelph", name: "Guelph", region: "Wellington", population: 143000, wards: 6, tier: "medium" },
  { id: "kingston", name: "Kingston", region: "Frontenac", population: 132000, wards: 12, tier: "medium" },
  { id: "whitby", name: "Whitby", region: "Durham", population: 138000, wards: 4, tier: "medium" },
  { id: "oshawa", name: "Oshawa", region: "Durham", population: 175000, wards: 5, tier: "medium" },
  { id: "burlington", name: "Burlington", region: "Halton", population: 186000, wards: 6, tier: "medium" },
  { id: "oakville", name: "Oakville", region: "Halton", population: 213000, wards: 6, tier: "medium" },
  { id: "kitchener", name: "Kitchener", region: "Waterloo", population: 270000, wards: 10, tier: "medium" },
  { id: "windsor", name: "Windsor", region: "Essex", population: 229000, wards: 10, tier: "medium" },
  { id: "london", name: "London", region: "Middlesex", population: 422000, wards: 14, tier: "medium" },
  { id: "hamilton", name: "Hamilton", region: "Hamilton", population: 569000, wards: 15, tier: "medium" },
  // Large (150K+)
  { id: "brampton", name: "Brampton", region: "Peel", population: 656000, wards: 10, tier: "large" },
  { id: "mississauga", name: "Mississauga", region: "Peel", population: 717000, wards: 11, tier: "large" },
  { id: "markham", name: "Markham", region: "York", population: 338000, wards: 8, tier: "large" },
  { id: "vaughan", name: "Vaughan", region: "York", population: 323000, wards: 5, tier: "large" },
  { id: "ottawa", name: "Ottawa", region: "Ottawa", population: 1017000, wards: 24, tier: "large" },
  { id: "toronto", name: "Toronto", region: "Toronto", population: 2794000, wards: 25, tier: "large" },
];

const PROVINCIAL_RIDINGS: Location[] = [
  { id: "niagara-centre", name: "Niagara Centre", region: "Niagara", population: 110000, tier: "medium" },
  { id: "stcatharines-riding", name: "St. Catharines", region: "Niagara", population: 115000, tier: "medium" },
  { id: "niagara-falls", name: "Niagara Falls", region: "Niagara", population: 108000, tier: "medium" },
  { id: "niagara-west", name: "Niagara West", region: "Niagara", population: 112000, tier: "medium" },
  { id: "hamilton-centre", name: "Hamilton Centre", region: "Hamilton", population: 118000, tier: "medium" },
  { id: "hamilton-mountain", name: "Hamilton Mountain", region: "Hamilton", population: 115000, tier: "medium" },
  { id: "oakville-north", name: "Oakville North—Burlington", region: "Halton", population: 125000, tier: "medium" },
  { id: "brampton-south", name: "Brampton South", region: "Peel", population: 130000, tier: "large" },
  { id: "mississauga-east", name: "Mississauga East—Cooksville", region: "Peel", population: 128000, tier: "large" },
  { id: "scarborough-centre", name: "Scarborough Centre", region: "Toronto", population: 120000, tier: "large" },
  { id: "toronto-centre", name: "Toronto Centre", region: "Toronto", population: 115000, tier: "large" },
  { id: "don-valley-east", name: "Don Valley East", region: "Toronto", population: 118000, tier: "large" },
  { id: "ottawa-south", name: "Ottawa South", region: "Ottawa", population: 122000, tier: "large" },
  { id: "kitchener-centre", name: "Kitchener Centre", region: "Waterloo", population: 112000, tier: "medium" },
  { id: "london-west", name: "London West", region: "Middlesex", population: 115000, tier: "medium" },
];

const FEDERAL_RIDINGS: Location[] = [
  { id: "niagara-centre-fed", name: "Niagara Centre", region: "Niagara", population: 102000, tier: "medium" },
  { id: "stcatharines-fed", name: "St. Catharines", region: "Niagara", population: 108000, tier: "medium" },
  { id: "hamilton-centre-fed", name: "Hamilton Centre", region: "Hamilton", population: 105000, tier: "medium" },
  { id: "burlington-fed", name: "Burlington", region: "Halton", population: 112000, tier: "medium" },
  { id: "brampton-centre-fed", name: "Brampton Centre", region: "Peel", population: 115000, tier: "large" },
  { id: "mississauga-lakeshore-fed", name: "Mississauga—Lakeshore", region: "Peel", population: 110000, tier: "large" },
  { id: "toronto-centre-fed", name: "Toronto Centre", region: "Toronto", population: 108000, tier: "large" },
  { id: "scarborough-guildwood", name: "Scarborough—Guildwood", region: "Toronto", population: 105000, tier: "large" },
  { id: "ottawa-centre-fed", name: "Ottawa Centre", region: "Ottawa", population: 110000, tier: "large" },
  { id: "kitchener-south-fed", name: "Kitchener South—Hespeler", region: "Waterloo", population: 108000, tier: "medium" },
  { id: "london-north-fed", name: "London North Centre", region: "Middlesex", population: 112000, tier: "medium" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 3 — PLANS
   ═══════════════════════════════════════════════════════════════════════════ */

interface Plan {
  id: string;
  label: string;
  tagline: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "campaign",
    label: "Campaign",
    tagline: "Everything you need from announcement to election night",
    popular: true,
    features: [
      "Campaign website — 4 layouts, custom domain",
      "Voter CRM — contacts, households, import, tags",
      "Mobile canvassing — walk lists, GPS, door scripts",
      "Email & SMS blasts — CASL compliant",
      "Adoni AI — writes content, answers questions, analyses your data",
      "GOTV engine — priority lists, ride coordination, vote tracking",
      "Donation CRM — Stripe-powered, receipts, compliance",
      "Budget & finance — expenses, reimbursements, audit trail",
      "Volunteer management — shifts, scheduling, expenses",
      "Events calendar — RSVP, reminders, candidate schedule",
      "Signs module — requests, assignments, tracking",
      "Print marketplace — templates, design engine, shop orders",
      "Forms & surveys — drag-drop builder, embed, results",
      "Live polls — all vote types, real-time results",
      "Brand kit — colours, logo, fonts",
      "Daily AI briefing — Adoni morning summary",
    ],
  },
  {
    id: "command",
    label: "Command",
    tagline: "Everything in Campaign, plus enterprise-grade tools",
    features: [
      "Everything in Campaign, plus:",
      "War room mode — live ops dashboard",
      "Election night HQ — poll-by-poll results streaming",
      "Scrutineer app — OCR result entry, tab submission",
      "Automation engine — triggered sequences across email, SMS",
      "Candidate Intelligence Engine — lead detection, outreach tracking",
      "Reputation & alert engine — media monitoring, issue response",
      "Coalition management — multi-org coordination",
      "QR capture system — events, signs, prospect funnels",
      "Field programs — multi-program analytics, route heat maps",
      "Advanced analytics — approval ratings, sentiment, benchmarks",
      "Multi-campaign support — run multiple races",
      "Dedicated account manager",
      "Priority 24/7 support",
      "White-label option",
    ],
  },
];

// Pricing by role + tier
type PricingKey = `${Role}-${Location["tier"]}`;

const MONTHLY_PRICES: Record<string, [number, number]> = { // [campaign, command]
  "trustee-small": [49, 149],
  "trustee-medium": [79, 199],
  "trustee-large": [99, 249],
  "councillor-small": [99, 299],
  "councillor-medium": [199, 499],
  "councillor-large": [349, 799],
  "mayor-small": [199, 499],
  "mayor-medium": [399, 999],
  "mayor-large": [799, 1999],
  "regional-small": [199, 499],
  "regional-medium": [349, 899],
  "regional-large": [599, 1499],
  "mpp-small": [399, 999],
  "mpp-medium": [599, 1499],
  "mpp-large": [799, 1999],
  "mp-small": [599, 1499],
  "mp-medium": [799, 1999],
  "mp-large": [1199, 2999],
};

// One-time = monthly × months remaining until election day (Oct 27 2026), minimum 1
const ELECTION_DATE = new Date("2026-10-27T00:00:00-05:00");

function monthsRemaining(): number {
  const now = new Date();
  const msLeft = ELECTION_DATE.getTime() - now.getTime();
  const months = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 30.44));
  return Math.max(1, Math.min(months, 18));
}

function getOneTimePrice(monthly: number): number {
  return monthly * monthsRemaining();
}

function electionSeasonLabel(): string {
  const m = monthsRemaining();
  if (m <= 1) return "covers final month of campaign";
  return `covers ${m} months to election day`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD-ONS
   ═══════════════════════════════════════════════════════════════════════════ */

const ADDONS = [
  {
    id: "election-day",
    label: "Election Day Mode",
    desc: "GOTV on steroids — real-time voter turnout tracking, priority call lists, ride coordination, scrutineer management, poll-by-poll results, war room dashboard. Activates 72 hours before election day.",
    monthlyPrice: 199,
    oneTimePrice: 199,
    icon: Zap,
    color: "#DC2626",
  },
  {
    id: "voter-contact",
    label: "Voter Contact Blitz",
    desc: "Unlimited SMS + email for the final 2 weeks. Voice broadcasts. Automated GOTV reminders. Phone bank tools with live call tracking.",
    monthlyPrice: 149,
    oneTimePrice: 149,
    icon: Target,
    color: "#7C3AED",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FAQs
   ═══════════════════════════════════════════════════════════════════════════ */

const FAQS = [
  { q: "Why does pricing change by location?", a: "A councillor representing 15,000 people has very different needs than one representing 150,000. We price based on the actual scale of your race so you never overpay." },
  { q: "What's the difference between monthly and one-time?", a: "Monthly gives you flexibility to cancel anytime. One-time is a single payment covering every month from today to election day (October 27, 2026) — you pay for exactly what you need, no more. No recurring charges." },
  { q: "Is the campaign website really included?", a: "Yes. Every plan includes a fully built campaign website with your branding, issues, bio, events, donation links, and forms. Point your own domain (e.g. votegeorge.ca) and nobody knows it's Poll City." },
  { q: "What is Election Day Mode?", a: "It's GOTV on steroids. Real-time voter turnout tracking, priority call lists auto-sorted, ride coordination, scrutineer management, and poll-by-poll results streaming in. Activates 72 hours before election day." },
  { q: "Can I see the campaign website before buying?", a: "Absolutely. Visit our live demo to see a fully built campaign website in action, including the website builder where you customize everything." },
  { q: "Where is my data stored?", a: "All data on Canadian servers. PIPEDA compliant. AES-256 encryption." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PricingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [billingMode, setBillingMode] = useState<"monthly" | "onetime">("monthly");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const role = ROLES.find((r) => r.id === selectedRole);

  // Get locations based on role
  const locations = useMemo(() => {
    if (!selectedRole) return [];
    if (selectedRole === "mpp") return PROVINCIAL_RIDINGS;
    if (selectedRole === "mp") return FEDERAL_RIDINGS;
    return MUNICIPAL_LOCATIONS;
  }, [selectedRole]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter((l) => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q));
  }, [locations, searchQuery]);

  // Get prices
  const prices = useMemo(() => {
    if (!selectedRole || !selectedLocation) return null;
    const key = `${selectedRole}-${selectedLocation.tier}`;
    const p = MONTHLY_PRICES[key] ?? [199, 499];
    return { campaign: p[0], command: p[1] };
  }, [selectedRole, selectedLocation]);

  function selectRole(id: Role) {
    setSelectedRole(id);
    setSelectedLocation(null);
    setSearchQuery("");
    setStep(2);
  }

  function selectLocation(loc: Location) {
    setSelectedLocation(loc);
    setStep(3);
  }

  function goBack() {
    if (step === 3) { setStep(2); setSelectedLocation(null); }
    else if (step === 2) { setStep(1); setSelectedRole(null); }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Poll City" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-bold text-slate-900">Poll City</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Explore Demo</Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Start Campaign</Link>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          {step > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}
          <div className="flex items-center gap-2 flex-1">
            {[
              { n: 1, label: "Your Role" },
              { n: 2, label: "Where" },
              { n: 3, label: "Your Plan" },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step >= s.n ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>{s.n}</span>
                <span className={`text-xs font-semibold ${step >= s.n ? "text-slate-900" : "text-slate-400"}`}>{s.label}</span>
                {s.n < 3 && <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STEP 1: Choose Role ──────────────────────────── */}
      {step === 1 && (
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">What Are You Running For?</h1>
            <p className="mt-4 text-lg text-slate-500">Choose your office and we&apos;ll build your plan.</p>
          </div>
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.id} onClick={() => selectRole(r.id)}
                  className="text-left rounded-2xl border-2 border-slate-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: `${r.color}15` }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{r.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    Select <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── STEP 2: Choose Location ──────────────────────── */}
      {step === 2 && role && (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ backgroundColor: `${role.color}10` }}>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                <span className="text-xs font-bold" style={{ color: role.color }}>{role.label}</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900">Where Are You Running?</h2>
              <p className="text-sm text-slate-500 mt-2">
                {selectedRole === "mpp" ? "Choose your Ontario provincial riding" :
                 selectedRole === "mp" ? "Choose your federal riding" :
                 "Choose your municipality"}
              </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md mx-auto mb-8">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${selectedRole === "mpp" ? "ridings" : selectedRole === "mp" ? "ridings" : "municipalities"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Location Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
              {filteredLocations.map((loc) => (
                <button key={loc.id} onClick={() => selectLocation(loc)}
                  className="text-left rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition-all">
                  <p className="font-bold text-sm text-slate-900">{loc.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{loc.region}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-semibold text-slate-600">{loc.population.toLocaleString()} pop.</span>
                    {loc.wards && <span className="text-[10px] text-slate-400">{loc.wards} wards</span>}
                  </div>
                  <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    loc.tier === "small" ? "bg-green-50 text-green-700" :
                    loc.tier === "medium" ? "bg-blue-50 text-blue-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>{loc.tier}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">Don&apos;t see your area? <Link href="/login" className="text-blue-600 font-semibold">Start a campaign</Link> and we&apos;ll match you.</p>
          </div>
        </section>
      )}

      {/* ── STEP 3: Choose Plan ──────────────────────────── */}
      {step === 3 && role && selectedLocation && prices && (
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 mb-4">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                <span className="text-xs font-bold text-slate-700">{role.label} · {selectedLocation.name}, {selectedLocation.region}</span>
                <span className="text-[10px] text-slate-500">· {selectedLocation.population.toLocaleString()} pop.</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900">Choose Your Plan</h2>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <button onClick={() => setBillingMode("monthly")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${billingMode === "monthly" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                Monthly
              </button>
              <button onClick={() => setBillingMode("onetime")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${billingMode === "onetime" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                One-Time (Full Season)
              </button>
              {billingMode === "onetime" && <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Save ~15%</span>}
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {PLANS.map((plan, i) => {
                const monthly = i === 0 ? prices.campaign : prices.command;
                const price = billingMode === "monthly" ? monthly : getOneTimePrice(monthly);
                return (
                  <div key={plan.id} className={`relative rounded-2xl border-2 p-7 ${plan.popular ? "border-blue-500 shadow-xl" : "border-slate-200"}`}>
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3" /> Most Popular
                      </span>
                    )}
                    <h3 className="text-2xl font-black text-slate-900">{plan.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.tagline}</p>

                    <div className="flex items-end gap-1 mt-5 mb-1">
                      <span className="text-5xl font-black text-slate-900">${price.toLocaleString()}</span>
                      <span className="text-sm text-slate-500 mb-2">{billingMode === "monthly" ? "/mo" : " one-time"}</span>
                    </div>
                    {billingMode === "onetime" && <p className="text-[10px] text-slate-400 capitalize">{electionSeasonLabel()} · Oct 27, 2026</p>}

                    <ul className="mt-6 space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                          {f.startsWith("Everything") ? <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> : <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />}
                          <span className={f.startsWith("Everything") ? "font-semibold text-blue-600" : ""}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/login" className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                      plan.popular ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}>
                      Start 14-Day Free Trial
                    </Link>
                    {plan.id === "command" && (
                      <Link href="/contact" className="block w-full text-center py-2 mt-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                        Running for mayor? Talk to George first →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add-ons */}
            <div className="max-w-3xl mx-auto mt-10">
              <h3 className="text-lg font-black text-slate-900 mb-4 text-center">Power Add-Ons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ADDONS.map((addon) => {
                  const Icon = addon.icon;
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <button key={addon.id} onClick={() => setSelectedAddons((prev) => isSelected ? prev.filter((a) => a !== addon.id) : [...prev, addon.id])}
                      className={`text-left rounded-xl border-2 p-5 transition-all ${isSelected ? "border-blue-500 bg-blue-50/50 shadow-md" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${addon.color}15` }}>
                          <Icon className="w-5 h-5" style={{ color: addon.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900">{addon.label}</h4>
                            <span className="text-sm font-black text-slate-900">${addon.oneTimePrice}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{addon.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Website CTA */}
            <div className="max-w-3xl mx-auto mt-10 rounded-2xl border border-blue-200 bg-blue-50/50 p-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Globe className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="font-bold text-slate-900">Campaign Website Included — See It Live</h4>
                <p className="text-xs text-slate-600 mt-1">Every plan includes a fully built, customizable campaign website. Point your domain and go.</p>
              </div>
              <Link href="/candidates/demo-campaign-2026" target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0">
                View Live Site <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-center text-sm text-slate-500 mt-6 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-green-600" /> 14-day free trial · No credit card · PIPEDA compliant
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-semibold text-sm text-slate-900">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white">Ready to Win?</h2>
          <p className="mt-3 text-slate-400">14-day free trial. Campaign website included. No credit card.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              Start Your Campaign <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/candidates/demo-campaign-2026" target="_blank" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/15 border border-white/10">
              <Globe className="w-4 h-4" /> See Campaign Website
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
