"use client";

import { PARTY_DEMO } from "@/lib/demo/seed-data";
import { ArrowRight, Users, MapPin, DollarSign, Target, TrendingUp } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface Props {
  prospectName: string | null;
}

export default function PartyDemoClient({ prospectName }: Props) {
  const { party, stats, ridings } = PARTY_DEMO;
  const donationPct = Math.round((stats.totalDonations / stats.donationGoal) * 100);

  return (
    <div className="min-h-screen" style={{ background: "#0d1b2e", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Demo banner */}
      <div className="w-full py-2 px-4 text-center text-sm font-semibold text-white flex items-center justify-center gap-4 flex-wrap"
        style={{ background: NAVY, borderBottom: "2px solid #1D9E75" }}>
        <span>
          <span className="opacity-60 mr-2">DEMO</span>
          {party.name} · {party.ridings} Ridings
          {prospectName && <span className="opacity-70"> · Prepared for {prospectName}</span>}
        </span>
        <a href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold"
          style={{ background: GREEN, color: "#fff" }}>
          Start Your Free Trial <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white">{party.name}</h1>
            <p className="text-sm text-slate-400">
              {party.province} · Leader: {party.leader} · Election: {party.electionDate}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "#1D9E7520", color: GREEN, border: `1px solid ${GREEN}40` }}>
            <span className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
            Provincial HQ
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Members", value: stats.totalMembers.toLocaleString(), color: "#60a5fa", icon: Users },
            { label: "Active Ridings", value: stats.activeRidings.toString(), color: GREEN, icon: MapPin },
            { label: "Target Ridings", value: stats.targetRidings.toString(), color: "#fbbf24", icon: Target },
            { label: "Raised", value: `$${(stats.totalDonations / 1_000_000).toFixed(2)}M`, color: "#34d399", icon: DollarSign },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-4 border border-white/10" style={{ background: "#112240" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ridings table — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: GREEN }} />
                <p className="text-sm font-bold text-white">Riding Breakdown</p>
              </div>
              <span className="text-xs text-slate-400">Showing 6 of {party.ridings}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Riding</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Margin</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Contacts</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Volunteers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ridings.map((r, i) => {
                    const isHeld = r.status === "Held";
                    return (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-200">{r.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={isHeld
                              ? { background: "#dcfce7", color: "#15803d" }
                              : { background: "#fef9c3", color: "#a16207" }}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="font-mono text-sm font-semibold"
                            style={{ color: r.margin.startsWith("+") ? GREEN : "#f87171" }}>
                            {r.margin}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-slate-300 font-medium">
                          {r.contacts.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-slate-300 font-medium">
                          {r.volunteers}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Province map placeholder */}
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: GREEN }} />
              <p className="text-sm font-bold text-white">Province-wide Riding Map</p>
            </div>
            <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${GREEN}20`, border: `1px solid ${GREEN}40` }}>
                <MapPin className="w-7 h-7" style={{ color: GREEN }} />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">Province-wide riding map</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Interactive choropleth map showing support levels, canvass coverage, and GOTV status
                across all {party.ridings} Ontario ridings. Available in the full platform.
              </p>
              <a href="/login" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors"
                style={{ background: NAVY, border: `1px solid ${GREEN}40` }}>
                See full platform <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-5">

          {/* Donation progress */}
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "#112240" }}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4" style={{ color: GREEN }} />
              <p className="text-sm font-bold text-white">Fundraising</p>
            </div>
            <p className="text-3xl font-black text-white mb-1">
              ${(stats.totalDonations / 1_000_000).toFixed(2)}M
            </p>
            <p className="text-xs text-slate-400 mb-3">
              of ${(stats.donationGoal / 1_000_000).toFixed(1)}M goal
            </p>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-1.5">
              <div className="h-full rounded-full" style={{ width: `${donationPct}%`, background: GREEN }} />
            </div>
            <p className="text-xs text-slate-400">{donationPct}% of election goal raised</p>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl p-5 border border-white/10 space-y-3" style={{ background: "#112240" }}>
            <p className="text-sm font-bold text-white">Province-wide Metrics</p>
            {[
              { label: "Total Members", value: stats.totalMembers.toLocaleString(), icon: Users },
              { label: "Volunteers Active", value: stats.volunteers.toLocaleString(), icon: Users },
              { label: "Upcoming Events", value: stats.events.toString(), icon: TrendingUp },
              { label: "Target Ridings", value: stats.targetRidings.toString(), icon: Target },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-300">{m.label}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{m.value}</span>
                </div>
              );
            })}
          </div>

          {/* Riding breakdown mini */}
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "#112240" }}>
            <p className="text-sm font-bold text-white mb-4">Riding Status</p>
            <div className="space-y-2">
              {[
                { label: "Held Ridings", count: ridings.filter(r => r.status === "Held").length, total: party.ridings, color: GREEN },
                { label: "Target Ridings", count: party.targetRidings, total: party.ridings, color: "#fbbf24" },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{b.label}</span>
                    <span>{b.count} / {b.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round((b.count / b.total) * 100)}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 px-4 py-3"
        style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-slate-300 font-medium">
            Ready to run your provincial campaign?
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
