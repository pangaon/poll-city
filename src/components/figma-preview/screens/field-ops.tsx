"use client";
import React, { useState } from "react";
import { Map, Users, BookOpen, MapPin, AlertTriangle, CheckCircle, Clock, Plus, Activity, Package, Zap, Target, Filter, Crosshair, Navigation, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const AREA_DATA = [
  { time: "08:00", contacts: 12, doors: 18 },
  { time: "10:00", contacts: 28, doors: 35 },
  { time: "12:00", contacts: 45, doors: 52 },
  { time: "14:00", contacts: 62, doors: 78 },
  { time: "16:00", contacts: 89, doors: 110 },
  { time: "18:00", contacts: 104, doors: 132 },
];

export function FieldOps() {
  const [view, setView] = useState<"overview" | "map" | "roster" | "materials">("overview");

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden relative">
      {/* Ambient glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#2979FF]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Crosshair size={20} className="text-[#00E5FF]" />
            <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(41,121,255,0.8)]">Field Command</h1>
          </div>
          <div className="flex gap-2">
            {(["overview", "map", "roster", "materials"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all", view === v ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "text-[#AAB2FF] hover:text-[#F5F7FF] border border-transparent hover:border-[#2979FF]/30")}>{v}</button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-[#00E5FF] transition-all"><Plus size={14} /> Deploy Unit</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {view === "overview" && (
            <div className="space-y-6">
              {/* KPI Row */}
              <div className="grid grid-cols-4 gap-4">
                {[{ label: "Active Operatives", value: "28", icon: Users, color: "#2979FF" }, { label: "Doors Knocked", value: "1,204", icon: Map, color: "#00E5FF" }, { label: "Contacts Made", value: "847", icon: CheckCircle, color: "#00C853" }, { label: "Areas Remaining", value: "6", icon: AlertTriangle, color: "#FF3B30" }].map((kpi, i) => (
                  <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-20" style={{ backgroundColor: kpi.color }} />
                    <div className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">{kpi.label}</div>
                    <div className="text-3xl font-black text-[#F5F7FF]">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Activity Chart */}
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-6">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Activity size={14} className="text-[#00E5FF]" /> Live Field Activity</h3>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={AREA_DATA}>
                      <defs>
                        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="contacts" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#fieldGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[{ name: "Alpha Team", lead: "M. Bouchard", doors: 234, contacts: 178, status: "ACTIVE", color: "#00C853" }, { name: "Bravo Team", lead: "K. Nguyen", doors: 156, contacts: 112, status: "ACTIVE", color: "#00C853" }, { name: "Delta Team", lead: "A. Diallo", doors: 89, contacts: 67, status: "STANDBY", color: "#FFD600" }].map((team, i) => (
                  <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 hover:border-[#00E5FF]/40 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-black text-[#F5F7FF] uppercase tracking-wide text-sm">{team.name}</h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border" style={{ color: team.color, borderColor: `${team.color}50` }}>{team.status}</span>
                    </div>
                    <div className="text-[11px] text-[#AAB2FF] mb-3">Lead: {team.lead}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-[#050A1F] p-2 rounded border border-[#2979FF]/20"><div className="text-[#6B72A0] uppercase tracking-widest mb-1">Doors</div><div className="font-black text-[#F5F7FF]">{team.doors}</div></div>
                      <div className="bg-[#050A1F] p-2 rounded border border-[#2979FF]/20"><div className="text-[#6B72A0] uppercase tracking-widest mb-1">Contacts</div><div className="font-black text-[#00C853]">{team.contacts}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {view !== "overview" && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center"><div className="text-[#00E5FF] text-3xl font-black uppercase tracking-widest mb-3">{view.toUpperCase()} VIEW</div><div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Module Streaming</div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
