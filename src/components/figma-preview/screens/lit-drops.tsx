"use client";
import React, { useState } from "react";
import { BookOpen, MapPin, Users, CheckCircle, AlertTriangle, Clock, Plus, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ZONES = [
  { id: 1, name: "Zone A — Westside", pieces: 3400, assigned: "S. Bouchard", coverage: 78, status: "ACTIVE", color: "#00C853" },
  { id: 2, name: "Zone B — Downtown", pieces: 5200, assigned: "K. Nguyen", coverage: 45, status: "ACTIVE", color: "#00E5FF" },
  { id: 3, name: "Zone C — Eastside", pieces: 2800, assigned: "A. Diallo", coverage: 92, status: "COMPLETE", color: "#2979FF" },
  { id: 4, name: "Zone D — North Grid", pieces: 4100, assigned: "Unassigned", coverage: 12, status: "PENDING", color: "#FFD600" },
];

const chartData = [
  { zone: "A", delivered: 2652, remaining: 748 },
  { zone: "B", delivered: 2340, remaining: 2860 },
  { zone: "C", delivered: 2576, remaining: 224 },
  { zone: "D", delivered: 492, remaining: 3608 },
];

export function LitDrops() {
  const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null);

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      {/* Zone List */}
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto border-r border-[#2979FF]/20">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter flex items-center gap-2"><BookOpen size={20} className="text-[#00E5FF]" /> Lit Drop Zones</h1>
          <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-wider hover:bg-[#00E5FF] transition-all"><Plus size={14} /> New Zone</button>
        </div>

        {/* Chart */}
        <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5">
          <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4">Zone Coverage Overview</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: "#AAB2FF", fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B72A0", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                <Bar dataKey="delivered" stackId="a" fill="#00E5FF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="#2979FF" radius={[4, 4, 0, 0]} opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Cards */}
        <div className="grid grid-cols-2 gap-4">
          {ZONES.map((zone) => (
            <div key={zone.id} onClick={() => setSelectedZone(zone)} className={cn("bg-[#0F1440]/60 border rounded-xl p-5 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden", selectedZone?.id === zone.id ? "border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.1)]" : "border-[#2979FF]/20 hover:border-[#2979FF]/60")}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-20" style={{ backgroundColor: zone.color }} />
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-black text-[#F5F7FF] text-sm uppercase">{zone.name}</h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border" style={{ color: zone.color, borderColor: `${zone.color}50` }}>{zone.status}</span>
              </div>
              <div className="text-[11px] text-[#AAB2FF] mb-1 flex items-center gap-1"><Users size={10} />{zone.assigned}</div>
              <div className="text-[11px] text-[#AAB2FF] mb-3 flex items-center gap-1"><MapPin size={10} />{zone.pieces.toLocaleString()} pieces</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest" style={{ color: zone.color }}><span>Coverage</span><span>{zone.coverage}%</span></div>
                <div className="h-1.5 bg-[#050A1F] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${zone.coverage}%`, backgroundColor: zone.color }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Sidebar */}
      {selectedZone && (
        <div className="w-[340px] bg-[#0F1440]/90 backdrop-blur-xl border-l border-[#00E5FF]/30 flex flex-col p-6 overflow-y-auto">
          <h2 className="text-lg font-black text-[#F5F7FF] uppercase tracking-tight mb-1">{selectedZone.name}</h2>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border mb-6 w-fit" style={{ color: selectedZone.color, borderColor: `${selectedZone.color}50` }}>{selectedZone.status}</span>
          <div className="space-y-4">
            {[["Lead Volunteer", selectedZone.assigned], ["Total Pieces", selectedZone.pieces.toLocaleString()], ["Coverage", `${selectedZone.coverage}%`], ["Remaining", `${Math.round(selectedZone.pieces * (1 - selectedZone.coverage / 100)).toLocaleString()} pieces`]].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-3 border-b border-[#2979FF]/20">
                <span className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest">{label}</span>
                <span className="font-bold text-[#F5F7FF] text-sm">{value}</span>
              </div>
            ))}
            <button className="w-full mt-4 py-3 bg-[#2979FF] text-white rounded font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all text-xs">Assign Volunteer</button>
          </div>
        </div>
      )}
    </div>
  );
}
