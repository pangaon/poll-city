"use client";

import { MEDIA_DEMO } from "@/lib/demo/seed-data";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface Props {
  prospectName: string | null;
}

function TrendIcon({ trend }: { trend: string }) {
  const n = parseInt(trend, 10);
  if (n > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (n < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

const PARTY_COLOURS: Record<string, string> = {
  NDP:          "#f97316",
  PC:           "#3b82f6",
  Liberal:      "#ef4444",
  Conservative: "#1d4ed8",
  Independent:  "#94a3b8",
  "":           "#64748b",
};

export default function MediaDemoClient({ prospectName }: Props) {
  const { election, toronto, approval, flashPoll } = MEDIA_DEMO;
  const maxVotes = Math.max(...toronto.mayor.map((c) => c.votes));

  const TICKER_ITEMS = [
    "BREAKING: Ward 20 — Alex Chen leads with 52%",
    "Toronto Mayor — Chen leads Williams 38.2%–31.9%",
    `${election.reportingPct}% reporting province-wide`,
    "Ottawa-Vanier — PAO candidate within 800 votes",
    "Hamilton West — PAO holds with +12.3% margin",
    "Brampton East — too close to call",
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0d1b2e", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Live ticker */}
      <div className="w-full overflow-hidden py-2 border-b border-red-500/40"
        style={{ background: "#1a0a0a" }}>
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-0.5 text-xs font-black text-white"
            style={{ background: "#dc2626" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div className="overflow-hidden flex-1 relative">
            <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="text-xs font-semibold text-slate-200 mr-12">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demo banner */}
      <div className="w-full py-2 px-4 text-center text-sm font-semibold text-white flex items-center justify-center gap-4 flex-wrap"
        style={{ background: NAVY, borderBottom: "2px solid #1D9E75" }}>
        <span>
          <span className="opacity-60 mr-2">DEMO</span>
          Live Election Night · {election.name}
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#dc2626" }}>
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{election.name}</h1>
              <p className="text-sm text-slate-400">{election.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: "#dc2626" }}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {election.status}
            </span>
            <span className="text-sm font-semibold text-slate-300">
              {election.reportingPct}% reporting
            </span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Results panel — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mayor race */}
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Toronto</p>
                <p className="text-sm font-black text-white">Mayor</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{election.reportingPct}% precincts reporting</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {toronto.mayor.map((c, i) => {
                const barPct = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
                const partyColor = PARTY_COLOURS[c.party] ?? PARTY_COLOURS["Independent"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {c.leading && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                            style={{ background: GREEN }}>
                            LEADING
                          </span>
                        )}
                        <span className="font-semibold text-slate-200 text-sm">{c.name}</span>
                        {c.party && (
                          <span className="text-[11px] text-slate-400">{c.party}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-sm font-black text-white">{c.pct}%</span>
                        <span className="text-xs text-slate-400 font-mono hidden sm:block">
                          {c.votes.toLocaleString()}
                        </span>
                        {c.change && (
                          <span className="text-[11px] font-semibold"
                            style={{ color: c.change.startsWith("+") ? GREEN : "#f87171" }}>
                            {c.change}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${barPct}%`, background: c.leading ? GREEN : partyColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flash poll */}
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Flash Poll</p>
                <p className="text-sm font-black text-white">{flashPoll.question}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{flashPoll.totalVotes.toLocaleString()} votes</p>
                <p>Closed {flashPoll.closedAt}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {flashPoll.options.map((opt, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-200">{opt.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{opt.pct}%</span>
                      <span className="text-xs text-slate-400 font-mono hidden sm:block">
                        {opt.votes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${opt.pct}%`, background: i === 0 ? GREEN : "#3b82f6" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approval ratings — 1/3 */}
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10" style={{ background: "#112240" }}>
            <div className="px-5 py-4 border-b border-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Approval Ratings</p>
              <p className="text-sm font-black text-white">Political Leaders</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {approval.map((leader, i) => {
                const trendNum = parseInt(leader.trend, 10);
                const partyColor = PARTY_COLOURS[leader.party] ?? "#94a3b8";
                return (
                  <div key={i} className="rounded-xl p-4 bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-white">{leader.name}</p>
                        <p className="text-[11px] text-slate-400">{leader.title}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: partyColor }}>
                        {leader.party}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-black text-white">{leader.approval}%</p>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendIcon trend={leader.trend} />
                        <span className="text-sm font-semibold"
                          style={{ color: trendNum > 0 ? "#4ade80" : trendNum < 0 ? "#f87171" : "#94a3b8" }}>
                          {leader.trend}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${leader.approval}%`, background: partyColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 px-4 py-3"
        style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-slate-300 font-medium">
            Power your election night coverage with Poll City.
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
