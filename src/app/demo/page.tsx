"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Play, Users, MapPin, BarChart3, DollarSign,
  Mail, Phone, Target, Bot, Shield, Globe, Map, Calendar,
  Zap, CheckCircle2, Eye, Monitor, Smartphone, Lock,
} from "lucide-react";

/* ─── Demo Campaigns ─────────────────────────────────────────────────────── */

const DEMO_CAMPAIGNS = [
  {
    id: "councillor",
    role: "City Councillor",
    name: "Jane Smith — Ward 20 Toronto",
    desc: "Ward-level campaign with 2,500 contacts, active canvassing, SMS/email campaigns, and full GOTV engine.",
    color: "#2563EB",
    contacts: "2,500",
    features: ["Full CRM with tagged contacts", "6 canvassing turfs with walk lists", "Active email + SMS campaigns", "GOTV priority lists", "Budget tracking", "Campaign website"],
    credentials: { email: "demo-admin@poll.city", password: "demo2026" },
  },
  {
    id: "mayor",
    role: "Mayor",
    name: "David Chen — Mayor of Oakville",
    desc: "City-wide campaign with 15,000 contacts, war room mode, election night dashboard, and print marketplace.",
    color: "#D97706",
    contacts: "15,000",
    features: ["Multi-ward operations", "War room dashboard", "Voice broadcast setup", "Print marketplace orders", "Team of 25 volunteers", "Full analytics suite"],
    credentials: { email: "demo-manager@poll.city", password: "demo2026" },
  },
  {
    id: "mp",
    role: "MP (Federal)",
    name: "Sarah Williams — Riding of Durham",
    desc: "Federal riding campaign with 50,000 contacts, multi-team operations, advanced GOTV, and API integrations.",
    color: "#0F172A",
    contacts: "50,000",
    features: ["Riding-wide voter file", "Multi-team coordination", "Advanced automations", "Coalition management", "Polling integration", "Election night live results"],
    credentials: { email: "demo-volunteer@poll.city", password: "demo2026" },
  },
];

const DEMO_AREAS = [
  { icon: BarChart3, label: "Dashboard Studio", desc: "Live metrics, widgets, custom displays", href: "/dashboard" },
  { icon: Users, label: "Contacts CRM", desc: "Search, filter, tag 2,500+ voters", href: "/contacts" },
  { icon: MapPin, label: "Canvassing", desc: "Turfs, walk lists, GPS routes", href: "/canvassing" },
  { icon: Mail, label: "Communications", desc: "Email, SMS, inbox, templates", href: "/communications" },
  { icon: Target, label: "GOTV", desc: "Priority lists, vote tracking", href: "/gotv" },
  { icon: DollarSign, label: "Budget & Donations", desc: "Track spending, log donations", href: "/donations" },
  { icon: Calendar, label: "Events & Calendar", desc: "Schedule, RSVP, team coordination", href: "/calendar" },
  { icon: Globe, label: "Campaign Website", desc: "Live site with branding", href: "/candidates" },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [selected, setSelected] = useState(DEMO_CAMPAIGNS[0]);

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
            <Link href="/pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Start Campaign</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Play className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300">Live Demo Environment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Explore a Live Campaign</h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            No signup required. Log into a pre-built demo campaign with real data. See everything working — dashboards, CRM, canvassing, communications, GOTV.
          </p>
        </div>
      </section>

      {/* Demo Campaign Selector */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4 text-center">Choose a Demo Campaign</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {DEMO_CAMPAIGNS.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => setSelected(campaign)}
                className={`text-left rounded-xl border-2 p-5 transition-all ${
                  selected.id === campaign.id
                    ? "border-blue-500 shadow-md bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: campaign.color }} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{campaign.role}</span>
                </div>
                <h3 className="font-bold text-slate-900">{campaign.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{campaign.contacts} contacts</p>
              </button>
            ))}
          </div>

          {/* Selected Campaign Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selected.color }} />
                <h2 className="text-xl font-black text-slate-900">{selected.name}</h2>
              </div>
              <p className="text-sm text-slate-600 mb-6">{selected.desc}</p>

              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">What&apos;s Pre-Loaded</h3>
              <ul className="space-y-2 mb-6">
                {selected.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Explore Areas</h3>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_AREAS.map((area) => {
                  const Icon = area.icon;
                  return (
                    <Link key={area.label} href={area.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{area.label}</p>
                        <p className="text-[10px] text-slate-500">{area.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Login Card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border-2 border-blue-500 bg-blue-50/50 p-6">
                <h3 className="font-bold text-slate-900 mb-1">Demo Login Credentials</h3>
                <p className="text-xs text-slate-500 mb-4">Use these to log in and explore the full platform.</p>

                <div className="space-y-3 mb-5">
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">{selected.credentials.email}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">{selected.credentials.password}</p>
                  </div>
                </div>

                <Link href="/login" className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                  <Play className="w-4 h-4" />
                  Log In to Demo
                </Link>

                <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>Demo data is pre-populated. Changes don&apos;t persist. Read-only where sensitive.</p>
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <h3 className="font-bold text-slate-900 mb-2">Ready for Your Own Campaign?</h3>
                <p className="text-xs text-slate-500 mb-4">14-day free trial. Campaign website included.</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">
                  Start Your Campaign <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
