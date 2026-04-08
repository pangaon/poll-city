"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, X, ArrowRight, Shield, Globe, Users,
  ChevronDown, ChevronRight, Zap, Star, Crown,
  CheckCircle2, Lock,
} from "lucide-react";

/* ─── Race Types ─────────────────────────────────────────────────────────── */

type RaceType = "trustee" | "councillor" | "regional" | "mayor" | "mpp" | "mp";
type PackageSize = "starter" | "growth" | "scale";

interface RaceOption {
  id: RaceType;
  label: string;
  desc: string;
  color: string;
  typicalVoters: string;
}

interface Package {
  id: PackageSize;
  label: string;
  tagline: string;
  multiplier: number; // price multiplier
  popular?: boolean;
  extras: string[];
}

const RACES: RaceOption[] = [
  { id: "trustee", label: "School Board Trustee", desc: "Ward-level education board race", color: "#059669", typicalVoters: "5K–30K" },
  { id: "councillor", label: "City Councillor", desc: "Municipal ward or district", color: "#2563EB", typicalVoters: "10K–150K" },
  { id: "regional", label: "Regional Councillor", desc: "Multi-ward regional government", color: "#7C3AED", typicalVoters: "30K–200K" },
  { id: "mayor", label: "Mayor", desc: "City-wide municipal campaign", color: "#D97706", typicalVoters: "20K–500K" },
  { id: "mpp", label: "MPP (Provincial)", desc: "Ontario or BC provincial riding", color: "#DC2626", typicalVoters: "80K–150K" },
  { id: "mp", label: "MP (Federal)", desc: "Federal riding / constituency", color: "#0F172A", typicalVoters: "80K–120K" },
];

const PACKAGES: Package[] = [
  {
    id: "starter",
    label: "Starter",
    tagline: "Everything you need to launch",
    multiplier: 1,
    extras: [
      "Campaign website with custom domain",
      "Core CRM + contact management",
      "Basic canvassing + walk lists",
      "Email campaigns",
      "Resource templates",
      "Mobile canvassing app",
      "Calendar & events",
      "Basic reporting",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    tagline: "Full operations for serious campaigns",
    multiplier: 2,
    popular: true,
    extras: [
      "Everything in Starter, plus:",
      "SMS campaigns",
      "AI content generator (Adoni)",
      "GOTV engine + priority lists",
      "Full analytics suite",
      "Volunteer scheduling",
      "Budget & expense tracking",
      "Brand kit studio",
      "Print marketplace",
      "Voice broadcasts",
      "Custom widget builder",
    ],
  },
  {
    id: "scale",
    label: "Command",
    tagline: "Enterprise-grade for major campaigns",
    multiplier: 4,
    extras: [
      "Everything in Growth, plus:",
      "Unlimited contacts",
      "Unlimited SMS & email",
      "War room mode",
      "Election night dashboard",
      "Advanced automations",
      "Opponent intelligence",
      "Coalition management",
      "API access",
      "Multi-campaign support",
      "Dedicated account manager",
      "Priority support",
    ],
  },
];

// Base prices per race (doubled from original per user's request)
const BASE_PRICES: Record<RaceType, number> = {
  trustee: 58,
  councillor: 198,
  regional: 398,
  mayor: 798,
  mpp: 1198,
  mp: 1998,
};

function getPrice(race: RaceType, pkg: PackageSize): number {
  const base = BASE_PRICES[race];
  const multiplier = PACKAGES.find((p) => p.id === pkg)!.multiplier;
  return base * multiplier;
}

// Limits scale by package
function getLimits(race: RaceType, pkg: PackageSize): Record<string, string> {
  const contactLimits: Record<RaceType, [string, string, string]> = {
    trustee: ["3,000", "10,000", "Unlimited"],
    councillor: ["10,000", "50,000", "Unlimited"],
    regional: ["25,000", "100,000", "Unlimited"],
    mayor: ["50,000", "200,000", "Unlimited"],
    mpp: ["75,000", "300,000", "Unlimited"],
    mp: ["100,000", "500,000", "Unlimited"],
  };
  const smsLimits: Record<PackageSize, [string, string]> = {
    starter: ["—", "—"],
    growth: ["5,000/mo", "10 users"],
    scale: ["Unlimited", "Unlimited"],
  };
  const idx = pkg === "starter" ? 0 : pkg === "growth" ? 1 : 2;
  const teamSizes: Record<PackageSize, string> = { starter: "5 users", growth: "25 users", scale: "Unlimited" };

  return {
    contacts: contactLimits[race][idx],
    sms: pkg === "starter" ? "—" : pkg === "growth" ? "5,000/mo" : "Unlimited",
    email: pkg === "starter" ? "2,000/mo" : pkg === "growth" ? "25,000/mo" : "Unlimited",
    team: teamSizes[pkg],
  };
}

/* ─── Feature comparison ─────────────────────────────────────────────────── */

const FEATURES = [
  { name: "Campaign Website", starter: true, growth: true, scale: true },
  { name: "Custom Domain", starter: true, growth: true, scale: true },
  { name: "Voter & Contact CRM", starter: true, growth: true, scale: true },
  { name: "Mobile Canvassing", starter: true, growth: true, scale: true },
  { name: "Email Campaigns", starter: true, growth: true, scale: true },
  { name: "Resource Templates", starter: true, growth: true, scale: true },
  { name: "Calendar & Events", starter: true, growth: true, scale: true },
  { name: "SMS Campaigns", starter: false, growth: true, scale: true },
  { name: "AI Content Generator", starter: false, growth: true, scale: true },
  { name: "GOTV Engine", starter: false, growth: true, scale: true },
  { name: "Advanced Analytics", starter: false, growth: true, scale: true },
  { name: "Print Marketplace", starter: false, growth: true, scale: true },
  { name: "Brand Kit Studio", starter: false, growth: true, scale: true },
  { name: "Voice Broadcasts", starter: false, growth: true, scale: true },
  { name: "Custom Widget Builder", starter: false, growth: true, scale: true },
  { name: "War Room Mode", starter: false, growth: false, scale: true },
  { name: "Election Night Dashboard", starter: false, growth: false, scale: true },
  { name: "Automations", starter: false, growth: false, scale: true },
  { name: "Opponent Intelligence", starter: false, growth: false, scale: true },
  { name: "API Access", starter: false, growth: false, scale: true },
  { name: "Multi-Campaign Support", starter: false, growth: false, scale: true },
  { name: "Dedicated Support", starter: false, growth: false, scale: true },
];

/* ─── FAQs ──────────────────────────────────────────────────────────────── */

const FAQS = [
  { q: "Do I need a credit card to start?", a: "No. All plans include a 14-day free trial with no credit card required." },
  { q: "Why does the price vary by race type?", a: "Different races have different scale requirements. A school board trustee needs far less infrastructure than a federal MP campaign. We price accordingly so you never pay for capacity you don't need." },
  { q: "What if my ward has more voters than typical?", a: "The package sizes (Starter, Growth, Command) handle scale. If you're a councillor representing 150K+ people, choose Growth or Command for the contact and messaging limits you need." },
  { q: "Is the campaign website really included?", a: "Yes. Every plan — even Starter — includes a fully built campaign website with your branding, issues, bio, events, donation links, and forms. All form submissions feed directly into your CRM. Pro plans support custom domains." },
  { q: "Where is my data stored?", a: "All data is stored on Canadian servers. Poll City is fully PIPEDA compliant with AES-256 encryption at rest and in transit." },
  { q: "Can I upgrade at any time?", a: "Yes. Changes take effect immediately. You'll be prorated for the remaining billing period." },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  const [selectedRace, setSelectedRace] = useState<RaceType>("councillor");
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const race = RACES.find((r) => r.id === selectedRace)!;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-[10px]">PC</span>
            </div>
            <span className="font-bold text-slate-900">Poll City</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Explore Demo</Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Start Campaign</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">What Are You Running For?</h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Choose your race, then pick the package that matches your campaign&apos;s scale. Every plan includes your campaign website.
          </p>
        </div>
      </section>

      {/* Step 1: Choose Your Race */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs font-bold text-blue-600 uppercase tracking-wider">
              Step 1 — Choose Your Race
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {RACES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRace(r.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedRace === r.id
                    ? "border-blue-500 shadow-lg bg-blue-50/50 scale-[1.02]"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <span className="w-4 h-4 rounded-full inline-block mb-2" style={{ backgroundColor: r.color }} />
                <p className="font-bold text-sm text-slate-900 leading-tight">{r.label}</p>
                <p className="text-[10px] text-slate-500 mt-1">{r.typicalVoters} voters</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Step 2: Choose Your Package */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs font-bold text-blue-600 uppercase tracking-wider">
              Step 2 — Choose Your Package
            </span>
            <p className="text-sm text-slate-500 mt-2">
              Pricing for <span className="font-bold" style={{ color: race.color }}>{race.label}</span> · {race.typicalVoters} typical voters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PACKAGES.map((pkg) => {
              const price = getPrice(selectedRace, pkg.id);
              const limits = getLimits(selectedRace, pkg.id);
              return (
                <div key={pkg.id} className={`relative rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg ${pkg.popular ? "border-blue-500 shadow-lg" : "border-slate-200"}`}>
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3" /> Most Popular
                    </span>
                  )}

                  <div className="mb-5">
                    <h3 className="text-xl font-black text-slate-900">{pkg.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{pkg.tagline}</p>
                  </div>

                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-5xl font-black text-slate-900">${price}</span>
                    <span className="text-sm text-slate-500 mb-2">/month</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-5">For {race.label} campaigns</p>

                  {/* Limits */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {Object.entries(limits).map(([key, val]) => (
                      <div key={key} className="px-2.5 py-2 rounded-lg bg-slate-50">
                        <p className="text-xs font-bold text-slate-900">{val}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{key}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {pkg.extras.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        {f.startsWith("Everything") ? (
                          <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                        )}
                        <span className={f.startsWith("Everything") ? "font-semibold text-blue-600" : ""}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/login" className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                    pkg.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}>
                    Start 14-Day Free Trial
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-green-600" />
            All plans include campaign website + 14-day free trial + no credit card required
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">Full Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-3 font-bold text-slate-900">Feature</th>
                  {PACKAGES.map((p) => (
                    <th key={p.id} className={`text-center py-3 px-4 font-bold ${p.popular ? "text-blue-600" : "text-slate-500"}`}>{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllFeatures ? FEATURES : FEATURES.slice(0, 12)).map((f) => (
                  <tr key={f.name} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-700 text-xs">{f.name}</td>
                    {(["starter", "growth", "scale"] as const).map((pkg) => (
                      <td key={pkg} className="text-center py-2.5 px-4">
                        {f[pkg] ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAllFeatures && (
            <div className="text-center mt-4">
              <button onClick={() => setShowAllFeatures(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                Show all {FEATURES.length} features <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

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
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white">Ready to Win?</h2>
          <p className="mt-3 text-slate-400">14-day free trial on every plan. Campaign website included. No credit card.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">
              Start Your Campaign <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/15 border border-white/10">
              Explore Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
