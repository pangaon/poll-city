"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu, X, ArrowRight, Shield, MapPin, Users, BarChart3,
  Globe, ChevronDown, Check, Phone, Mail, MessageSquare,
  Target, Bot, Lock, Play, CheckCircle2, ArrowUpRight,
  Zap, Calendar, BookOpen, Printer, DollarSign, Vote,
  Eye, Layers,
} from "lucide-react";

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

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
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "How It Works", href: "#system" },
              { label: "Pricing", href: "/pricing" },
              { label: "Demo", href: "/demo" },
            ].map((link) => (
              <Link key={link.label} href={link.href} className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/demo" className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white/90 hover:bg-white/10"}`}>
              Explore Platform
            </Link>
            <Link href="/login" className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Start Your Campaign
            </Link>
          </div>
          <button onClick={() => setOpen(!open)} className={`md:hidden ${scrolled ? "text-slate-900" : "text-white"}`}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            <Link href="#system" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">How It Works</Link>
            <Link href="/pricing" className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">Pricing</Link>
            <Link href="/demo" className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">Demo</Link>
            <hr className="my-2" />
            <Link href="/login" className="block px-3 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg text-center">Start Your Campaign</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

export default function MarketingClient() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ══════════════════════════════════════════════════════════════════
         1. OPENING — The Hook
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16" style={{ background: "linear-gradient(145deg, #0B1120 0%, #162037 40%, #0B1120 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 md:pt-28 md:pb-12 relative">
          <div className="max-w-3xl">
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black text-white leading-[1.05] tracking-tight">
              The campaign operating system
              <span className="block text-blue-400">that&nbsp;includes&nbsp;your&nbsp;website.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-slate-400 max-w-xl leading-relaxed">
              One platform replaces your CRM, your website builder, your email tool, your canvassing app, and your spreadsheets. Everything connected. Ready from day one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                Start Your Campaign <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 h-12 px-7 rounded-xl text-white font-bold hover:bg-white/10 transition-colors border border-white/15">
                <Play className="w-4 h-4" /> Explore the Platform
              </Link>
            </div>
          </div>
        </div>

        {/* Product visual — website + dashboard side by side */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Campaign website preview */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-white/20" /><span className="w-2 h-2 rounded-full bg-white/20" /><span className="w-2 h-2 rounded-full bg-white/20" /></div>
                <div className="flex-1 bg-white/5 rounded px-2 py-0.5 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> votegeorge.ca
                </div>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Your Website</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="h-16 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-end p-3">
                  <div>
                    <p className="text-white font-black text-sm">George Hatzis for Council</p>
                    <p className="text-blue-200 text-[10px]">Ward 20 · Toronto</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {["Support", "Volunteer", "Donate", "Events"].map((b, i) => (
                    <div key={b} className={`flex-1 h-7 rounded flex items-center justify-center text-[9px] font-bold text-white ${["bg-blue-600","bg-emerald-600","bg-amber-600","bg-violet-600"][i]}`}>{b}</div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {["Platform & Issues", "About", "Endorsements", "Events", "Ward Map"].map((s) => (
                    <div key={s} className="px-2.5 py-1.5 rounded bg-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">{s}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-600" />
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-center text-slate-600">Every form feeds your CRM · Custom domain · Donations via Stripe</p>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-white/20" /><span className="w-2 h-2 rounded-full bg-white/20" /><span className="w-2 h-2 rounded-full bg-white/20" /></div>
                <div className="flex-1 bg-white/5 rounded px-2 py-0.5 text-[10px] text-slate-500 font-mono">poll.city/dashboard</div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Your Dashboard</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Supporters", val: "2,847", color: "text-emerald-400" },
                    { label: "Doors Today", val: "142", color: "text-blue-400" },
                    { label: "Days Left", val: "203", color: "text-amber-400" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-white/5 p-2.5 text-center">
                      <p className={`text-lg font-black ${m.color}`}>{m.val}</p>
                      <p className="text-[9px] text-slate-500 font-medium">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">The Gap</span>
                    <span className="text-[9px] text-emerald-400 font-bold">312 to go</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: "68%" }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Jane K. knocked 12 doors on Elm St — 2m ago",
                    "$250 donation from Sarah L. — 15m ago",
                    "New volunteer signup: Alex R. — 22m ago",
                  ].map((a) => (
                    <div key={a} className="px-2.5 py-1.5 rounded bg-white/5 text-[9px] text-slate-500">{a}</div>
                  ))}
                </div>
                <p className="text-[8px] text-center text-slate-600">Live data · Auto-refresh · Custom widgets · 6 modes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-20 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         1b. PAIN SECTION — Name the problem before solving it
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Sound familiar?</p>
          <h2 className="text-center text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">
            Most campaigns still run on five disconnected tools.
          </h2>
          <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12 text-sm leading-relaxed">
            One for contacts. One for the website. One for email. One for canvassing. One spreadsheet duct-taped to all of it.
            Every time data moves between them, something gets lost — and you lose time you don&apos;t have.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto mb-10">
            {[
              { tool: "Google Sheets", use: "Your voter list", emoji: "📊", pain: "No one knows whose data is current" },
              { tool: "Wix / Squarespace", use: "Your website", emoji: "🌐", pain: "Forms feed nowhere useful" },
              { tool: "WhatsApp Groups", use: "Your canvassers", emoji: "💬", pain: "No tracking. Just chaos." },
              { tool: "MailChimp", use: "Your emails", emoji: "📧", pain: "Doesn't know your voters" },
              { tool: "Stripe / e-transfer", use: "Your donations", emoji: "💳", pain: "Manual reconciliation weekly" },
            ].map((t) => (
              <div key={t.tool} className="rounded-xl border border-red-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">{t.emoji}</div>
                <p className="text-xs font-bold text-slate-900">{t.tool}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{t.use}</p>
                <p className="text-[10px] text-red-500 font-semibold mt-2 leading-tight">{t.pain}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px flex-1 max-w-[120px] bg-slate-200" />
            <div className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-bold">There&apos;s a better way</div>
            <div className="h-px flex-1 max-w-[120px] bg-slate-200" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         2. THE CORE TRUTH — One sentence per capability
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">This replaces everything</p>
          <h2 className="text-center text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-12">
            One login. One system. One source of truth.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl mx-auto">
            {[
              { label: "Campaign website", detail: "Live from day one. Custom domain. Forms feed your CRM.", color: "bg-blue-600" },
              { label: "Voter CRM", detail: "Import, tag, score, segment. Every contact in one place.", color: "bg-slate-800" },
              { label: "Canvassing", detail: "Turfs, walk lists, GPS tracking, door-knock scripts.", color: "bg-emerald-600" },
              { label: "Communications", detail: "Email and SMS campaigns. CASL compliant. One inbox.", color: "bg-violet-600" },
              { label: "GOTV engine", detail: "Priority lists, vote tracking, real-time turnout.", color: "bg-red-600" },
              { label: "Fundraising", detail: "Stripe donations. Budget tracking. Expense reporting.", color: "bg-amber-600" },
              { label: "Analytics", detail: "Live dashboards. Custom widgets. Election night mode.", color: "bg-cyan-600" },
              { label: "AI operator", detail: "Generate content, analyze data, run commands.", color: "bg-pink-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-1">
                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${item.color}`} />
                <div>
                  <p className="font-bold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         3. THE WEBSITE — Deep showcase
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">The differentiator</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Your campaign website isn&apos;t an add-on.
              <span className="text-blue-400"> It&apos;s built into the system.</span>
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Every other tool makes you build a website somewhere else. With Poll City, your website is part of the platform — supporters sign up, donors contribute, volunteers register, and every action flows directly into your operations. Point your domain and go.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "Hero section with candidate photo",
              "Platform & issues with details",
              "Endorsements from organizations",
              "Stripe-powered donations",
              "Volunteer signup → CRM",
              "Lawn sign requests → tasks",
              "Event calendar with RSVP",
              "Interactive ward boundary map",
              "Live Q&A from constituents",
              "Custom domain (votegeorge.ca)",
              "6 themes · 5 font pairs",
              "SEO + social sharing meta",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/candidates/demo-campaign-2026" target="_blank" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
              <Globe className="w-4 h-4" /> See a Live Campaign Website <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-colors">
              <Eye className="w-4 h-4" /> See the Website Builder
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         4. HOW CAMPAIGNS ACTUALLY RUN — System walkthrough
         ══════════════════════════════════════════════════════════════════ */}
      <section id="system" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">How campaigns run on Poll City</p>
          <h2 className="text-center text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-16">
            From announcement to election night
          </h2>

          <div className="space-y-16">
            {[
              {
                phase: "Launch",
                headline: "Website live. CRM loaded. Team invited.",
                body: "Import your contact list, your website goes live, your team gets access. From zero to operational in under an hour.",
                capabilities: ["Campaign website", "Contact import", "Team invites", "Brand kit"],
              },
              {
                phase: "Build",
                headline: "Knock doors. Make calls. Send messages. Track everything.",
                body: "Canvassers work walk lists on their phones. Every door knocked, every call made, every message sent — all visible in real time on your dashboard.",
                capabilities: ["Canvassing + GPS", "SMS + Email campaigns", "Volunteer scheduling", "Live activity feed"],
              },
              {
                phase: "Grow",
                headline: "Supporters donate. Volunteers multiply. Data compounds.",
                body: "Your website collects supporters and donations 24/7. Your CRM auto-tags, auto-segments, and auto-prioritizes. Nothing falls through the cracks.",
                capabilities: ["Stripe donations", "Auto-tagging", "Budget tracking", "Print marketplace"],
              },
              {
                phase: "Win",
                headline: "GOTV on election day. Results on election night.",
                body: "Priority call lists. Ride coordination. Real-time vote tracking. War room dashboard. Poll-by-poll results streaming in. This is what you built for.",
                capabilities: ["GOTV engine", "War room mode", "Election night dashboard", "Live results map"],
              },
            ].map((stage, i) => (
              <div key={stage.phase} className="flex gap-6 md:gap-10">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">{i + 1}</div>
                  {i < 3 && <div className="w-px flex-1 bg-blue-100 mt-2" />}
                </div>
                <div className="pb-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{stage.phase}</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{stage.headline}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-lg">{stage.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {stage.capabilities.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         5. COMPARISON — Positioned as obvious
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-10">
            Other platforms make you assemble.
            <span className="text-blue-600"> Poll City is already assembled.</span>
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-bold text-slate-900 w-[200px]">Capability</th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600">Poll City</th>
                  <th className="text-center py-3 px-4 text-slate-400">NationBuilder</th>
                  <th className="text-center py-3 px-4 text-slate-400">NGP VAN</th>
                  <th className="text-center py-3 px-4 text-slate-400">Ecanvasser</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Campaign website included", true, true, false, false],
                  ["Custom domain", true, true, false, false],
                  ["Voter CRM", true, true, true, true],
                  ["Mobile canvassing", true, false, true, true],
                  ["SMS + email campaigns", true, true, false, false],
                  ["GOTV engine", true, false, true, false],
                  ["AI content generation", true, false, false, false],
                  ["Real-time dashboards", true, false, false, false],
                  ["Canadian compliance", true, false, false, false],
                ].map(([feature, ...vals]) => (
                  <tr key={feature as string} className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-700 text-xs">{feature as string}</td>
                    {vals.map((v, j) => (
                      <td key={j} className="text-center py-2.5 px-4">
                        {v ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         6. DECISION — Clear paths
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: "linear-gradient(145deg, #0B1120 0%, #162037 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Stop assembling tools.
            <span className="block text-blue-400">Start running your campaign.</span>
          </h2>
          <p className="mt-5 text-slate-400 max-w-xl mx-auto">
            Campaign website, CRM, canvassing, communications, GOTV — one platform, one login, ready now.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Start Your Campaign <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl border border-white/15 text-white font-bold text-base hover:bg-white/10 transition-colors">
              <Play className="w-4 h-4" /> Explore Platform
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              View Pricing →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-green-400" /> PIPEDA Compliant</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Canadian Hosted</span>
            <span>14-day free trial · No credit card</span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="#system" className="block hover:text-white transition-colors">How It Works</Link>
                <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link href="/demo" className="block hover:text-white transition-colors">Demo</Link>
                <Link href="/candidates/demo-campaign-2026" className="block hover:text-white transition-colors">Campaign Website</Link>
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
                <p className="text-xs text-slate-600 mt-4">PIPEDA Compliant · Canadian Data Hosting</p>
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
