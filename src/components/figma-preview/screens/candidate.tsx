"use client";
import React, { useState } from "react";
import { User, Star, Calendar, MapPin, Phone, Mail, Globe, Mic, FileText, TrendingUp, Award, BookOpen, Heart, DollarSign, Users, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const POLL_DATA = [
  { date: "Jan", candidate: 38, opponent: 42, undecided: 20 },
  { date: "Feb", candidate: 40, opponent: 40, undecided: 20 },
  { date: "Mar", candidate: 44, opponent: 38, undecided: 18 },
  { date: "Apr", candidate: 48, opponent: 36, undecided: 16 },
];

const FUNDRAISING_DATA = [
  { month: "Jan", raised: 80000 }, { month: "Feb", raised: 145000 }, { month: "Mar", raised: 210000 }, { month: "Apr", raised: 340000 },
];

const RADAR_DATA = [
  { subject: "Economy", A: 88 }, { subject: "Healthcare", A: 76 }, { subject: "Climate", A: 92 }, { subject: "Safety", A: 70 }, { subject: "Housing", A: 84 }, { subject: "Transit", A: 68 },
];

const TABS = ["overview", "polling", "fundraising", "schedule", "press"] as const;

export function Candidate() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("overview");

  return (
    <div className="flex flex-col h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      {/* Hero Banner */}
      <div className="relative h-[200px] bg-gradient-to-r from-[#0F1440] via-[#2979FF]/20 to-[#050A1F] flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoNDEsIDEyMSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050A1F] to-transparent" />
        <div className="relative z-10 p-6 flex items-end h-full">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#2979FF] to-[#00E5FF] flex items-center justify-center text-4xl font-black text-[#050A1F] shadow-[0_0_30px_rgba(0,229,255,0.6)] border-2 border-[#00E5FF]/50">JC</div>
            <div>
              <div className="text-3xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Mayor Jane Chen</div>
              <div className="text-[#00E5FF] text-sm font-bold mt-1 uppercase tracking-widest">Ward 4 · Municipal Election · Oct 2026</div>
              <div className="flex items-center gap-4 mt-2">
                {["Democracy First", "Climate Action", "Affordable Housing"].map((tag, i) => (
                  <span key={i} className="text-[10px] font-black uppercase tracking-widest bg-[#2979FF]/20 text-[#AAB2FF] px-2 py-0.5 rounded border border-[#2979FF]/40">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-[#2979FF]/20 bg-[#0F1440]/60 backdrop-blur-md flex items-center gap-1 flex-shrink-0 relative">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative", activeTab === tab ? "text-[#00E5FF]" : "text-[#AAB2FF] hover:text-[#F5F7FF]")}>
            {activeTab === tab && (
              <motion.div layoutId="tab-pill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {/* Bio */}
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><User size={14} className="text-[#00E5FF]" /> Candidate Profile</h3>
                <p className="text-[#AAB2FF] leading-relaxed mb-4">Jane Chen has served Ward 4 for 8 years on city council. A former urban planner with a background in public policy, she is running on a platform of climate action, affordable housing, and community safety.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[{ icon: MapPin, label: "Ward", value: "Ward 4, District 5" }, { icon: Calendar, label: "Election", value: "October 27, 2026" }, { icon: Phone, label: "HQ", value: "(416) 555-0192" }, { icon: Mail, label: "Press", value: "press@chenformayor.ca" }].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm"><item.icon size={14} className="text-[#2979FF] flex-shrink-0" /><div><div className="text-[10px] text-[#6B72A0] uppercase tracking-widest">{item.label}</div><div className="font-bold text-[#F5F7FF]">{item.value}</div></div></div>
                  ))}
                </div>
              </div>

              {/* Poll Trend */}
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-[#00E5FF]" /> Poll Trend</h3>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={POLL_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#AAB2FF", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                      <Line type="monotone" dataKey="candidate" stroke="#00E5FF" strokeWidth={2} dot={false} name="Chen" />
                      <Line type="monotone" dataKey="opponent" stroke="#FF3B30" strokeWidth={2} dot={false} name="Opponent" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Approval Score */}
              <div className="bg-[#0F1440]/60 border border-[#00E5FF]/30 rounded-xl p-6 text-center">
                <h3 className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Current Approval</h3>
                <div className="text-6xl font-black text-[#00E5FF] drop-shadow-[0_0_20px_#00E5FF]">54%</div>
                <div className="text-[#00C853] text-sm font-bold mt-2 flex items-center justify-center gap-1"><TrendingUp size={14} /> +6pts this month</div>
              </div>

              {/* Issue Radar */}
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-3">Issue Strength</h3>
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
          </div>
        )}

        {activeTab === "fundraising" && (
          <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
            <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Fundraising Performance</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FUNDRAISING_DATA}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#AAB2FF", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Raised"]} />
                  <Bar dataKey="raised" radius={[4, 4, 0, 0]}>{FUNDRAISING_DATA.map((_, i) => <Cell key={i} fill={i === FUNDRAISING_DATA.length - 1 ? "#FFD600" : "#2979FF"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!["overview", "fundraising"].includes(activeTab) && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center"><User size={48} className="text-[#2979FF] mx-auto mb-4 opacity-40" /><div className="text-[#00E5FF] text-xl font-black uppercase tracking-widest mb-2">{activeTab.toUpperCase()}</div><div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Module Active</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
