import React, { useState } from "react";
import {
  FileText, Download, Filter, Calendar, TrendingUp,
  Users, Home, MapPin, Activity, BarChart2, RefreshCcw,
  Clock, ChevronRight, AlertTriangle, CheckCircle, Target
} from "lucide-react";
import { cn } from "../../utils/cn";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend
} from "recharts";

/* ─── MOCK DATA ──────────────────────────────────────────────── */

const TURF_COMPLETION = [
  { turf: "Ward 4-A", total: 145, completed: 98, pct: 68, color: "#00E5FF" },
  { turf: "Ward 4-B", total: 210, completed: 67, pct: 32, color: "#2979FF" },
  { turf: "North Dist.", total: 180, completed: 160, pct: 89, color: "#00C853" },
  { turf: "Riverdale", total: 88, completed: 11, pct: 12, color: "#FFD600" },
  { turf: "East End", total: 220, completed: 99, pct: 45, color: "#FF9F0A" },
  { turf: "Downtown", total: 310, completed: 310, pct: 100, color: "#00C853" },
];

const DAILY_ACTIVITY = [
  { date: "Apr 6", doors: 180, contacts: 124, supporters: 68 },
  { date: "Apr 7", doors: 245, contacts: 168, supporters: 92 },
  { date: "Apr 8", doors: 320, contacts: 224, supporters: 128 },
  { date: "Apr 9", doors: 198, contacts: 142, supporters: 78 },
  { date: "Apr 10", doors: 410, contacts: 298, supporters: 165 },
  { date: "Apr 11", doors: 388, contacts: 272, supporters: 148 },
  { date: "Apr 12", doors: 475, contacts: 340, supporters: 192 },
];

const CONTACT_OUTCOMES = [
  { name: "Strong Support", value: 1842, color: "#00C853" },
  { name: "Soft Support", value: 934, color: "#00E5FF" },
  { name: "Undecided", value: 1204, color: "#FFD600" },
  { name: "Soft Against", value: 412, color: "#FF9F0A" },
  { name: "Strong Against", value: 288, color: "#FF3B30" },
  { name: "Not Home", value: 2100, color: "#2979FF" },
  { name: "Refused", value: 220, color: "#6B72A0" },
];

const VOLUNTEER_ACTIVITY = [
  { name: "Sarah K.", shifts: 14, doors: 620, hours: 52 },
  { name: "Fatima H.", shifts: 15, doors: 0, hours: 60 },
  { name: "Aisha M.", shifts: 12, doors: 0, hours: 44 },
  { name: "Marcus T.", shifts: 11, doors: 445, hours: 38 },
  { name: "Lisa N.", shifts: 9, doors: 740, hours: 31 },
  { name: "Dev P.", shifts: 8, doors: 310, hours: 29 },
];

const RADAR_DATA = [
  { metric: "Canvassing", score: 82 },
  { metric: "Lit Drops", score: 61 },
  { metric: "Sign Install", score: 88 },
  { metric: "Volunteer Engage.", score: 74 },
  { metric: "Contact Rate", score: 56 },
  { metric: "Supporter ID", score: 70 },
];

const WEEKLY_SUMMARY = [
  { week: "Wk 1", doors: 820, lit: 450, signs: 22 },
  { week: "Wk 2", doors: 1240, lit: 620, signs: 31 },
  { week: "Wk 3", doors: 1680, lit: 880, signs: 48 },
  { week: "Wk 4 (curr)", doors: 1980, lit: 1060, signs: 51 },
];

const DAILY_SUMMARY_DATA = [
  { label: "Total Turfs", value: "12", sub: "8 started · 4 complete", color: "#2979FF" },
  { label: "Doors Attempted", value: "8,904", sub: "+475 today", color: "#00E5FF" },
  { label: "Contact Rate", value: "54.2%", sub: "+2.1% vs prev week", color: "#00C853" },
  { label: "Supporters ID'd", value: "2,776", sub: "31.1% of contacts", color: "#FFD600" },
  { label: "Lit Pieces Dropped", value: "6,720", sub: "87% of target", color: "#FF9F0A" },
  { label: "Signs Installed", value: "51", sub: "3 pending removal", color: "#00C853" },
];

const EXCEPTIONS = [
  { type: "Untouched Area", detail: "Grid Gamma — 180 households not yet contacted", severity: "critical", time: "Current" },
  { type: "Stalled Turf", detail: "East End stuck at 45% for 3 days", severity: "warning", time: "3d ago" },
  { type: "Blocked Zone", detail: "Parkside Dr — gated access pending resolution", severity: "warning", time: "1d ago" },
  { type: "Coverage Gap", detail: "Ward 4-A volunteer no-show — 12 doors uncovered", severity: "critical", time: "Today" },
];

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#050A1F] border border-[#2979FF] rounded px-3 py-2 shadow-[0_0_20px_rgba(41,121,255,0.3)] text-[11px]">
      <p className="font-black text-[#AAB2FF] mb-1 uppercase tracking-wider">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

type Tab = "overview" | "turf" | "contacts" | "volunteers" | "exceptions";

export function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dateRange, setDateRange] = useState("This Week");

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Field Summary", icon: Activity },
    { id: "turf", label: "Turf Completion", icon: MapPin },
    { id: "contacts", label: "Contact Rates", icon: Home },
    { id: "volunteers", label: "Volunteer Activity", icon: Users },
    { id: "exceptions", label: "Exceptions", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* Header */}
      <div className="px-8 pt-7 pb-4 border-b border-[#2979FF]/20 flex-shrink-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
              <BarChart2 size={28} className="text-[#00E5FF]" style={{ filter: "drop-shadow(0 0 10px #00E5FF)" }} />
              Reporting & Analytics
            </h1>
            <p className="text-[#00E5FF] text-xs font-bold tracking-[0.2em] uppercase mt-1">
              Field Operations Intelligence · Apr 6 – Apr 12, 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-[#0F1440] border border-[#2979FF]/30 text-[#F5F7FF] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#00E5FF] transition-all"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Campaign to Date</option>
            </select>
            <button className="flex items-center gap-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#00E5FF]/20 transition-all">
              <Download size={13} /> Export CSV
            </button>
            <button className="flex items-center gap-2 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_15px_rgba(41,121,255,0.3)]">
              <FileText size={13} /> Generate PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#050A1F] border border-[#2979FF]/20 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id
                  ? "bg-[#2979FF] text-white shadow-[0_0_15px_rgba(41,121,255,0.4)]"
                  : "text-[#6B72A0] hover:text-[#AAB2FF]"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* Summary KPIs */}
            <div className="grid grid-cols-6 gap-4">
              {DAILY_SUMMARY_DATA.map((s, i) => (
                <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 relative overflow-hidden group hover:border-[#00E5FF]/30 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-10" style={{ backgroundColor: s.color }} />
                  <div className="text-[8px] font-black uppercase tracking-widest text-[#6B72A0] mb-2">{s.label}</div>
                  <div className="text-2xl font-black mb-1" style={{ color: s.color, textShadow: `0 0 10px ${s.color}40` }}>{s.value}</div>
                  <div className="text-[9px] text-[#AAB2FF]">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-3 gap-5">

              {/* Daily Activity */}
              <div className="col-span-2 bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] flex items-center gap-2">
                    <Activity size={12} className="text-[#00E5FF]" /> Daily Field Activity (7 Days)
                  </h3>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-[#00E5FF]"><span className="w-3 h-0.5 bg-[#00E5FF] inline-block" />Doors</span>
                    <span className="flex items-center gap-1.5 text-[#2979FF]"><span className="w-3 h-0.5 bg-[#2979FF] inline-block" />Contacts</span>
                    <span className="flex items-center gap-1.5 text-[#00C853]"><span className="w-3 h-0.5 bg-[#00C853] inline-block" />Supporters</span>
                  </div>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={DAILY_ACTIVITY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="doors" name="Doors" stroke="#00E5FF" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="contacts" name="Contacts" stroke="#2979FF" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="supporters" name="Supporters" stroke="#00C853" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4 flex items-center gap-2">
                  <Target size={12} className="text-[#FF3B30]" /> Ops Performance Radar
                </h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={RADAR_DATA} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                      <PolarGrid stroke="rgba(41,121,255,0.2)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#6B72A0", fontSize: 8, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="score" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Weekly Cumulative */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4 flex items-center gap-2">
                <TrendingUp size={12} className="text-[#FFD600]" /> Weekly Campaign Progress
              </h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_SUMMARY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="doors" name="Doors" fill="#00E5FF" radius={[2, 2, 0, 0]} opacity={0.8} />
                    <Bar dataKey="lit" name="Lit Drop" fill="#FFD600" radius={[2, 2, 0, 0]} opacity={0.8} />
                    <Bar dataKey="signs" name="Signs" fill="#00C853" radius={[2, 2, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TURF TAB ── */}
        {activeTab === "turf" && (
          <div className="space-y-5">
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-5 flex items-center gap-2">
                <MapPin size={12} className="text-[#00E5FF]" /> Turf Completion by Zone
              </h3>
              <div className="space-y-5">
                {TURF_COMPLETION.map(t => (
                  <div key={t.turf}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-bold text-[#F5F7FF]">{t.turf}</span>
                        <span className="text-[9px] font-bold text-[#6B72A0]">{t.completed}/{t.total} doors</span>
                      </div>
                      <span className="text-[13px] font-black" style={{ color: t.color, textShadow: `0 0 8px ${t.color}50` }}>
                        {t.pct}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${t.pct}%`, backgroundColor: t.color, boxShadow: `0 0 10px ${t.color}60` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4">Turf Status Bar Chart</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={TURF_COMPLETION} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="turf" axisLine={false} tickLine={false} tick={{ fill: "#AAB2FF", fontSize: 10, fontWeight: 700 }} width={80} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Completion"]} contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "6px", color: "#F5F7FF", fontSize: "11px" }} />
                    <Bar dataKey="pct" name="Completion" radius={[0, 4, 4, 0]} barSize={20}>
                      {TURF_COMPLETION.map((t, i) => (
                        <Cell key={i} fill={t.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {activeTab === "contacts" && (
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4 flex items-center gap-2">
                <Home size={12} className="text-[#00C853]" /> Contact Outcome Breakdown
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CONTACT_OUTCOMES}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      paddingAngle={2}
                    >
                      {CONTACT_OUTCOMES.map((o, i) => (
                        <Cell key={i} fill={o.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "6px", color: "#F5F7FF", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4">Outcome Legend</h3>
              <div className="space-y-3">
                {CONTACT_OUTCOMES.map(o => {
                  const total = CONTACT_OUTCOMES.reduce((a, x) => a + x.value, 0);
                  const pct = Math.round((o.value / total) * 100);
                  return (
                    <div key={o.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: o.color, boxShadow: `0 0 6px ${o.color}` }} />
                          <span className="text-[11px] font-bold text-[#F5F7FF]">{o.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black" style={{ color: o.color }}>{o.value.toLocaleString()}</span>
                          <span className="text-[9px] text-[#6B72A0]">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: o.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-2 bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4">Contact Rate Trend (7 Days)</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={DAILY_ACTIVITY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs key="defs">
                      <linearGradient key="suppGrad" id="suppGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop key="stop1" offset="5%" stopColor="#00C853" stopOpacity={0.3} />
                        <stop key="stop2" offset="95%" stopColor="#00C853" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis key="xAxis" dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <YAxis key="yAxis" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <Tooltip key="tooltip" content={<ChartTooltip />} />
                    <Area key="area1" type="monotone" dataKey="supporters" name="Supporters" stroke="#00C853" strokeWidth={2} fill="url(#suppGrad)" />
                    <Area key="area2" type="monotone" dataKey="contacts" name="Contacts" stroke="#2979FF" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── VOLUNTEERS TAB ── */}
        {activeTab === "volunteers" && (
          <div className="space-y-5">
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2979FF]/20">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] flex items-center gap-2">
                  <Users size={12} className="text-[#00E5FF]" /> Volunteer Performance Leaderboard
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2979FF]/20">
                    {["#", "Volunteer", "Shifts", "Hours", "Doors", "Efficiency", "Trend"].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VOLUNTEER_ACTIVITY.map((v, i) => {
                    const efficiency = v.doors > 0 ? Math.round(v.doors / v.hours) : 0;
                    const medalColors = ["#FFD600", "#AAB2FF", "#FF9F0A"];
                    return (
                      <tr key={v.name} className="border-b border-[#2979FF]/10 hover:bg-[#2979FF]/5 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[12px] font-black" style={{ color: i < 3 ? medalColors[i] : "#6B72A0" }}>#{i + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2979FF]/20 border border-[#2979FF]/30 flex items-center justify-center text-[10px] font-black text-[#00E5FF]">
                              {v.name.charAt(0)}
                            </div>
                            <span className="text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{v.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-bold text-[#F5F7FF]">{v.shifts}</td>
                        <td className="px-6 py-4 text-[12px] font-bold text-[#00E5FF]">{v.hours}h</td>
                        <td className="px-6 py-4 text-[12px] font-bold text-[#00C853]">{v.doors.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2979FF] to-[#00E5FF]"
                                style={{ width: `${Math.min(efficiency * 3, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-[#AAB2FF]">{efficiency > 0 ? `${efficiency}/h` : "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-[#00C853] flex items-center gap-1">
                            <TrendingUp size={10} /> +12%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EXCEPTIONS TAB ── */}
        {activeTab === "exceptions" && (
          <div className="space-y-4 max-w-3xl">
            <div className="bg-[#140505]/80 border border-[#FF3B30]/30 rounded-xl overflow-hidden">
              <div className="bg-[#FF3B30]/10 px-6 py-4 border-b border-[#FF3B30]/20 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-[#FF3B30] uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertTriangle size={12} /> Operational Exceptions & Alerts
                </h3>
                <button className="text-[9px] font-black text-[#FF3B30] uppercase tracking-widest border border-[#FF3B30]/30 px-3 py-1.5 rounded hover:bg-[#FF3B30]/10 transition-all">
                  Export Report
                </button>
              </div>
              <div className="divide-y divide-[#FF3B30]/10">
                {EXCEPTIONS.map((ex, i) => (
                  <div key={i} className="p-6 flex items-start gap-4 hover:bg-[#FF3B30]/5 transition-colors">
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{
                        backgroundColor: ex.severity === "critical" ? "#FF3B30" : "#FFD600",
                        boxShadow: `0 0 8px ${ex.severity === "critical" ? "#FF3B30" : "#FFD600"}`
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: ex.severity === "critical" ? "rgba(255,59,48,0.15)" : "rgba(255,214,0,0.15)",
                            color: ex.severity === "critical" ? "#FF3B30" : "#FFD600",
                            border: `1px solid ${ex.severity === "critical" ? "#FF3B30" : "#FFD600"}40`
                          }}
                        >
                          {ex.severity}
                        </span>
                        <span className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest">{ex.type}</span>
                        <span className="text-[9px] text-[#6B72A0] ml-auto">{ex.time}</span>
                      </div>
                      <p className="text-[12px] font-bold text-[#F5F7FF]">{ex.detail}</p>
                    </div>
                    <button className="text-[9px] font-black text-[#00E5FF] uppercase tracking-widest hover:text-white transition-colors flex-shrink-0 ml-2">
                      Resolve →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4">Pre-Built Report Templates</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Canvass Coverage Report", desc: "Turf completion, door rates, outcome summary" },
                  { name: "Volunteer Hours Summary", desc: "Shifts, hours, and productivity per volunteer" },
                  { name: "Daily Field Brief", desc: "Today's activity, alerts, and next actions" },
                  { name: "Lit Drop Completion", desc: "Zone status, missed homes, blocked areas" },
                  { name: "Sign Operations Status", desc: "Install/remove counts, photo verification" },
                  { name: "Weekly Executive Summary", desc: "High-level KPIs for campaign leadership" },
                ].map((t, i) => (
                  <button key={i} className="text-left bg-[#050A1F] border border-[#2979FF]/20 rounded-xl p-4 hover:border-[#00E5FF]/40 hover:bg-[#0F1440]/50 transition-all group">
                    <div className="text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors mb-1">{t.name}</div>
                    <div className="text-[10px] text-[#6B72A0]">{t.desc}</div>
                    <div className="text-[9px] font-black text-[#2979FF] uppercase tracking-widest mt-3 group-hover:text-[#00E5FF] transition-colors flex items-center gap-1">
                      Generate <ChevronRight size={10} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
