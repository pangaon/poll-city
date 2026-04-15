"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Play, Users, MapPin, BarChart3, DollarSign,
  Mail, Phone, Target, Bot, Shield, Globe, Calendar,
  Zap, CheckCircle2, Eye, ExternalLink,
  BookOpen, Printer, Settings, MessageSquare, Vote, Lock,
} from "lucide-react";

/* ─── Demo Roles ─────────────────────────────────────────────────────────── */

const DEMO_SHOWCASES = [
  {
    id: 'candidate',
    label: 'Municipal Candidate',
    sublabel: 'Ward 20 — Toronto',
    desc: 'Live campaign dashboard. CRM, GOTV gap, canvassing, Adoni AI. Guided tour included.',
    color: '#2563EB',
    href: '/demo/candidate',
    cta: 'Explore Candidate Demo',
  },
  {
    id: 'party',
    label: 'Provincial Party',
    sublabel: 'Ontario — 124 ridings',
    desc: 'Province-wide command centre. Riding breakdown, donation tracking, province-wide metrics.',
    color: '#059669',
    href: '/demo/party',
    cta: 'Explore Party Demo',
  },
  {
    id: 'media',
    label: 'Election Night',
    sublabel: 'Live results mode',
    desc: 'Live results ticker, mayoral race leaderboard, approval ratings, flash polls.',
    color: '#dc2626',
    href: '/demo/media',
    cta: 'Explore Election Night',
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

      {/* Explore Demos Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">No Login Required</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Choose Your Demo</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
              Fully pre-loaded with realistic data. Guided tour walks you through every feature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {DEMO_SHOWCASES.map((d) => (
              <Link
                key={d.id}
                href={d.href}
                className="group flex flex-col rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{d.sublabel}</span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">{d.label}</h3>
                  </div>
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: d.color }} />
                </div>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">{d.desc}</p>
                <div
                  className="mt-5 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-white transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: d.color }}
                >
                  {d.cta} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">Also explore inside the platform</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
      </section>

      {/* Personalised Demo Links */}
      <section className="py-14 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Shareable Demos</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Want a Personalised Demo?</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
              Request a shareable demo link from our team. No login required — just click and explore.
              Each link is personalised and token-gated.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                type: "candidate",
                label: "Candidate Demo",
                desc: "Ward 20 Toronto municipal campaign — CRM, GOTV gap, canvassing, Adoni AI insights.",
                color: "#0A2342",
                icon: MapPin,
              },
              {
                type: "party",
                label: "Party Demo",
                desc: "Ontario provincial party — 124 ridings, donation tracking, province-wide metrics.",
                color: "#1D9E75",
                icon: Globe,
              },
              {
                type: "media",
                label: "Election Night Demo",
                desc: "Live results ticker, mayoral race, approval ratings, flash polls.",
                color: "#dc2626",
                icon: BarChart3,
              },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.type} className="rounded-xl border-2 border-slate-200 bg-white p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${d.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: d.color }} />
                    </div>
                    <h3 className="font-bold text-slate-900">{d.label}</h3>
                  </div>
                  <p className="text-sm text-slate-500 flex-1">{d.desc}</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500">Request required — link from your Poll City contact</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center mt-6 text-sm text-slate-400">
            Already have a link?{" "}
            <span className="text-slate-600 font-medium">
              Add <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">?token=your_token</code> to
              the demo URL your contact sent you.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
