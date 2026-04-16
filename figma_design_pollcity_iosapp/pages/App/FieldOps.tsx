import React, { useState } from "react";
import {
  Map, Users, Home, BookOpen, MapPin, AlertTriangle,
  CheckCircle, Clock, ChevronRight, Plus, Radio,
  Activity, Package, Zap, Target, Filter, RefreshCcw,
  Phone, Crosshair, Navigation, Layers, Eye, X,
  TrendingUp, MoreHorizontal, ArrowUpRight
} from "lucide-react";
import { cn } from "../../utils/cn";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

/* ─── MOCK DATA ──────────────────────────────────────────────── */

const PROGRAMS = [
  { id: 1, name: "Ward 4 – Canvass Sprint", type: "canvass", status: "active", teams: 3, progress: 62, completed: 1240, target: 2000, color: "#00E5FF", typeIcon: Home },
  { id: 2, name: "North Dist. – Lit Drop", type: "lit-drop", status: "active", teams: 2, progress: 38, completed: 760, target: 2000, color: "#FFD600", typeIcon: BookOpen },
  { id: 3, name: "Riverdale – Sign Blitz", type: "sign-install", status: "active", teams: 1, progress: 85, completed: 51, target: 60, color: "#00C853", typeIcon: MapPin },
  { id: 4, name: "Downtown – GOTV Push", type: "canvass", status: "paused", teams: 2, progress: 44, completed: 880, target: 2000, color: "#2979FF", typeIcon: Home },
  { id: 5, name: "East End – Lit Drop", type: "lit-drop", status: "pending", teams: 0, progress: 0, completed: 0, target: 1500, color: "#FF3B30", typeIcon: BookOpen },
];

const ROSTER = [
  { name: "Marcus T.", role: "Canvasser", turf: "Ward 4-A", status: "active", checkin: "09:14", doors: 42 },
  { name: "Sarah K.", role: "Team Lead", turf: "North Dist.", status: "active", checkin: "08:45", doors: 38 },
  { name: "Dev P.", role: "Canvasser", turf: "Ward 4-B", status: "active", checkin: "09:22", doors: 29 },
  { name: "Aisha M.", role: "Sign Crew", turf: "Riverdale", status: "active", checkin: "09:01", doors: 14 },
  { name: "Tom R.", role: "Canvasser", turf: "Ward 4-A", status: "late", checkin: "—", doors: 0 },
  { name: "Lisa N.", role: "Lit Drop", turf: "North Dist.", status: "active", checkin: "09:35", doors: 55 },
];

const ALERTS = [
  { level: "critical", msg: "Turf 4-C unassigned — 220 doors uncovered", time: "3m ago", action: "Assign Now" },
  { level: "critical", msg: "Tom R. hasn't checked in — coverage gap Ward 4-A", time: "22m ago", action: "Contact" },
  { level: "warning", msg: "Lit drop zone 3 — 45% completion stuck 30min", time: "12m ago", action: "Investigate" },
  { level: "info", msg: "Sign install confirmed: 12 Oak St — photo received", time: "45m ago", action: "View" },
];

const FOLLOW_UPS = [
  { address: "44 Maple Ave", type: "Revisit", note: "No answer – 2 attempts", team: "Marcus T.", priority: "high" },
  { address: "112 River Rd", type: "Blocked", note: "Gated community – need access code", team: "Sarah K.", priority: "high" },
  { address: "78 Elm St", type: "Sign Req", note: "Strong supporter – wants yard sign", team: "Dev P.", priority: "medium" },
  { address: "200 Queen St W", type: "Revisit", note: "Interested voter – call requested", team: "Lisa N.", priority: "medium" },
  { address: "9 Birch Cres", type: "Data Gap", note: "Resident unclear – needs follow up call", team: "Dev P.", priority: "low" },
];

const HOURLY_DATA = [
  { h: "8am", doors: 40, lit: 15 },
  { h: "9am", doors: 124, lit: 68 },
  { h: "10am", doors: 198, lit: 110 },
  { h: "11am", doors: 245, lit: 145 },
  { h: "12pm", doors: 280, lit: 180 },
  { h: "1pm", doors: 310, lit: 210 },
  { h: "2pm", doors: 360, lit: 240 },
];

const MATERIALS = [
  { name: "Door Hangers", stock: 4200, depleted: 1840, threshold: 500, unit: "pcs" },
  { name: "Lawn Signs (18×24)", stock: 280, depleted: 170, threshold: 50, unit: "units" },
  { name: "Palm Cards", stock: 8100, depleted: 2200, threshold: 1000, unit: "pcs" },
  { name: "Stake Wire", stock: 90, depleted: 51, threshold: 20, unit: "bundles" },
];

/* ─── SUB-COMPONENTS ─────────────────────────────────────────── */

function KPIStrip() {
  const kpis = [
    { label: "Active Programs", value: "3", icon: Activity, color: "#00E5FF" },
    { label: "Volunteers Out", value: "5 / 6", icon: Users, color: "#00C853" },
    { label: "Doors Hit Today", value: "1,240", icon: Home, color: "#2979FF" },
    { label: "Lit Dropped", value: "760", icon: BookOpen, color: "#FFD600" },
    { label: "Signs Installed", value: "51", icon: MapPin, color: "#00C853" },
    { label: "Follow-ups Pending", value: "24", icon: Phone, color: "#FF3B30" },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 mb-6">
      {kpis.map((k, i) => (
        <div
          key={i}
          className="bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 p-4 relative overflow-hidden group hover:border-[#00E5FF]/40 transition-all"
          style={{ boxShadow: `0 0 20px ${k.color}10` }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-25 transition-opacity"
            style={{ backgroundColor: k.color }}
          />
          <div className="flex items-start justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B72A0]">{k.label}</span>
            <k.icon size={14} style={{ color: k.color }} />
          </div>
          <div className="text-2xl font-black text-[#F5F7FF]" style={{ textShadow: `0 0 15px ${k.color}60` }}>
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgramCard({ prog, active, onClick }: { prog: typeof PROGRAMS[0]; active: boolean; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    active: "#00C853", paused: "#FFD600", pending: "#6B72A0", complete: "#2979FF"
  };
  const sc = statusColors[prog.status] || "#AAB2FF";

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded border cursor-pointer transition-all relative overflow-hidden group",
        active
          ? "bg-[#0F1440] border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.15)]"
          : "bg-[#050A1F] border-[#2979FF]/20 hover:border-[#2979FF]/50 hover:bg-[#0F1440]/50"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: prog.color, boxShadow: `0 0 8px ${prog.color}` }} />}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <prog.typeIcon size={12} style={{ color: prog.color }} />
          <span className="text-[11px] font-black text-[#F5F7FF] uppercase tracking-wider leading-tight">{prog.name}</span>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ml-2 flex-shrink-0"
          style={{ color: sc, borderColor: `${sc}50`, backgroundColor: `${sc}15` }}
        >
          {prog.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[9px] font-bold text-[#6B72A0] uppercase tracking-wider mb-3">
        <span className="flex items-center gap-1"><Users size={9} className="text-[#2979FF]" /> {prog.teams} teams</span>
        <span className="flex items-center gap-1"><Target size={9} className="text-[#FF3B30]" /> {prog.completed}/{prog.target}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest" style={{ color: prog.color }}>
          <span>Progress</span>
          <span>{prog.progress}%</span>
        </div>
        <div className="h-1 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${prog.progress}%`, backgroundColor: prog.color, boxShadow: `0 0 8px ${prog.color}` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── QUICK CAPTURE MODAL ────────────────────────────────────── */

function QuickCapture({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("door");
  const types = [
    { id: "door", label: "Door Log", icon: Home },
    { id: "sign", label: "Sign Request", icon: MapPin },
    { id: "lit", label: "Lit Drop", icon: BookOpen },
    { id: "note", label: "Team Note", icon: Radio },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0F1440] border border-[#2979FF]/40 rounded-2xl p-6 w-[420px] shadow-[0_0_60px_rgba(41,121,255,0.3)] relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#00E5FF] flex items-center gap-2">
            <Zap size={14} /> Quick Capture
          </h3>
          <button onClick={onClose} className="text-[#6B72A0] hover:text-[#F5F7FF] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded border transition-all",
                type === t.id
                  ? "bg-[#00E5FF]/10 border-[#00E5FF]/50 text-[#00E5FF]"
                  : "bg-[#050A1F] border-[#2979FF]/20 text-[#6B72A0] hover:border-[#2979FF]/50 hover:text-[#AAB2FF]"
              )}
            >
              <t.icon size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="bg-[#050A1F] border border-[#2979FF]/20 rounded p-3 flex items-center gap-3">
            <Crosshair size={14} className="text-[#00E5FF]" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">GPS Location</div>
              <div className="text-[11px] font-bold text-[#F5F7FF] mt-0.5">43.6534° N, 79.3839° W — Acquiring...</div>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-[#00C853] animate-pulse shadow-[0_0_8px_#00C853]" />
          </div>

          <input
            type="text"
            placeholder="Address or stop name..."
            className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs rounded p-3 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all placeholder:text-[#6B72A0]"
          />

          <textarea
            rows={3}
            placeholder="Notes or outcome..."
            className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs rounded p-3 focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-[#6B72A0] resize-none"
          />

          <div className="flex gap-2">
            {["Support", "Soft Sup", "Undecided", "Not Home", "Refused"].map(o => (
              <button
                key={o}
                className="flex-1 text-[8px] font-black uppercase tracking-widest py-1.5 rounded border border-[#2979FF]/30 text-[#AAB2FF] hover:border-[#00E5FF]/50 hover:text-[#00E5FF] hover:bg-[#00E5FF]/5 transition-all"
              >
                {o}
              </button>
            ))}
          </div>

          <button className="w-full bg-[#2979FF] text-white py-3 rounded font-black uppercase tracking-[0.15em] text-xs hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_20px_rgba(41,121,255,0.4)] flex items-center justify-center gap-2">
            <CheckCircle size={14} /> Submit & Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

export function FieldOps() {
  const [activeProgram, setActiveProgram] = useState(1);
  const [showCapture, setShowCapture] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "map" | "roster" | "materials">("overview");

  return (
    <div className="flex flex-col h-full bg-[#050A1F] text-[#F5F7FF] relative">

      {showCapture && <QuickCapture onClose={() => setShowCapture(false)} />}

      {/* Header */}
      <div className="px-8 pt-7 pb-4 flex-shrink-0">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#F5F7FF] uppercase flex items-center gap-3">
              <Map size={28} className="text-[#00E5FF]" style={{ filter: "drop-shadow(0 0 10px #00E5FF)" }} />
              Field Ops Command
            </h1>
            <p className="text-[#00E5FF] text-xs font-bold tracking-[0.2em] uppercase mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00C853] rounded-full shadow-[0_0_8px_#00C853] animate-pulse" />
              Live · 3 Programs Active · Sunday Apr 12, 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-[#0F1440] border border-[#2979FF]/20 rounded-lg p-1">
              {(["overview", "map", "roster", "materials"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setActiveView(v)}
                  className={cn(
                    "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all",
                    activeView === v
                      ? "bg-[#2979FF] text-white shadow-[0_0_15px_rgba(41,121,255,0.5)]"
                      : "text-[#6B72A0] hover:text-[#AAB2FF]"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCapture(true)}
              className="flex items-center gap-2 bg-[#FF3B30] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-400 transition-all shadow-[0_0_20px_rgba(255,59,48,0.5)] active:scale-95"
            >
              <Plus size={14} /> Quick Capture
            </button>
          </div>
        </div>

        <KPIStrip />
      </div>

      {/* OVERVIEW LAYOUT */}
      {activeView === "overview" && (
        <div className="flex-1 px-8 pb-8 grid grid-cols-12 gap-5 min-h-0 overflow-y-auto custom-scrollbar">

          {/* Programs Column */}
          <div className="col-span-3 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6B72A0]">Active Programs</h2>
              <button className="text-[#00E5FF] text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                <Plus size={10} /> New
              </button>
            </div>
            {PROGRAMS.map(prog => (
              <ProgramCard
                key={prog.id}
                prog={prog}
                active={activeProgram === prog.id}
                onClick={() => setActiveProgram(prog.id)}
              />
            ))}
          </div>

          {/* Map + Chart Column */}
          <div className="col-span-6 flex flex-col gap-5 min-h-0">

            {/* Map */}
            <div className="bg-[#0B0B15] border border-[#2979FF]/30 rounded-xl overflow-hidden relative flex-1 min-h-[360px]">
              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(41,121,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "40px 40px"
                }}
              />
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(41,121,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "200px 200px"
                }}
              />

              {/* Map SVG */}
              <svg className="absolute inset-0 w-full h-full opacity-50" xmlns="http://www.w3.org/2000/svg">
                {/* Turf zones */}
                <path d="M80 60 L280 50 L300 220 L70 240 Z" fill="rgba(0,229,255,0.08)" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="5 3" />
                <path d="M320 60 L580 45 L620 200 L340 220 Z" fill="rgba(255,214,0,0.06)" stroke="#FFD600" strokeWidth="1.5" strokeDasharray="5 3" />
                <path d="M90 280 L350 260 L380 460 L70 480 Z" fill="rgba(0,200,83,0.07)" stroke="#00C853" strokeWidth="1" strokeDasharray="4 4" />
                <path d="M400 280 L650 260 L680 450 L420 470 Z" fill="rgba(41,121,255,0.05)" stroke="#2979FF" strokeWidth="1" strokeDasharray="5 3" />

                {/* Road lines */}
                <line x1="0" y1="250" x2="100%" y2="250" stroke="rgba(41,121,255,0.2)" strokeWidth="2" />
                <line x1="0" y1="130" x2="100%" y2="130" stroke="rgba(41,121,255,0.15)" strokeWidth="1" />
                <line x1="310" y1="0" x2="310" y2="100%" stroke="rgba(41,121,255,0.2)" strokeWidth="2" />
                <line x1="160" y1="0" x2="160" y2="100%" stroke="rgba(41,121,255,0.15)" strokeWidth="1" />
              </svg>

              {/* Live operative dots */}
              {[
                { x: "28%", y: "35%", color: "#00E5FF", label: "Marcus T." },
                { x: "55%", y: "22%", color: "#00C853", label: "Sarah K." },
                { x: "38%", y: "55%", color: "#00E5FF", label: "Dev P." },
                { x: "72%", y: "65%", color: "#FFD600", label: "Aisha M." },
                { x: "48%", y: "80%", color: "#00E5FF", label: "Lisa N." },
              ].map((op, i) => (
                <div key={i} className="absolute group cursor-crosshair" style={{ left: op.x, top: op.y }}>
                  <div
                    className="w-3 h-3 rounded-full border-2 border-[#050A1F] relative z-10"
                    style={{ backgroundColor: op.color, boxShadow: `0 0 12px ${op.color}` }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#050A1F]/90 backdrop-blur border text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none" style={{ borderColor: `${op.color}50`, color: op.color }}>
                    {op.label}
                  </div>
                  <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-40" style={{ backgroundColor: op.color }} />
                </div>
              ))}

              {/* Zone labels */}
              <div className="absolute top-[80px] left-[120px] text-[9px] font-black text-[#00E5FF] uppercase tracking-widest opacity-70">Ward 4-A</div>
              <div className="absolute top-[60px] left-[380px] text-[9px] font-black text-[#FFD600] uppercase tracking-widest opacity-70">North Dist.</div>
              <div className="absolute top-[360px] left-[140px] text-[9px] font-black text-[#00C853] uppercase tracking-widest opacity-70">Riverdale</div>

              {/* Controls overlay */}
              <div className="absolute top-4 left-4 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded p-3 text-[#00E5FF] font-mono text-[8px] uppercase tracking-widest">
                <div>LAT: 43.6534°N</div>
                <div>LNG: 79.3839°W</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                  <span className="text-[#00C853]">Live</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {[Layers, Navigation, Filter].map((Icon, i) => (
                  <button key={i} className="w-9 h-9 bg-[#0F1440]/80 backdrop-blur rounded border border-[#2979FF]/40 flex items-center justify-center text-[#AAB2FF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">
                    <Icon size={14} />
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded p-3">
                <div className="text-[8px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">Zone Key</div>
                {[
                  { color: "#00E5FF", label: "Canvass" },
                  { color: "#FFD600", label: "Lit Drop" },
                  { color: "#00C853", label: "Sign Install" },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#AAB2FF]">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Activity Chart */}
            <div className="bg-[#0F1440]/60 backdrop-blur-md border border-[#2979FF]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] flex items-center gap-2">
                  <Activity size={12} className="text-[#00E5FF]" /> Hourly Field Activity
                </h3>
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-[#00E5FF]"><span className="w-2 h-0.5 bg-[#00E5FF]" />Doors</span>
                  <span className="flex items-center gap-1.5 text-[#FFD600]"><span className="w-2 h-0.5 bg-[#FFD600]" />Lit Drop</span>
                </div>
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HOURLY_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs key="defs">
                      <linearGradient key="doorsGrad" id="doorsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop key="stop1" offset="5%" stopColor="#00E5FF" stopOpacity={0.35} />
                        <stop key="stop2" offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient key="litGrad" id="litGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop key="stop3" offset="5%" stopColor="#FFD600" stopOpacity={0.25} />
                        <stop key="stop4" offset="95%" stopColor="#FFD600" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis key="xAxis" dataKey="h" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <YAxis key="yAxis" axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 9, fontWeight: 700 }} />
                    <Tooltip key="tooltip" contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "6px", color: "#F5F7FF", fontSize: "11px" }} />
                    <Area key="area1" type="monotone" dataKey="doors" stroke="#00E5FF" strokeWidth={2} fill="url(#doorsGrad)" />
                    <Area key="area2" type="monotone" dataKey="lit" stroke="#FFD600" strokeWidth={2} fill="url(#litGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Alerts + Roster + Follow-ups */}
          <div className="col-span-3 flex flex-col gap-5 min-h-0 overflow-y-auto custom-scrollbar">

            {/* Alerts */}
            <div className="bg-[#140505]/80 border border-[#FF3B30]/30 rounded-xl overflow-hidden flex-shrink-0">
              <div className="bg-[#FF3B30]/10 px-4 py-3 border-b border-[#FF3B30]/20 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-[#FF3B30] uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertTriangle size={12} /> Alerts
                </h3>
                <span className="text-[9px] font-black bg-[#FF3B30] text-white px-1.5 py-0.5 rounded shadow-[0_0_8px_#FF3B30]">
                  {ALERTS.filter(a => a.level !== "info").length}
                </span>
              </div>
              <div className="divide-y divide-[#FF3B30]/10">
                {ALERTS.map((alert, i) => (
                  <div key={i} className="p-3 hover:bg-[#FF3B30]/5 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2 mb-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          backgroundColor: alert.level === "critical" ? "#FF3B30" : alert.level === "warning" ? "#FFD600" : "#2979FF",
                          boxShadow: `0 0 6px ${alert.level === "critical" ? "#FF3B30" : alert.level === "warning" ? "#FFD600" : "#2979FF"}`
                        }}
                      />
                      <p className="text-[10px] font-bold text-[#F5F7FF] leading-snug">{alert.msg}</p>
                    </div>
                    <div className="flex items-center justify-between pl-3.5">
                      <span className="text-[9px] text-[#6B72A0]">{alert.time}</span>
                      <button className="text-[9px] font-black uppercase tracking-widest text-[#00E5FF] hover:text-white transition-colors">{alert.action} →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Roster */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden flex-shrink-0">
              <div className="px-4 py-3 border-b border-[#2979FF]/20 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={12} className="text-[#00E5FF]" /> Today's Roster
                </h3>
                <span className="text-[9px] text-[#00C853] font-black">{ROSTER.filter(r => r.status === "active").length}/{ROSTER.length} Active</span>
              </div>
              <div className="divide-y divide-[#2979FF]/10">
                {ROSTER.map((person, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2979FF]/5 transition-colors cursor-pointer group">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                      style={{
                        backgroundColor: person.status === "active" ? "rgba(0,200,83,0.2)" : "rgba(255,59,48,0.2)",
                        border: `1px solid ${person.status === "active" ? "#00C853" : "#FF3B30"}`,
                        color: person.status === "active" ? "#00C853" : "#FF3B30"
                      }}
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{person.name}</div>
                      <div className="text-[9px] text-[#6B72A0] uppercase tracking-widest">{person.turf}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: person.status === "active" ? "#00C853" : "#FF3B30" }}>
                        {person.status === "active" ? `${person.doors} ✓` : "LATE"}
                      </div>
                      <div className="text-[8px] text-[#6B72A0]">{person.checkin}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up Queue */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2979FF]/20 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock size={12} className="text-[#FFD600]" /> Follow-Up Queue
                </h3>
                <span className="text-[9px] text-[#FFD600] font-black">{FOLLOW_UPS.length} Pending</span>
              </div>
              <div className="divide-y divide-[#2979FF]/10">
                {FOLLOW_UPS.map((f, i) => {
                  const pc: Record<string, string> = { high: "#FF3B30", medium: "#FFD600", low: "#6B72A0" };
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-[#2979FF]/5 transition-colors cursor-pointer group">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: pc[f.priority], boxShadow: `0 0 5px ${pc[f.priority]}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{f.address}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pc[f.priority]}20`, color: pc[f.priority], border: `1px solid ${pc[f.priority]}40` }}>{f.type}</span>
                        </div>
                        <div className="text-[9px] text-[#6B72A0]">{f.note}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-[#2979FF]/20">
                <button className="w-full text-[9px] font-black uppercase tracking-widest text-[#00E5FF] hover:text-white transition-colors flex items-center justify-center gap-1">
                  View All 24 Follow-ups <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATERIALS VIEW */}
      {activeView === "materials" && (
        <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6 mt-2">
            {/* Inventory */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2979FF]/20 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={13} className="text-[#00E5FF]" /> Materials Inventory
                </h3>
                <button className="text-[9px] font-black text-[#00E5FF] uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors">
                  <RefreshCcw size={10} /> Sync
                </button>
              </div>
              <div className="p-6 space-y-5">
                {MATERIALS.map((m, i) => {
                  const pct = Math.round((m.depleted / (m.stock + m.depleted)) * 100);
                  const remaining = m.stock;
                  const low = remaining <= m.threshold * 2;
                  const critical = remaining <= m.threshold;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-[#F5F7FF]">{m.name}</span>
                          {critical && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40">
                              Reorder
                            </span>
                          )}
                          {low && !critical && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FFD600]/20 text-[#FFD600] border border-[#FFD600]/40">
                              Low
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-black text-[#F5F7FF]">
                          <span style={{ color: critical ? "#FF3B30" : low ? "#FFD600" : "#00C853" }}>{remaining.toLocaleString()}</span>
                          <span className="text-[#6B72A0] font-bold"> {m.unit} left</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${100 - pct}%`,
                            backgroundColor: critical ? "#FF3B30" : low ? "#FFD600" : "#00C853",
                            boxShadow: `0 0 8px ${critical ? "#FF3B30" : low ? "#FFD600" : "#00C853"}`
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-[#6B72A0] font-bold uppercase tracking-widest">
                        <span>{pct}% depleted</span>
                        <span>Threshold: {m.threshold} {m.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-4 border-t border-[#2979FF]/20 flex gap-3">
                <button className="flex-1 bg-[#2979FF]/10 border border-[#2979FF]/30 text-[#00E5FF] text-[10px] font-black uppercase tracking-widest py-2 rounded hover:bg-[#2979FF]/20 transition-all">
                  Receive Stock
                </button>
                <button className="flex-1 bg-[#2979FF]/10 border border-[#2979FF]/30 text-[#AAB2FF] text-[10px] font-black uppercase tracking-widest py-2 rounded hover:bg-[#2979FF]/20 transition-all">
                  Assign / Distribute
                </button>
                <button className="px-4 bg-[#FF3B30]/20 border border-[#FF3B30]/30 text-[#FF3B30] text-[10px] font-black uppercase tracking-widest py-2 rounded hover:bg-[#FF3B30]/30 transition-all">
                  Print Pack
                </button>
              </div>
            </div>

            {/* Print Pack Generator */}
            <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2979FF]/20">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={13} className="text-[#FFD600]" /> Print Pack Generator
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Context</label>
                  <select className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs p-3 rounded focus:outline-none focus:border-[#00E5FF] transition-all">
                    <option>Turf — Ward 4-A (145 households)</option>
                    <option>Turf — Ward 4-B (210 households)</option>
                    <option>Poll Number — Precinct 14</option>
                    <option>Event — Saturday Rally</option>
                  </select>
                </div>

                <div className="bg-[#050A1F] border border-[#2979FF]/20 rounded p-4 space-y-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-3">Calculated Quantities</div>
                  {[
                    { item: "Door Hangers", qty: 165, buffer: 20, avail: 4200, ok: true },
                    { item: "Palm Cards", qty: 300, buffer: 30, avail: 8100, ok: true },
                    { item: "Lawn Signs", qty: 30, buffer: 5, avail: 280, ok: true },
                    { item: "Stake Wire", qty: 30, buffer: 5, avail: 90, ok: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#F5F7FF]">{item.item}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#6B72A0]">×{item.qty} +{item.buffer} buffer</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{
                          backgroundColor: item.ok ? "rgba(0,200,83,0.15)" : "rgba(255,59,48,0.15)",
                          color: item.ok ? "#00C853" : "#FF3B30",
                          border: `1px solid ${item.ok ? "#00C853" : "#FF3B30"}40`
                        }}>
                          {item.ok ? "✓ Sufficient" : "⚠ Shortage"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-[#FFD600] text-[#050A1F] py-3 rounded font-black uppercase tracking-[0.15em] text-xs hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(255,214,0,0.3)] flex items-center justify-center gap-2">
                  <Package size={14} /> Distribute Pack — Reserve Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROSTER VIEW */}
      {activeView === "roster" && (
        <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar mt-2">
          <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2979FF]/20 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={13} className="text-[#00E5FF]" /> Field Roster — Apr 12, 2026
              </h3>
              <div className="flex gap-2">
                <button className="text-[9px] font-black text-[#00E5FF] uppercase tracking-widest border border-[#00E5FF]/30 px-3 py-1.5 rounded hover:bg-[#00E5FF]/10 transition-all">
                  Export
                </button>
                <button className="text-[9px] font-black text-white uppercase tracking-widest bg-[#2979FF] px-3 py-1.5 rounded hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_10px_rgba(41,121,255,0.4)]">
                  + Add Volunteer
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2979FF]/20">
                  {["Operative", "Role", "Assigned Turf", "Check-In", "Doors Hit", "Status", "Actions"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROSTER.map((p, i) => (
                  <tr key={i} className="border-b border-[#2979FF]/10 hover:bg-[#2979FF]/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            backgroundColor: p.status === "active" ? "rgba(0,200,83,0.2)" : "rgba(255,59,48,0.2)",
                            border: `1px solid ${p.status === "active" ? "#00C853" : "#FF3B30"}`,
                            color: p.status === "active" ? "#00C853" : "#FF3B30"
                          }}>
                          {p.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#AAB2FF] font-bold">{p.role}</td>
                    <td className="px-6 py-4 text-[11px] text-[#AAB2FF]">{p.turf}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-[#F5F7FF]">{p.checkin}</td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-black text-[#00E5FF]">{p.doors}</span>
                      <span className="text-[9px] text-[#6B72A0] ml-1">doors</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
                        style={{
                          backgroundColor: p.status === "active" ? "rgba(0,200,83,0.15)" : "rgba(255,59,48,0.15)",
                          color: p.status === "active" ? "#00C853" : "#FF3B30",
                          border: `1px solid ${p.status === "active" ? "#00C853" : "#FF3B30"}40`
                        }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest bg-[#2979FF]/10 border border-[#2979FF]/30 px-2 py-1 rounded hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">Message</button>
                        <button className="text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest bg-[#2979FF]/10 border border-[#2979FF]/30 px-2 py-1 rounded hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">Reassign</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MAP VIEW */}
      {activeView === "map" && (
        <div className="flex-1 px-8 pb-8 min-h-0">
          <div className="h-full bg-[#0B0B15] border border-[#2979FF]/30 rounded-xl overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: "linear-gradient(rgba(41,121,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.2) 1px, transparent 1px)",
                backgroundSize: "50px 50px"
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[#6B72A0] font-bold text-sm uppercase tracking-widest flex flex-col items-center gap-3">
                <Map size={40} className="text-[#2979FF]" />
                Full-screen field map with live overlays
              </div>
            </div>
            <div className="absolute top-4 left-4 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded p-3">
              <div className="space-y-2">
                {["All Turfs", "Active Teams", "Door Status", "Signs", "Lit Zones"].map(l => (
                  <label key={l} className="flex items-center gap-2 cursor-pointer">
                    <div className="w-3 h-3 rounded bg-[#2979FF] border border-[#00E5FF]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#AAB2FF]">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating FAB */}
      <button
        onClick={() => setShowCapture(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#2979FF] text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(41,121,255,0.7)] hover:bg-[#00E5FF] hover:shadow-[0_0_40px_rgba(0,229,255,0.8)] hover:text-[#050A1F] transition-all active:scale-95 z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
