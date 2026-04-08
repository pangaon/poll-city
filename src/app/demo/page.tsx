"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Play, Users, MapPin, BarChart3, DollarSign,
  Mail, Phone, Target, Bot, Shield, Globe, Calendar,
  Zap, CheckCircle2, Eye, Copy, Check, ExternalLink,
  BookOpen, Printer, Settings, MessageSquare, Vote,
} from "lucide-react";

/* ─── Demo Roles ─────────────────────────────────────────────────────────── */

const DEMO_ROLES = [
  {
    id: "admin",
    role: "Campaign Admin",
    label: "Full Access",
    desc: "See everything — dashboard, CRM, canvassing, communications, GOTV, finance, settings.",
    email: "admin@pollcity.dev",
    password: "password123",
    color: "#2563EB",
    landingPage: "/dashboard",
  },
  {
    id: "manager",
    role: "Campaign Manager",
    label: "Operations",
    desc: "Manage contacts, run canvassing operations, send communications, track volunteers.",
    email: "manager@pollcity.dev",
    password: "password123",
    color: "#059669",
    landingPage: "/dashboard",
  },
  {
    id: "volunteer",
    role: "Volunteer / Canvasser",
    label: "Field View",
    desc: "See the mobile canvassing experience — walk lists, door-knock scripts, GPS tracking.",
    email: "volunteer@pollcity.dev",
    password: "password123",
    color: "#D97706",
    landingPage: "/canvass",
  },
];

const EXPLORE_AREAS = [
  { icon: BarChart3, label: "Dashboard Studio", desc: "Custom widgets, live metrics, 6 modes", href: "/dashboard" },
  { icon: Users, label: "Contacts CRM", desc: "Search, filter, tag, score voters", href: "/contacts" },
  { icon: MapPin, label: "Canvassing", desc: "Turfs, walk lists, GPS routes, scripts", href: "/canvassing" },
  { icon: Mail, label: "Communications", desc: "Email, SMS, inbox, templates", href: "/communications" },
  { icon: Target, label: "GOTV Engine", desc: "Priority lists, vote tracking", href: "/gotv" },
  { icon: DollarSign, label: "Donations & Budget", desc: "Track spending, log donations", href: "/donations" },
  { icon: BookOpen, label: "Resource Studio", desc: "Templates, scripts, AI generator", href: "/resources" },
  { icon: Globe, label: "Campaign Website", desc: "Live public-facing candidate site", href: "/candidates/demo-campaign-2026" },
  { icon: Settings, label: "Website Builder", desc: "Customize branding, layout, content", href: "/settings/public-page" },
  { icon: Printer, label: "Print Marketplace", desc: "Signs, flyers, door hangers", href: "/print" },
  { icon: Calendar, label: "Events & Calendar", desc: "Schedule, RSVP, team coordination", href: "/calendar" },
  { icon: Bot, label: "AI Operator (Adoni)", desc: "Generate content, run queries", href: "/ai-assist" },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [selectedRole, setSelectedRole] = useState(DEMO_ROLES[0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

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
            <span className="text-xs font-semibold text-blue-300">Live Demo — Pre-Loaded with Real Data</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Explore the Full Platform</h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Log in with demo credentials and explore everything — dashboard, CRM, canvassing, communications, GOTV, and the campaign website. All pre-loaded with realistic data.
          </p>
        </div>
      </section>

      {/* Campaign Website Showcase */}
      <section className="py-12 bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Differentiator</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Campaign Website — Built In</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Every Poll City campaign includes a fully built, customizable campaign website. Supporters sign up, donate, volunteer, and request lawn signs — all feeding directly into your CRM. No other platform offers this.
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Forward your own domain (e.g. votegeorge.ca) and visitors see a professional campaign site — powered by Poll City behind the scenes.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/candidates/demo-campaign-2026" target="_blank"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  <Globe className="w-4 h-4" />
                  View Live Campaign Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link href="/settings/public-page"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Settings className="w-4 h-4" />
                  See the Website Builder
                </Link>
              </div>
            </div>
            <div className="lg:w-96 shrink-0">
              <div className="rounded-xl border-2 border-blue-200 bg-white shadow-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono">
                    votegeorge.ca
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-20 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                    <span className="text-white font-black text-lg">Alex Admin for Ward 1</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-8 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">Support</div>
                    <div className="flex-1 h-8 rounded bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">Volunteer</div>
                    <div className="flex-1 h-8 rounded bg-amber-600 flex items-center justify-center text-[10px] font-bold text-white">Donate</div>
                  </div>
                  <div className="space-y-1.5">
                    {["Platform & Issues", "About the Candidate", "Endorsements", "Events", "Ward Map"].map((s) => (
                      <div key={s} className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-50">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] text-slate-600">{s}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 text-center">Forms feed directly into your CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Role Selector + Explore Areas */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">Choose Your Role</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEMO_ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={`text-left rounded-xl border-2 p-4 transition-all ${
                        selectedRole.id === role.id
                          ? "border-blue-500 shadow-md bg-blue-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{role.label}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{role.role}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">{role.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Explore Areas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EXPLORE_AREAS.map((area) => {
                    const Icon = area.icon;
                    return (
                      <Link key={area.label} href={area.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
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
            </div>

            {/* Right: Login Card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border-2 border-blue-500 bg-gradient-to-b from-blue-50/80 to-white p-6 shadow-lg sticky top-20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                  <h3 className="font-bold text-slate-900">{selectedRole.role}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-5">Log in as {selectedRole.label.toLowerCase()} to explore the platform.</p>

                <div className="space-y-3 mb-5">
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                      <p className="text-sm font-mono font-semibold text-slate-900">{selectedRole.email}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedRole.email, `${selectedRole.id}-email`)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      {copiedField === `${selectedRole.id}-email` ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</p>
                      <p className="text-sm font-mono font-semibold text-slate-900">{selectedRole.password}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedRole.password, `${selectedRole.id}-pass`)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      {copiedField === `${selectedRole.id}-pass` ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Link href="/login" className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                  <Play className="w-4 h-4" />
                  Log In to Demo
                </Link>

                <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>Demo data resets periodically. Pre-loaded with contacts, turfs, donations, and a live campaign website.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <h3 className="font-bold text-slate-900 mb-1">Want Your Own Campaign?</h3>
                <p className="text-xs text-slate-500 mb-3">14-day free trial. Campaign website included.</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">
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
