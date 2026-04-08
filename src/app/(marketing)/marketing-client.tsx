"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu, X, ArrowRight, Shield, MapPin, Users, BarChart3, Bell,
  Printer, Star, Zap, Globe, ChevronDown, Check, Phone,
  Mail, MessageSquare, Target, Monitor, Smartphone,
  Award, TrendingUp, FileText, Calendar, DollarSign,
  Layers, Bot, Upload, Palette, Vote, BookOpen, Lock,
  Play, CheckCircle2, ArrowUpRight, Sparkles, Radio,
  Eye, Heart, Megaphone, Search, Settings, Map,
} from "lucide-react";

/* ─── Navigation ─────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Solutions", href: "#solutions" },
  { label: "Compare", href: "#compare" },
  { label: "Help", href: "/help" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/50" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Poll City" className="w-8 h-8 rounded-lg object-contain" />
            <span className={`font-bold text-lg ${scrolled ? "text-slate-900" : "text-white"}`}>Poll City</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/demo" className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white/90 hover:bg-white/10"}`}>
              Explore Demo
            </Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
              Start Your Campaign
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className={`md:hidden ${scrolled ? "text-slate-900" : "text-white"}`}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">
                {link.label}
              </Link>
            ))}
            <hr className="my-2" />
            <Link href="/demo" className="block px-3 py-2.5 text-sm font-semibold text-blue-600">Explore Demo</Link>
            <Link href="/login" className="block px-3 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg text-center">Start Your Campaign</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Section Components ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{children}</p>;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function MarketingClient() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ═══════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)" }}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300">Campaign Operating System for Canadian Elections</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
              Run Your Entire Campaign
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Including Your Website</span>
              <br />
              From One Platform
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Campaign software, communications, field operations, and a fully built campaign website — ready from day one. No other platform gives you this.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">
                Start Your Campaign
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/15 transition-colors border border-white/10">
                <Play className="w-4 h-4" />
                Explore the Platform
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-400" /> PIPEDA Compliant</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-400" /> Canadian Hosted</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> AI-Powered</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-cyan-400" /> Campaign Website Included</span>
            </div>
          </div>
        </div>

        {/* Gradient fade to white */}
        <div className="h-24 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* ═══════════════════════════════════════════════════
         PROBLEM
         ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Campaigns Run on Broken Tools</h2>
            <p className="mt-4 text-lg text-slate-500">Most campaigns piece together 5-10 disconnected systems. Data gets lost, teams waste time, and voters fall through the cracks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Layers, title: "Fragmented Systems", desc: "Spreadsheets, random apps, paper lists — nothing talks to anything else." },
              { icon: MessageSquare, title: "Disconnected Messaging", desc: "Email in one tool, SMS in another, social in a third. No unified view." },
              { icon: Eye, title: "Poor Visibility", desc: "Campaign managers can't see what's happening in real time. Decisions lag." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-red-100 bg-red-50/50 p-6">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         SOLUTION
         ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>The Solution</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">One Platform. Total Campaign Control.</h2>
            <p className="mt-4 text-lg text-slate-500">Everything connected. Nothing wasted. From your first contact to election night.</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         CAMPAIGN WEBSITE — THE DIFFERENTIATOR
         ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <SectionLabel>What Nobody Else Gives You</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Your Campaign Website.
                <br />
                <span className="text-blue-600">Built In. Live Day One.</span>
              </h2>
              <p className="mt-4 text-base text-slate-500 leading-relaxed">
                Every other platform makes you build a website somewhere else. Poll City gives you a fully branded, mobile-ready campaign website that&apos;s connected to everything — supporters sign up, donors contribute, volunteers register, and it all flows directly into your CRM.
              </p>
              <p className="mt-3 text-base text-slate-500 leading-relaxed">
                Forward your own domain (votegeorge.ca) and visitors see a professional campaign site. Nobody knows it&apos;s Poll City — unless you want them to.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  "Hero with photo & tagline",
                  "Platform & issues section",
                  "Endorsements with logos",
                  "Stripe-powered donations",
                  "Volunteer signup forms",
                  "Lawn sign requests",
                  "Event RSVP system",
                  "Interactive ward map",
                  "Q&A / live questions",
                  "Custom domain support",
                  "6 themes & 5 font pairs",
                  "SEO + social sharing",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/candidates/demo-campaign-2026" target="_blank" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                  <Globe className="w-4 h-4" />
                  See a Live Campaign Website
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link href="/demo" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Eye className="w-4 h-4" />
                  Explore the Builder
                </Link>
              </div>
            </div>

            {/* Browser mockup */}
            <div className="lg:w-[440px] shrink-0">
              <div className="rounded-xl border-2 border-slate-200 bg-white shadow-2xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" /> votegeorge.ca
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {/* Hero */}
                  <div className="h-24 rounded-lg bg-gradient-to-r from-blue-700 to-blue-900 flex items-end p-4">
                    <div>
                      <p className="text-white font-black text-lg leading-tight">George Hatzis</p>
                      <p className="text-blue-200 text-xs">for City Council — Ward 20</p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {["Support", "Volunteer", "Donate", "Events"].map((btn, i) => (
                      <div key={btn} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                        i === 0 ? "bg-blue-600" : i === 1 ? "bg-emerald-600" : i === 2 ? "bg-amber-600" : "bg-violet-600"
                      }`}>{btn}</div>
                    ))}
                  </div>
                  {/* Sections */}
                  <div className="space-y-2">
                    {[
                      { label: "Platform & Issues", sub: "Transit · Housing · Community Safety" },
                      { label: "About George", sub: "12 years in the community" },
                      { label: "Endorsements", sub: "Local Business Association + 4 more" },
                      { label: "Upcoming Events", sub: "Coffee Chat — Saturday 10am" },
                      { label: "Interactive Ward Map", sub: "Boundary, events, office" },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 group">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                          <p className="text-[10px] text-slate-500">{s.sub}</p>
                        </div>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-center text-slate-400">Powered by Poll City · All forms feed your CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         WHAT YOU GET — DAY ONE
         ═══════════════════════════════════════════════════ */}
      <section id="product" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>What You Get Day One</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Everything a Campaign Needs. Built In.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { icon: Globe, title: "Campaign Website", desc: "Live immediately. Custom domain. Branded to your campaign.", highlight: true },
              { icon: Users, title: "Voter & Contact CRM", desc: "Import, tag, score, and segment every contact." },
              { icon: Mail, title: "Email Campaigns", desc: "Compose, segment, schedule. CASL compliance built in." },
              { icon: Phone, title: "SMS & Text Blasts", desc: "Bulk SMS with scheduling, templates, and delivery tracking." },
              { icon: MapPin, title: "Canvassing", desc: "Turfs, walk lists, GPS tracking, door-knock scripts." },
              { icon: Calendar, title: "Calendar & Events", desc: "Campaign calendar, event RSVP, volunteer scheduling." },
              { icon: CheckCircle2, title: "Tasks & Team", desc: "Assign, track, complete. Everyone knows what to do." },
              { icon: BarChart3, title: "Analytics & Reports", desc: "Real-time dashboards, support funnel, canvassing pace." },
              { icon: BookOpen, title: "Resource Studio", desc: "Templates, scripts, guides — preview, download, generate." },
              { icon: Printer, title: "Print & Logistics", desc: "Lawn signs, door hangers, flyers — design and order." },
              { icon: Bot, title: "AI Operator (Adoni)", desc: "Generate content, analyze data, run queries by voice." },
              { icon: Target, title: "GOTV Engine", desc: "Priority lists, vote tracking, supporter turnout in real time." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-xl border p-5 transition-all hover:shadow-md ${item.highlight ? "border-blue-200 bg-blue-50/50 ring-1 ring-blue-100" : "border-slate-200 bg-white"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.highlight ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                  {item.highlight && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">Included Free</span>}
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         CAMPAIGN FLOW
         ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">From Launch to Election Night</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { step: "01", label: "Capture", desc: "Import contacts, collect supporters", icon: Upload },
              { step: "02", label: "Organize", desc: "Tag, segment, assign turfs", icon: Layers },
              { step: "03", label: "Execute", desc: "Canvass, call, message, fundraise", icon: Zap },
              { step: "04", label: "Track", desc: "Dashboards, reports, real-time data", icon: BarChart3 },
              { step: "05", label: "Win", desc: "GOTV, election night, results", icon: Award },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item.step}</p>
                  <p className="font-bold text-slate-900 mt-1">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         DIFFERENTIATION / COMPARE
         ═══════════════════════════════════════════════════ */}
      <section id="compare" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>Why Poll City</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Everything Connected. Nothing Wasted.</h2>
            <p className="mt-4 text-lg text-slate-500">Compare Poll City to the alternatives.</p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-bold text-slate-900">Feature</th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600">Poll City</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-400">NationBuilder</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-400">NGP VAN</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-400">Ecanvasser</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Campaign Website Included", pc: true, nb: true, ngp: false, ec: false },
                  { feature: "Voter CRM", pc: true, nb: true, ngp: true, ec: true },
                  { feature: "Mobile Canvassing", pc: true, nb: false, ngp: true, ec: true },
                  { feature: "SMS & Email Campaigns", pc: true, nb: true, ngp: false, ec: false },
                  { feature: "AI Content Generator", pc: true, nb: false, ngp: false, ec: false },
                  { feature: "Print Marketplace", pc: true, nb: false, ngp: false, ec: false },
                  { feature: "GOTV Engine", pc: true, nb: false, ngp: true, ec: false },
                  { feature: "Real-time Dashboards", pc: true, nb: false, ngp: false, ec: false },
                  { feature: "Canadian Data Compliance", pc: true, nb: false, ngp: false, ec: false },
                  { feature: "Custom Widget Builder", pc: true, nb: false, ngp: false, ec: false },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-700">{row.feature}</td>
                    <td className="text-center py-2.5 px-4">{row.pc ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                    <td className="text-center py-2.5 px-4">{row.nb ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                    <td className="text-center py-2.5 px-4">{row.ngp ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                    <td className="text-center py-2.5 px-4">{row.ec ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         SOLUTIONS BY ROLE
         ═══════════════════════════════════════════════════ */}
      <section id="solutions" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>Solutions</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Built for Every Level of Government</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { role: "School Board Trustee", desc: "Low-cost, high-impact. Website + CRM + canvassing for under-resourced campaigns.", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { role: "City Councillor", desc: "Ward-level operations. Turfs, walk lists, door-knock scripts, voter tracking.", color: "bg-blue-50 border-blue-200 text-blue-700" },
              { role: "Regional Councillor", desc: "Multi-ward management. Team coordination, advanced reporting, budget tracking.", color: "bg-violet-50 border-violet-200 text-violet-700" },
              { role: "Mayor", desc: "City-wide campaign. Full communications suite, print marketplace, war room.", color: "bg-amber-50 border-amber-200 text-amber-700" },
              { role: "MPP", desc: "Provincial-scale operations. Riding management, polling integration, compliance.", color: "bg-rose-50 border-rose-200 text-rose-700" },
              { role: "MP", desc: "Federal campaigns. Multi-riding, national messaging, advanced GOTV, API access.", color: "bg-slate-100 border-slate-300 text-slate-700" },
            ].map((item) => (
              <div key={item.role} className={`rounded-xl border p-6 ${item.color}`}>
                <h3 className="font-bold text-lg">{item.role}</h3>
                <p className="text-sm mt-2 opacity-80">{item.desc}</p>
                <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold mt-4 opacity-70 hover:opacity-100 transition-opacity">
                  View plan <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         DEMO CTA
         ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <SectionLabel>Try It Now</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Explore a Live Campaign</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">No signup required. Log into a pre-built demo campaign and see everything working with real data.</p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                { label: "Councillor Setup", desc: "Ward-level campaign with 2,500 contacts", href: "/demo" },
                { label: "Mayor Setup", desc: "City-wide campaign with full communications", href: "/demo" },
                { label: "MP Setup", desc: "Federal riding with multi-team operations", href: "/demo" },
              ].map((d) => (
                <Link key={d.label} href={d.href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                    <Play className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{d.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{d.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         FINAL CTA
         ═══════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Stop Managing Tools.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Start Running Your Campaign.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            Join the campaigns that have already switched to Poll City. One platform, total control, day one.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">
              Start Your Campaign <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/15 transition-colors border border-white/10">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="#product" className="block hover:text-white transition-colors">Features</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link href="/demo" className="block hover:text-white transition-colors">Demo</Link>
                <Link href="#compare" className="block hover:text-white transition-colors">Compare</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Solutions</h4>
              <div className="space-y-2 text-sm">
                <Link href="/pricing" className="block hover:text-white transition-colors">School Board</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">Councillor</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">Mayor</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">MPP / MP</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Resources</h4>
              <div className="space-y-2 text-sm">
                <Link href="/help" className="block hover:text-white transition-colors">Help Center</Link>
                <Link href="/officials" className="block hover:text-white transition-colors">Officials Directory</Link>
                <Link href="/social" className="block hover:text-white transition-colors">Poll City Social</Link>
                <Link href="/calculator" className="block hover:text-white transition-colors">Cost Calculator</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                <Link href="/terms" className="block hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/privacy-policy" className="block hover:text-white transition-colors">Privacy Policy</Link>
                <p className="text-xs text-slate-600 mt-4">PIPEDA Compliant<br />Canadian Data Hosting</p>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Poll City" className="w-6 h-6 rounded object-contain" />
              <span className="text-sm font-semibold text-white">Poll City</span>
            </div>
            <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Poll City. The Campaign Operating System.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
