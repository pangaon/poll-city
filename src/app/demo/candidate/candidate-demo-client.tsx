"use client";

import { CANDIDATE_DEMO } from "@/lib/demo/seed-data";
import { type LucideProps } from "lucide-react";
import {
  MapPin, DollarSign, Users, Phone, Bot, AlertTriangle,
  ArrowRight, TrendingUp, Flag, Zap, Activity,
} from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

const SUPPORT_COLOURS: Record<string, { bg: string; text: string }> = {
  "Strong Support":    { bg: "#dcfce7", text: "#15803d" },
  "Leaning Support":  { bg: "#dbeafe", text: "#1d4ed8" },
  "Unknown":          { bg: "#f1f5f9", text: "#64748b" },
  "Leaning Opposition": { bg: "#fef9c3", text: "#a16207" },
  "Strong Opposition": { bg: "#fee2e2", text: "#b91c1c" },
};

const SEVERITY_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
  critical: { bar: "#ef4444", badge: "#fee2e2", text: "#b91c1c" },
  warning:  { bar: "#f59e0b", badge: "#fef9c3", text: "#a16207" },
  watch:    { bar: "#3b82f6", badge: "#dbeafe", text: "#1d4ed8" },
};

const ACTIVITY_ICON_MAP: Record<string, React.FC<LucideProps>> = {
  map:    MapPin,
  dollar: DollarSign,
  users:  Users,
  flag:   Flag,
  bot:    Bot,
};

interface Props {
  prospectName: string | null;
}

export default function CandidateDemoClient({ prospectName }: Props) {
  const { campaign, stats, gotv, recentActivity, contacts, alerts } = CANDIDATE_DEMO;
  const donationPct = Math.round((stats.donations / stats.donationGoal) * 100);
  const gotvPct = Math.round((gotv.supportersVoted / gotv.winThreshold) * 100);

  return (
    <div className="min-h-screen" style={{ background: "#0d1b2e", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Demo banner */}
      <div className="w-full py-2 px-4 text-center text-sm font-semibold text-white flex items-center justify-center gap-4 flex-wrap"
        style={{ background: NAVY, borderBottom: "2px solid #1D9E75" }}>
        <span>
          <span className="opacity-60 mr-2">DEMO</span>
          {campaign.name} · {campaign.ward}
          {prospectName && <span className="opacity-70"> · Prepared for {prospectName}</span>}
        </span>
        <a href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold transition-colors"
          style={{ background: GREEN, color: "#fff" }}>
          Start Your Free Trial <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white">{campaign.name}</h1>
            <p className="text-sm text-slate-400">{campaign.ward} · {campaign.electionDate}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "#1D9E7520", color: GREEN, border: `1px solid ${GREEN}40` }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />
            Campaign Active
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Contacts", value: stats.totalContacts.toLocaleString(), color: "#60a5fa" },
            { label: "Strong Support", value: stats.strongSupport.toLocaleString(), color: GREEN },
            { label: "GOTV Gap", value: gotv.gap.toLocaleString(), color: "#f87171" },
            { label: "Doors Knocked", value: stats.doorsKnocked.toLocaleString(), color: "#a78bfa" },
            { label: "Days to Election", value: campaign.daysToElection.toString(), color: "#fbbf24" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 border border-white/10" style={{ background: "#112240" }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-5">

          {/* GOTV Gap widget */}
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "#112240" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">GOTV Gap</p>
                <p className="text-5xl font-black" style={{ color: "#f87171" }}>
                  {gotv.gap.toLocaleString()}
                </p>
                <p className="text-sm text-slate-300 mt-1">supporters needed to win</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Win threshold</p>
                <p className="text-lg font-bold text-white">{gotv.winThreshold.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Voted so far</p>
                <p className="text-lg font-bold" style={{ color: GREEN }}>{gotv.supportersVoted.toLocaleString()}</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${gotvPct}%`, background: GREEN }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>{gotv.supportersVoted} voted</span>
              <span>{gotvPct}% of goal</span>
              <span>{gotv.winThreshold} target</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-white">{gotv.p1Count}</p>
                <p className="text-[11px] text-slate-400">P1 — Strong</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{gotv.p2Count}</p>
                <p className="text-[11px] text-slate-400">P2 — Leaning</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{gotv.p3Count}</p>
                <p className="text-[11px] text-slate-400">P3 — Soft</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "#112240" }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: GREEN }} />
              <p className="text-sm font-bold text-white">Recent Activity</p>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item, i) => {
                const Icon = ACTIVITY_ICON_MAP[item.icon] ?? Zap;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: item.type === "adoni" ? "#1D9E7520" : "#ffffff0d" }}>
                      <Icon className="w-3.5 h-3.5"
                        style={{ color: item.type === "adoni" ? GREEN : "#94a3b8" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-snug">{item.text}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact table */}
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: GREEN }} />
              <p className="text-sm font-bold text-white">Contacts</p>
              <span className="ml-auto text-xs text-slate-400">Read-only preview</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Support</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Last Contact</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {contacts.map((c, i) => {
                    const sc = SUPPORT_COLOURS[c.support] ?? SUPPORT_COLOURS["Unknown"];
                    return (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ background: NAVY }}>
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-200">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ background: sc.bg, color: sc.text }}>
                            {c.support}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">{c.lastContact}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs font-mono">{c.phone}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column (40%) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Campaign Alerts */}
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "#112240" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-bold text-white">Campaign Alerts</p>
            </div>
            <div className="space-y-3">
              {alerts.map((a, i) => {
                const ss = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.watch;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: ss.badge }}>
                    <div className="w-1.5 rounded-full mt-1 self-stretch shrink-0" style={{ background: ss.bar }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: ss.text }}>{a.module}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{a.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adoni insight bubble */}
          <div className="rounded-xl p-5 border" style={{ background: "#0d2e1f", borderColor: `${GREEN}40` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: GREEN }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Adoni</p>
                <p className="text-[11px]" style={{ color: GREEN }}>AI Campaign Operator</p>
              </div>
            </div>
            <div className="rounded-lg p-3 border border-white/10 bg-white/5 text-sm text-slate-300 leading-relaxed">
              I&apos;ve analysed your contact list and found <strong className="text-white">193 strong supporters in Ward 20</strong> who have
              not been contacted in over 30 days. At current field pace, you&apos;ll reach only 60% of them before election day.
              I recommend scheduling a targeted phone bank this weekend.
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Analysis run today · 4,179 contacts scanned</p>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl p-5 border border-white/10 space-y-4" style={{ background: "#112240" }}>
            <p className="text-sm font-bold text-white">Campaign Overview</p>

            {/* Donation progress */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Donations</span>
                <span>${stats.donations.toLocaleString()} / ${stats.donationGoal.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${donationPct}%`, background: GREEN }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{donationPct}% of goal</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 bg-white/5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-2xl font-black text-white">{stats.volunteers}</p>
                <p className="text-[11px] text-slate-400">Volunteers</p>
              </div>
              <div className="rounded-lg p-3 bg-white/5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-2xl font-black text-white">{stats.callsCompleted}</p>
                <p className="text-[11px] text-slate-400">Calls Completed</p>
              </div>
            </div>

            <div className="rounded-lg p-3 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-300">Doors Knocked</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.doorsKnocked.toLocaleString()}</span>
            </div>

            <div className="rounded-lg p-3 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-300">Contacted</span>
              </div>
              <span className="text-sm font-bold text-white">
                {stats.contacted.toLocaleString()} / {stats.totalContacts.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 px-4 py-3"
        style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-slate-300 font-medium">
            Ready to run your own campaign?
          </p>
          <div className="flex items-center gap-3">
            <a href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: GREEN }}>
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/20 hover:bg-white/5 transition-colors">
              Book a Demo Call
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
