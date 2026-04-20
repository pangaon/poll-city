"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu, X, ArrowRight, Shield, MapPin, Users, BarChart3,
  Globe, ChevronDown, Check, Phone, Mail, MessageSquare,
  Target, Bot, Lock, Play, CheckCircle2, ArrowUpRight,
  Zap, Calendar, Printer, DollarSign, Vote,
  Eye, Layers,
} from "lucide-react";
import EmailCaptureSection from "./email-capture-section";

/* ─── Election Countdown Bar ─────────────────────────────────────────────── */

function ElectionCountdown() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const electionDate = new Date("2026-10-27T00:00:00-05:00");
    function calc() {
      const diff = electionDate.getTime() - Date.now();
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (days === null) return null;

  return (
    <div className="w-full bg-blue-700 text-white text-center py-2 text-xs font-semibold tracking-wide">
      <span className="opacity-80">Ontario Municipal Elections ·</span>
      {" "}<span className="font-black text-amber-300">October 27, 2026</span>
      {" "}<span className="opacity-80">·</span>
      {" "}<span className="font-black text-white">{days} days away</span>
      {" "}<span className="opacity-70">— Is your campaign ready?</span>
      <Link href="/pricing" className="ml-3 underline underline-offset-2 hover:text-amber-200 transition-colors font-bold">
        Start now →
      </Link>
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Poll City" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-lg text-slate-900">Poll City</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "How It Works", href: "#system" },
              { label: "Pricing", href: "/pricing" },
              { label: "Demo", href: "/demo" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ].map((link) => (
              <Link key={link.label} href={link.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/social"
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full border border-[#1D9E75]/40 text-[#1D9E75] hover:bg-[#1D9E75]/8 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Poll City Social
            </Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Start Your Campaign
            </Link>
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden text-slate-900">
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
            <Link href="/about" className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">About</Link>
            <Link href="/contact" className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">Contact</Link>
            <Link href="/login" className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg">Log In</Link>
            <hr className="my-2" />
            <Link href="/social" className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg border border-[#1D9E75]/30 text-[#1D9E75]">
              <Globe className="w-4 h-4" /> Poll City Social
            </Link>
            <Link href="/signup" className="block px-3 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg text-center">Start Your Campaign</Link>
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
      <div className="sticky top-0 z-50">
        <ElectionCountdown />
        <Navbar />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         1. OPENING — The Hook
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0B1120 0%, #162037 40%, #0B1120 100%)" }}>
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
              <Link href="/signup" className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                Start Your Campaign <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 h-12 px-7 rounded-xl text-white font-bold hover:bg-white/10 transition-colors border border-white/15">
                <Play className="w-4 h-4" /> See the Platform
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
      <section className="py-20 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">The differentiator</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Your campaign website isn&apos;t an add-on.
              <span className="text-blue-400"> It&apos;s built into the system.</span>
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              When a donor gives on your website, it hits your CRM. When a supporter signs up, they enter your funnel. When a volunteer registers, they get scheduled. Every action flows directly into your operations — no integrations, no copy-paste, no data lost.
            </p>
          </div>

          {/* 4 layout variant previews */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {[
              {
                name: "Professional",
                desc: "Portrait left, copy right. Clean authority.",
                bg: "from-blue-900 to-blue-950",
                accent: "#3B82F6",
                preview: (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-10 h-12 rounded-lg bg-blue-400/30 shrink-0" />
                      <div className="space-y-1 flex-1">
                        <div className="h-2.5 rounded bg-white/60 w-3/4" />
                        <div className="h-1.5 rounded bg-white/30 w-full" />
                        <div className="h-1.5 rounded bg-white/30 w-2/3" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-5 rounded flex-1 bg-blue-500/70 flex items-center justify-center"><span className="text-[7px] text-white font-bold">Support</span></div>
                      <div className="h-5 rounded flex-1 bg-green-500/70 flex items-center justify-center"><span className="text-[7px] text-white font-bold">Donate</span></div>
                    </div>
                  </div>
                ),
              },
              {
                name: "Modern",
                desc: "Centered circle photo, frosted CTA bar.",
                bg: "from-slate-700 to-slate-900",
                accent: "#10B981",
                preview: (
                  <div className="space-y-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-400/30 mx-auto" />
                    <div className="h-2 rounded bg-white/60 w-2/3 mx-auto" />
                    <div className="h-1.5 rounded bg-white/30 w-full" />
                    <div className="h-5 rounded bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"><span className="text-[7px] text-white">JOIN THE MOVEMENT</span></div>
                  </div>
                ),
              },
              {
                name: "Bold",
                desc: "Massive split typography. Photo fills the frame.",
                bg: "from-red-900 to-red-950",
                accent: "#EF4444",
                preview: (
                  <div className="space-y-1">
                    <div className="text-[18px] font-black text-white/80 leading-none">VOTE</div>
                    <div className="flex gap-1 items-center">
                      <div className="h-6 w-6 rounded bg-red-400/30 shrink-0" />
                      <div className="text-[18px] font-black text-white leading-none">GEORGE</div>
                    </div>
                    <div className="h-1.5 rounded bg-white/30 w-3/4" />
                    <div className="h-4 rounded bg-red-500/70 w-1/2 mt-1" />
                  </div>
                ),
              },
              {
                name: "Minimal",
                desc: "Serif type, light background, editorial feel.",
                bg: "from-stone-700 to-stone-900",
                accent: "#A78BFA",
                preview: (
                  <div className="space-y-2 bg-stone-100/10 rounded p-2">
                    <div className="h-2.5 rounded bg-white/70 w-2/3" style={{ fontFamily: "serif" }} />
                    <div className="h-1.5 rounded bg-white/40 w-full" />
                    <div className="h-1.5 rounded bg-white/40 w-4/5" />
                    <div className="flex justify-end">
                      <div className="h-4 w-14 rounded-full border border-white/30 flex items-center justify-center"><span className="text-[7px] text-white/70">Learn more</span></div>
                    </div>
                  </div>
                ),
              },
            ].map((layout) => (
              <div key={layout.name} className={`rounded-xl bg-gradient-to-b ${layout.bg} p-4 border border-white/10`}>
                <div className="mb-3 h-[90px] flex items-center">
                  {layout.preview}
                </div>
                <p className="font-bold text-sm text-white">{layout.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{layout.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mb-10 max-w-4xl">
            {[
              ["Full-bleed hero with candidate photo", "blue"],
              ["Platform & issues — as deep as you want", "blue"],
              ["Endorsements with photos and quotes", "blue"],
              ["Stripe-powered donations — you keep 97%+", "green"],
              ["Volunteer signup flows into your CRM", "green"],
              ["Lawn sign requests create tasks automatically", "green"],
              ["Event calendar with RSVP + reminders", "green"],
              ["Interactive ward boundary map", "green"],
              ["Custom domain — votegeorge.ca", "amber"],
              ["Live polls your voters can answer", "amber"],
              ["Google Analytics + Meta Pixel built in", "amber"],
              ["4 layouts · 6 themes · live preview", "amber"],
            ].map(([f, c]) => (
              <div key={f as string} className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${c === "blue" ? "text-blue-400" : c === "green" ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="text-sm text-slate-300">{f as string}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/candidates/demo-campaign-2026" target="_blank" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
              <Globe className="w-4 h-4" /> See a Live Campaign Website <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-colors">
              <Eye className="w-4 h-4" /> Try the Website Builder
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         3b. ADONI — The AI campaign manager
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-3">No competitor has this</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Meet Adoni.
                <span className="block text-pink-600">Your AI campaign manager.</span>
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Adoni knows your campaign data — your contacts, your canvassing pace, your fundraising gap, your polling numbers.
                Ask him anything. He answers like a senior campaign manager, not a search engine.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Write my next fundraising email based on what worked last time",
                  "Which ward is most at risk? Where should I canvass today?",
                  "Draft a social post announcing my transit platform",
                  "How many doors do we need to knock to close the gap?",
                ].map((ex) => (
                  <div key={ex} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Bot className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 italic">&ldquo;{ex}&rdquo;</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-slate-400">Powered by Claude. Trained on your campaign data. Canadian English.</p>
            </div>

            {/* Adoni chat mockup */}
            <div className="rounded-2xl border border-slate-200 shadow-xl overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-950">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Adoni</p>
                  <p className="text-[10px] text-slate-400">Your AI Campaign Manager · Online</p>
                </div>
              </div>
              <div className="p-4 space-y-3 bg-slate-950 min-h-[280px]">
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
                    How close are we to the gap? What should the team focus on today?
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-pink-600 shrink-0 flex items-center justify-center mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] leading-relaxed">
                    You need 312 more committed supporters to close the gap. At your current canvassing pace of 142 doors per day you will hit that number in 17 days. Ward 8 is underperforming — only 48% of targets contacted versus 71% in Ward 12. Send your strongest canvassers to Ward 8 today. Also: you have a $4,200 fundraising shortfall this week. Your last email to lapsed donors got a 34% open rate — worth sending again.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
                    Draft that donor email for me
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-pink-600 shrink-0 flex items-center justify-center mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] leading-relaxed">
                    <span className="text-pink-400 font-semibold">Draft ready.</span> Subject: &ldquo;Quick update from the campaign&rdquo; — I&apos;ve written it in your voice, referenced the Ward 8 push, and included a $50 suggested donation amount based on your average gift. Want me to adjust the tone or schedule it for Tuesday morning?
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
                <input readOnly className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500 outline-none" placeholder="Ask Adoni anything about your campaign…" />
                <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
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
         3c. POLL CITY SOCIAL — The civic engagement layer
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Social feed mockup */}
            <div className="rounded-2xl border border-slate-200 shadow-xl overflow-hidden order-2 lg:order-1">
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400/70" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" /><span className="w-2.5 h-2.5 rounded-full bg-green-400/70" /></div>
                <div className="flex-1 bg-slate-700 rounded-full px-3 py-1 text-[10px] text-slate-400 font-medium">social.poll.city</div>
              </div>
              <div className="p-4 space-y-3 bg-slate-50">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  {["Feed", "Officials", "Polls", "Groups"].map((tab, i) => (
                    <span key={tab} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${i === 0 ? "bg-blue-600 text-white" : "text-slate-500"}`}>{tab}</span>
                  ))}
                </div>
                {[
                  { name: "Maria Santos", role: "Councillor · Ward 3", action: "Posted a civic update about road repairs on Elm St", time: "2m ago", color: "bg-blue-600" },
                  { name: "David Park", role: "School Board Trustee", action: "Started a poll: Should the new school be on King or Queen?", time: "18m ago", color: "bg-emerald-600" },
                  { name: "Councillor Bhatt", role: "Regional Rep", action: "Approval rating reached 72% this week", time: "1h ago", color: "bg-violet-600" },
                ].map((item) => (
                  <div key={item.name} className="rounded-xl bg-white border border-slate-200 p-3 flex gap-3">
                    <div className={`w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center font-bold text-xs shrink-0`}>{item.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.role}</p>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.action}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                  <p className="text-[11px] text-blue-700 font-semibold">When a voter follows your profile, your campaign gets notified.</p>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Three products. One platform.</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Poll City Social —
                <span className="block text-blue-600">where the public lives.</span>
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                While your campaign app manages your operations, Poll City Social is the public-facing civic platform.
                Voters follow officials, respond to polls, join interest groups, and track their community&apos;s promises.
                When they follow you, your campaign CRM gets the signal.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: Users, title: "1,100+ Canadian officials", desc: "Federal, provincial, and municipal — already profiled and searchable." },
                  { icon: BarChart3, title: "Live approval ratings", desc: "Voters rate performance. You see the numbers. So do they." },
                  { icon: Vote, title: "Civic polls", desc: "Any official can ask the public a question. Results are public." },
                  { icon: Target, title: "Follow signal → campaign CRM", desc: "When a voter follows you on Social, it creates a lead in your campaign." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{title}</p>
                      <p className="text-sm text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex gap-3">
                <Link href="/social" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                  <Globe className="w-4 h-4" /> Visit Poll City Social
                </Link>
                <Link href="/officials" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                  Find Your Officials
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         3d. ELECTED OFFICIALS — The officials vertical
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">For elected officials</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-4">
            Already in office?
            <span className="text-amber-400"> Your profile is already here.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Poll City has profiled over 1,100 Canadian elected officials at every level of government. Your voters are already looking you up. Claim your profile — add your photo, your record, your platform — and when the next election comes, your campaign is already set up.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto">
            {[
              { level: "Federal MPs", count: "338", color: "text-blue-400" },
              { level: "Ontario MPPs", count: "124", color: "text-emerald-400" },
              { level: "Mayors", count: "444+", color: "text-amber-400" },
              { level: "Councillors", count: "2,400+", color: "text-violet-400" },
            ].map((s) => (
              <div key={s.level} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{s.level}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/officials" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors">
              <MapPin className="w-4 h-4" /> Find Your Profile
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-colors">
              Claim and Start Your Campaign <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
              <Phone className="w-4 h-4" /> Talk to George
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         4b. BUILT FOR — What campaigns look like on Poll City
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Built for every level</p>
          <h2 className="text-center text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">
            From your first campaign to your fifth term.
          </h2>
          <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12 text-sm leading-relaxed">
            Whether you&apos;re a first-time school board candidate or an incumbent mayor preparing a re-election — Poll City is built for your race, your scale, and your budget.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                scenario: "The first-time candidate",
                desc: "You&apos;re announcing in three weeks. You need a website, a way to track supporters, and a system your volunteers can actually use. Poll City is operational in under an hour.",
                tools: ["Campaign website", "Volunteer management", "Door-knock walk lists"],
                color: "border-blue-200 bg-blue-50/40",
                accent: "text-blue-600",
              },
              {
                scenario: "The incumbent running again",
                desc: "You have a donor list, a team, and a record. You need everything connected — your website, your CRM, your communications — so nothing falls through the cracks this cycle.",
                tools: ["CRM with existing contacts", "Email & SMS blasts", "Finance & compliance"],
                color: "border-emerald-200 bg-emerald-50/40",
                accent: "text-emerald-600",
              },
              {
                scenario: "The mayor&apos;s office",
                desc: "You&apos;re running city-wide. You need a war room, scrutineer management, real-time poll tracking on election night, and a team that can execute at scale.",
                tools: ["Election night HQ", "GOTV engine", "Multi-team coordination"],
                color: "border-violet-200 bg-violet-50/40",
                accent: "text-violet-600",
              },
            ].map((s) => (
              <div key={s.scenario} className={`rounded-2xl border p-7 flex flex-col ${s.color}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${s.accent}`}>{s.scenario}</p>
                <p className="text-sm text-slate-700 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: s.desc }} />
                <div className="mt-5 pt-4 border-t border-white/60 space-y-1.5">
                  {s.tools.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${s.accent}`} />
                      {t}
                    </div>
                  ))}
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
                  <th className="text-center py-3 px-4 text-slate-400">Ecanvasser</th>
                  <th className="text-center py-3 px-4 text-slate-400">DIY Stack</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Campaign website included", true, true, false, false],
                  ["Custom domain", true, true, false, false],
                  ["Voter CRM", true, true, true, false],
                  ["Mobile canvassing", true, false, true, false],
                  ["SMS + email campaigns", true, true, false, false],
                  ["GOTV engine", true, false, false, false],
                  ["AI content generation", true, false, false, false],
                  ["Real-time dashboards", true, false, false, false],
                  ["Canadian compliance (PIPEDA / CASL)", true, false, false, false],
                  ["Ready in under an hour", true, false, false, false],
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
         5b. EMAIL CAPTURE — Lead magnet before final CTA
         ══════════════════════════════════════════════════════════════════ */}
      <EmailCaptureSection />

      {/* ══════════════════════════════════════════════════════════════════
         5c. VOTER SECTION — Poll City Social entry point
         ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6">
            <Vote className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">For Voters</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Not running for office? We have something for you too.
          </h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            Poll City Social lets Canadian voters follow their local representatives, ask questions,
            track public positions, and stay informed on what&apos;s happening in their community.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Users className="w-5 h-5 text-blue-600 mb-2" />
              <p className="font-semibold text-slate-800 text-sm">Follow Your Reps</p>
              <p className="text-xs text-slate-500 mt-1">See what your local councillors, MPPs, and MPs are doing.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <BarChart3 className="w-5 h-5 text-blue-600 mb-2" />
              <p className="font-semibold text-slate-800 text-sm">Live Polls</p>
              <p className="text-xs text-slate-500 mt-1">Vote on local issues and see where your community stands.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <MessageSquare className="w-5 h-5 text-blue-600 mb-2" />
              <p className="font-semibold text-slate-800 text-sm">Ask Questions</p>
              <p className="text-xs text-slate-500 mt-1">Put questions directly to elected officials and candidates.</p>
            </div>
          </div>
          <Link
            href="/social"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:border-blue-400 hover:text-blue-700 transition-colors shadow-sm"
          >
            Explore Poll City Social <ArrowRight className="w-4 h-4" />
          </Link>
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
            <Link href="/signup" className="inline-flex items-center gap-2 h-13 px-8 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
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
                <Link href="/about" className="block hover:text-white transition-colors">About</Link>
                <Link href="/contact" className="block hover:text-white transition-colors">Contact</Link>
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
