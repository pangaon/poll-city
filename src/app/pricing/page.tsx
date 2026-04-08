"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, X, ArrowRight, Shield, Globe, Users, MapPin,
  Mail, Phone, BarChart3, Bot, Printer, Calendar, Zap,
  Target, BookOpen, Star, ChevronDown,
} from "lucide-react";

/* ─── Plans ──────────────────────────────────────────────────────────────── */

type PlanId = "trustee" | "councillor" | "regional" | "mayor" | "mpp" | "mp";

interface Plan {
  id: PlanId;
  role: string;
  price: number;
  period: string;
  desc: string;
  color: string;
  popular?: boolean;
  features: string[];
  limits: { contacts: string; sms: string; email: string; team: string };
}

const PLANS: Plan[] = [
  {
    id: "trustee",
    role: "School Board Trustee",
    price: 29,
    period: "/month",
    desc: "Low-cost, high-impact for under-resourced campaigns.",
    color: "#059669",
    features: [
      "Campaign website (custom domain)",
      "Up to 2,000 contacts",
      "Basic canvassing + walk lists",
      "Email campaigns (500/mo)",
      "Resource templates",
      "Mobile canvassing app",
      "Calendar & events",
      "Basic reporting",
    ],
    limits: { contacts: "2,000", sms: "200/mo", email: "500/mo", team: "3 users" },
  },
  {
    id: "councillor",
    role: "City Councillor",
    price: 99,
    period: "/month",
    desc: "Ward-level operations with full field tools.",
    color: "#2563EB",
    popular: true,
    features: [
      "Everything in Trustee, plus:",
      "Up to 10,000 contacts",
      "Full canvassing suite + GPS tracking",
      "SMS campaigns (1,000/mo)",
      "Email campaigns (5,000/mo)",
      "AI content generator (Adoni)",
      "GOTV engine + priority lists",
      "Support funnel analytics",
      "Task management",
      "Volunteer scheduling",
    ],
    limits: { contacts: "10,000", sms: "1,000/mo", email: "5,000/mo", team: "10 users" },
  },
  {
    id: "regional",
    role: "Regional Councillor",
    price: 199,
    period: "/month",
    desc: "Multi-ward management with advanced team tools.",
    color: "#7C3AED",
    features: [
      "Everything in Councillor, plus:",
      "Up to 25,000 contacts",
      "Multi-ward turf management",
      "Advanced reporting & exports",
      "Team roles & permissions",
      "Brand kit studio",
      "Print marketplace",
      "Budget & expense tracking",
      "Voice broadcasts",
    ],
    limits: { contacts: "25,000", sms: "3,000/mo", email: "15,000/mo", team: "25 users" },
  },
  {
    id: "mayor",
    role: "Mayor",
    price: 399,
    period: "/month",
    desc: "City-wide campaign with full communications suite.",
    color: "#D97706",
    features: [
      "Everything in Regional, plus:",
      "Up to 75,000 contacts",
      "Unlimited email campaigns",
      "SMS campaigns (10,000/mo)",
      "War room mode",
      "Election night dashboard",
      "Advanced automations",
      "Custom widget builder",
      "Priority support",
      "Opponent intelligence",
    ],
    limits: { contacts: "75,000", sms: "10,000/mo", email: "Unlimited", team: "50 users" },
  },
  {
    id: "mpp",
    role: "MPP (Provincial)",
    price: 599,
    period: "/month",
    desc: "Provincial-scale riding operations.",
    color: "#DC2626",
    features: [
      "Everything in Mayor, plus:",
      "Up to 150,000 contacts",
      "Multi-riding management",
      "Polling integration",
      "Compliance reporting",
      "Coalitions & endorsements",
      "Advanced GOTV with voter file match",
      "API access",
      "Dedicated account manager",
    ],
    limits: { contacts: "150,000", sms: "25,000/mo", email: "Unlimited", team: "100 users" },
  },
  {
    id: "mp",
    role: "MP (Federal)",
    price: 999,
    period: "/month",
    desc: "Federal campaigns with enterprise capabilities.",
    color: "#0F172A",
    features: [
      "Everything in MPP, plus:",
      "Unlimited contacts",
      "Unlimited SMS",
      "Multi-campaign support",
      "White-label options",
      "Custom integrations",
      "SSO / SAML",
      "SLA guarantee",
      "24/7 dedicated support",
    ],
    limits: { contacts: "Unlimited", sms: "Unlimited", email: "Unlimited", team: "Unlimited" },
  },
];

const ALL_FEATURES = [
  { name: "Campaign Website", trustee: true, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Voter & Contact CRM", trustee: true, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Mobile Canvassing", trustee: true, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Email Campaigns", trustee: true, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "SMS Campaigns", trustee: false, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "AI Content Generator", trustee: false, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "GOTV Engine", trustee: false, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Resource Studio", trustee: true, councillor: true, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Print Marketplace", trustee: false, councillor: false, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Brand Kit", trustee: false, councillor: false, regional: true, mayor: true, mpp: true, mp: true },
  { name: "War Room Mode", trustee: false, councillor: false, regional: false, mayor: true, mpp: true, mp: true },
  { name: "Election Night Dashboard", trustee: false, councillor: false, regional: false, mayor: true, mpp: true, mp: true },
  { name: "Custom Widget Builder", trustee: false, councillor: false, regional: false, mayor: true, mpp: true, mp: true },
  { name: "Voice Broadcasts", trustee: false, councillor: false, regional: true, mayor: true, mpp: true, mp: true },
  { name: "Automations", trustee: false, councillor: false, regional: false, mayor: true, mpp: true, mp: true },
  { name: "API Access", trustee: false, councillor: false, regional: false, mayor: false, mpp: true, mp: true },
  { name: "Multi-Riding/Campaign", trustee: false, councillor: false, regional: false, mayor: false, mpp: true, mp: true },
  { name: "Dedicated Support", trustee: false, councillor: false, regional: false, mayor: true, mpp: true, mp: true },
];

/* ─── FAQs ──────────────────────────────────────────────────────────────── */

const FAQS = [
  { q: "Do I need a credit card to start?", a: "No. All plans include a 14-day free trial with no credit card required." },
  { q: "Is the campaign website really included?", a: "Yes. Every plan includes a fully built campaign website with your branding, issues, bio, events, and donation links — live from day one. Pro plans and above support custom domains." },
  { q: "Where is my data stored?", a: "All data is stored on Canadian servers. Poll City is fully PIPEDA compliant with AES-256 encryption at rest and in transit." },
  { q: "Can I upgrade or downgrade at any time?", a: "Yes. Plan changes take effect immediately. You'll be prorated for the remaining billing period." },
  { q: "Do you support school board campaigns?", a: "Absolutely. Our Trustee plan is specifically designed for school board races — affordable and effective." },
  { q: "What happens after the election?", a: "Your account stays active. Elected officials can transition to our Officeholder tools for constituent management." },
];

/* ─── Page Component ─────────────────────────────────────────────────────── */

export default function PricingPage() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Plans Built for Your Race</h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">From school board to federal — every plan includes your campaign website, CRM, and core tools. Scale up as you need.</p>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`relative rounded-xl border-2 p-6 transition-all hover:shadow-lg ${plan.popular ? "border-blue-500 shadow-md" : "border-slate-200"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div className="mb-4">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: plan.color }} />
                  <span className="text-sm font-bold text-slate-900">{plan.role}</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-slate-900">${plan.price}</span>
                  <span className="text-sm text-slate-500 mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mb-5">{plan.desc}</p>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {Object.entries(plan.limits).map(([key, val]) => (
                    <div key={key} className="px-2 py-1.5 rounded-lg bg-slate-50 text-center">
                      <p className="text-xs font-bold text-slate-900">{val}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{key}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/login" className={`block w-full text-center py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  plan.popular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}>
                  Start 14-Day Free Trial
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">All plans include 14-day free trial. No credit card required. Campaign website included on every plan.</p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">Full Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-3 font-bold text-slate-900">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className="text-center py-3 px-2 font-bold text-xs" style={{ color: p.color }}>{p.role.split(" ")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllFeatures ? ALL_FEATURES : ALL_FEATURES.slice(0, 10)).map((f) => (
                  <tr key={f.name} className="border-b border-slate-100 hover:bg-white">
                    <td className="py-2 px-3 font-medium text-slate-700 text-xs">{f.name}</td>
                    {(["trustee", "councillor", "regional", "mayor", "mpp", "mp"] as const).map((plan) => (
                      <td key={plan} className="text-center py-2 px-2">
                        {f[plan] ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
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
                Show all {ALL_FEATURES.length} features <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-semibold text-sm text-slate-900">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
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
      <section className="py-16 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white">Ready to Win?</h2>
          <p className="mt-3 text-slate-400">14-day free trial on every plan. Campaign website included.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
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
