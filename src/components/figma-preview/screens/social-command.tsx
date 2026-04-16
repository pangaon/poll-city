"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Activity, TrendingUp, Shield, Users, BarChart2, AlertTriangle, Radio, Target, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const SENTIMENT_TREND = [
  { t: "00:00", pos: 58, neg: 22, neut: 20 },
  { t: "04:00", pos: 55, neg: 25, neut: 20 },
  { t: "08:00", pos: 62, neg: 18, neut: 20 },
  { t: "12:00", pos: 71, neg: 14, neut: 15 },
  { t: "16:00", pos: 68, neg: 17, neut: 15 },
  { t: "20:00", pos: 74, neg: 12, neut: 14 },
];

const RADAR_DATA = [
  { subject: "Economy", A: 72 },
  { subject: "Climate", A: 88 },
  { subject: "Safety", A: 65 },
  { subject: "Housing", A: 79 },
  { subject: "Transit", A: 58 },
  { subject: "Health", A: 83 },
];

const LIVE_SIGNALS = [
  { id: 1, type: "spike", color: "#FF3B30", icon: AlertTriangle, title: "Dissent Spike — Ward 7", desc: "Housing opposition up 34% in last 2h", time: "2m ago" },
  { id: 2, type: "positive", color: "#00E676", icon: TrendingUp, title: "Climate Surge", desc: "Positive engagement on green budget +18%", time: "8m ago" },
  { id: 3, type: "neutral", color: "#FFD600", icon: Radio, title: "Transit Debate Active", desc: "High volume across all districts", time: "15m ago" },
  { id: 4, type: "positive", color: "#00E5FF", icon: Target, title: "Core Base Energised", desc: "Youth vote intent up 12pts this week", time: "1h ago" },
];

const TABS = ["overview", "signals", "districts", "intel"] as const;

export function SocialCommand() {
  const [tab, setTab] = useState<typeof TABS[number]>("overview");

  return (
    <div className="h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
        <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter flex items-center gap-2">
          <Globe size={20} className="text-[#00E5FF]" /> Command Centre
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            LIVE
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-[#2979FF]/20 bg-[#0F1440]/40 flex items-center gap-1 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative", tab === t ? "text-[#00E5FF]" : "text-[#AAB2FF] hover:text-[#F5F7FF]")}
          >
            {tab === t && (
              <motion.div layoutId="sc-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            )}
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Approval Index", value: "71.4%", color: "#00E5FF", icon: Activity, change: "+4.2pts" },
                { label: "Signal Volume", value: "94.2K", color: "#2979FF", icon: Radio, change: "+12%" },
                { label: "Threat Level", value: "LOW", color: "#00C853", icon: Shield, change: "Stable" },
                { label: "Coalition Size", value: "28.4K", color: "#FFD600", icon: Users, change: "+890" },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[40px] opacity-20" style={{ backgroundColor: kpi.color }} />
                  <div className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">{kpi.label}</div>
                  <div className="text-2xl font-black text-[#F5F7FF] mb-1">{kpi.value}</div>
                  <div className="text-[11px] font-bold" style={{ color: kpi.color }}>{kpi.change}</div>
                </div>
              ))}
            </div>

            {/* Sentiment Trend + Radar */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Activity size={12} className="text-[#00E5FF]" /> Sentiment Stream (24h)
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SENTIMENT_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E676" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="scNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                      <Area type="monotone" dataKey="pos" stroke="#00E676" strokeWidth={2} fill="url(#scPos)" name="Positive" />
                      <Area type="monotone" dataKey="neg" stroke="#FF3B30" strokeWidth={2} fill="url(#scNeg)" name="Negative" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <BarChart2 size={12} className="text-[#00E5FF]" /> Issue Map
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke="#2979FF" strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#AAB2FF", fontSize: 8, fontWeight: 700 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Live Signals */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
              <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap size={12} className="text-[#FFD600]" /> Live Signals
              </h3>
              <div className="space-y-3">
                {LIVE_SIGNALS.map((signal) => (
                  <div key={signal.id} className="flex items-start gap-4 p-3 rounded-lg bg-[#050A1F]/60 border border-[#2979FF]/10 hover:border-[#2979FF]/30 transition-all cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${signal.color}15`, border: `1px solid ${signal.color}40` }}>
                      <signal.icon size={16} style={{ color: signal.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#F5F7FF] text-[13px] truncate">{signal.title}</div>
                      <div className="text-[11px] text-[#AAB2FF] mt-0.5">{signal.desc}</div>
                    </div>
                    <span className="text-[10px] font-mono text-[#6B72A0] flex-shrink-0">{signal.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab !== "overview" && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Globe size={48} className="text-[#2979FF] mx-auto mb-4 opacity-40" />
              <div className="text-[#00E5FF] text-xl font-black uppercase tracking-widest mb-2">{tab.toUpperCase()}</div>
              <div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Module Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
