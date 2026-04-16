"use client";
import React, { useState } from "react";
import { FileText, Download, TrendingUp, Users, Home, MapPin, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const areaData = [{ d: "Apr 8", contacts: 89, doors: 124 }, { d: "Apr 9", contacts: 112, doors: 156 }, { d: "Apr 10", contacts: 145, doors: 198 }, { d: "Apr 11", contacts: 134, doors: 187 }, { d: "Apr 12", contacts: 178, doors: 234 }, { d: "Apr 13", contacts: 201, doors: 267 }, { d: "Apr 14", contacts: 224, doors: 298 }];
const barData = [{ ward: "W1", votes: 1240 }, { ward: "W2", votes: 890 }, { ward: "W3", votes: 2100 }, { ward: "W4", votes: 1560 }, { ward: "W5", votes: 980 }];
const pieData = [{ name: "Strong Support", value: 35, fill: "#00C853" }, { name: "Lean Support", value: 22, fill: "#2979FF" }, { name: "Undecided", value: 28, fill: "#FFD600" }, { name: "Lean Oppose", value: 10, fill: "#FF9800" }, { name: "Strong Oppose", value: 5, fill: "#FF3B30" }];
const radarData = [{ subject: "Canvassing", A: 84 }, { subject: "Phone Bank", A: 72 }, { subject: "Signs", A: 90 }, { subject: "Online", A: 65 }, { subject: "Events", A: 78 }, { subject: "Donations", A: 88 }];

const TABS = ["overview", "turf", "contacts", "volunteers", "exceptions"] as const;

export function Reports() {
  const [tab, setTab] = useState<typeof TABS[number]>("overview");

  return (
    <div className="flex flex-col h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
        <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter flex items-center gap-2"><FileText size={20} className="text-[#00E5FF]" /> Intelligence Reports</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all", tab === t ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "text-[#AAB2FF] border border-transparent hover:border-[#2979FF]/30")}>{t}</button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 border border-[#2979FF]/40 text-[#AAB2FF] px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest hover:text-[#F5F7FF] transition-all"><Download size={12} /> Export</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4">
              {[{ label: "Total Contacts", value: "45,231", icon: Users, color: "#2979FF", change: "+12.5%" }, { label: "Doors Knocked", value: "8,904", icon: Home, color: "#00E5FF", change: "+3.2%" }, { label: "Approval Rating", value: "54.2%", icon: TrendingUp, color: "#00C853", change: "+4.1%" }, { label: "Campaign Activity", value: "1,204", icon: Activity, color: "#FFD600", change: "+8.7%" }].map((kpi, i) => (
                <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[40px] opacity-20" style={{ backgroundColor: kpi.color }} />
                  <div className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">{kpi.label}</div>
                  <div className="text-2xl font-black text-[#F5F7FF] mb-1">{kpi.value}</div>
                  <div className="text-[11px] font-bold" style={{ color: kpi.color }}>{kpi.change} this week</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Field Activity (7 Days)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rContacts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/></linearGradient>
                        <linearGradient id="rDoors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2979FF" stopOpacity={0.4}/><stop offset="95%" stopColor="#2979FF" stopOpacity={0}/></linearGradient>
                      </defs>
                      <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                      <Area type="monotone" dataKey="contacts" stroke="#00E5FF" strokeWidth={2} fill="url(#rContacts)" />
                      <Area type="monotone" dataKey="doors" stroke="#2979FF" strokeWidth={2} fill="url(#rDoors)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Voter Sentiment</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Ward Performance</h3>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="ward" axisLine={false} tickLine={false} tick={{ fill: "#AAB2FF", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                      <Bar dataKey="votes" radius={[4, 4, 0, 0]}>{barData.map((_, i) => <Cell key={i} fill={i === 2 ? "#00E5FF" : "#2979FF"} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Campaign Radar</h3>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2979FF" strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#AAB2FF", fontSize: 9, fontWeight: 700 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab !== "overview" && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center"><FileText size={48} className="text-[#2979FF] mx-auto mb-4 opacity-40" /><div className="text-[#00E5FF] text-xl font-black uppercase tracking-widest mb-2">{tab.toUpperCase()} REPORT</div><div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Data streaming...</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
