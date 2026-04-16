"use client";
import React, { useState } from "react";
import { Search, Layers, Navigation, Plus, User, Crosshair, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Canvassing() {
  const [activeTurf, setActiveTurf] = useState(1);

  return (
    <div className="flex h-full w-full bg-[#050A1F] relative overflow-hidden font-sans">
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -100; } }
        .pin-pulse { animation: pin-pulse 2s infinite; }
        @keyframes pin-pulse { 0% { box-shadow: 0 0 0 0 rgba(0,229,255,0.7); } 70% { box-shadow: 0 0 0 15px rgba(0,229,255,0); } 100% { box-shadow: 0 0 0 0 rgba(0,229,255,0); } }
      `}</style>

      {/* Side Panel */}
      <div className="w-[340px] bg-[#0F1440]/90 backdrop-blur-xl border-r border-[#2979FF]/30 flex flex-col z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black text-[#F5F7FF] uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(41,121,255,0.8)]"><Layers size={16} className="text-[#00E5FF]" /> Sector Control</h1>
          <button className="p-1.5 text-[#00E5FF] hover:bg-[#00E5FF]/20 rounded border border-transparent hover:border-[#00E5FF]/50 transition-all"><Plus size={16} /></button>
        </div>
        <div className="p-5 border-b border-[#2979FF]/20 bg-[#0F1440]">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF]" size={14} />
            <input type="text" placeholder="Locate grid..." className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs font-bold uppercase tracking-widest rounded pl-9 pr-3 py-2 focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-[#6B72A0]" />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 text-[10px] font-black uppercase tracking-widest bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/50 py-1.5 rounded">Active (12)</button>
            <button className="flex-1 text-[10px] font-black uppercase tracking-widest bg-[#050A1F] border border-[#2979FF]/30 text-[#AAB2FF] hover:text-[#F5F7FF] py-1.5 rounded transition-all">Pending (4)</button>
            <button className="flex-1 text-[10px] font-black uppercase tracking-widest bg-[#050A1F] border border-[#2979FF]/30 text-[#AAB2FF] hover:text-[#F5F7FF] py-1.5 rounded transition-all">Cleared (8)</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#050A1F]/30">
          {[
            { id: 1, name: "Sector Alpha-1", progress: 68, assignee: "Operative M.", targets: 145, priority: "CRITICAL", color: "#FF3B30" },
            { id: 2, name: "Grid Beta-4", progress: 32, assignee: "Operative S.", targets: 210, priority: "ELEVATED", color: "#FFD600" },
            { id: 3, name: "Zone Delta-9", progress: 89, assignee: "Operative A.", targets: 340, priority: "CRITICAL", color: "#FF3B30" },
            { id: 4, name: "Sector Gamma", progress: 12, assignee: "Unassigned", targets: 180, priority: "STANDARD", color: "#2979FF" },
            { id: 5, name: "Grid Epsilon", progress: 45, assignee: "Operative D.", targets: 220, priority: "ELEVATED", color: "#FFD600" },
          ].map((turf) => (
            <div key={turf.id} onClick={() => setActiveTurf(turf.id)} className={cn("p-4 rounded border transition-all cursor-pointer relative overflow-hidden", activeTurf === turf.id ? "bg-[#0F1440] border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.2)]" : "bg-[#050A1F] border-[#2979FF]/20 hover:border-[#2979FF]/60 hover:bg-[#0F1440]/50")}>
              {activeTurf === turf.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[12px] font-black text-[#F5F7FF] uppercase tracking-widest">{turf.name}</h3>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[#050A1F] border" style={{ borderColor: `${turf.color}50`, color: turf.color }}>{turf.priority}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-4 font-mono">
                <span className="flex items-center gap-1.5"><User size={12} className="text-[#2979FF]" />{turf.assignee}</span>
                <span className="flex items-center gap-1.5"><Crosshair size={12} className="text-[#FF3B30]" />{turf.targets} TGT</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#00E5FF]"><span>Sweep Progress</span><span>{turf.progress}%</span></div>
                <div className="h-1 w-full bg-[#050A1F] rounded overflow-hidden border border-[#2979FF]/20"><div className="h-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] transition-all duration-500" style={{ width: `${turf.progress}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-[#0B0B15]">
        <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(41,121,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.2) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(41,121,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.4) 1px, transparent 1px)", backgroundSize: "250px 250px" }} />
        <svg className="absolute inset-0 w-full h-full opacity-40">
          <path d="M100 100 L300 120 L320 400 L80 380 Z" fill="#0F1440" stroke="#2979FF" strokeWidth="2"/>
          <path d="M350 150 L600 100 L650 350 L400 380 Z" fill="#0F1440" stroke="#2979FF" strokeWidth="2"/>
          <path d="M150 450 L450 420 L500 700 L120 720 Z" fill="#0F1440" stroke="#2979FF" strokeWidth="2"/>
          {activeTurf === 1 && <path d="M350 150 L600 100 L650 350 L400 380 Z" fill="#FF3B30" fillOpacity="0.1" stroke="#FF3B30" strokeWidth="2" strokeDasharray="4 4" style={{ filter: "drop-shadow(0 0 10px rgba(255,59,48,0.8))" }} />}
        </svg>
        <div className="absolute top-[200px] left-[450px] transform -translate-x-1/2 -translate-y-1/2 z-10"><div className="w-4 h-4 bg-[#00C853] rounded-sm transform rotate-45 border border-[#00C853] shadow-[0_0_15px_#00C853] hover:scale-125 transition-transform" /></div>
        <div className="absolute top-[280px] left-[520px] transform -translate-x-1/2 -translate-y-1/2 z-10"><div className="w-4 h-4 bg-[#FFD600] rounded-sm transform rotate-45 border border-[#FFD600] shadow-[0_0_15px_#FFD600] hover:scale-125 transition-transform" /></div>
        <div className="absolute top-[180px] left-[580px] transform -translate-x-1/2 -translate-y-1/2 z-10"><div className="w-4 h-4 bg-[#FF3B30] rounded-sm transform rotate-45 border border-[#FF3B30] shadow-[0_0_15px_#FF3B30] hover:scale-125 transition-transform" /></div>
        <div className="absolute top-[240px] left-[480px] z-10">
          <div className="w-5 h-5 bg-[#00E5FF] rounded-full border-2 border-[#050A1F] shadow-[0_0_20px_#00E5FF] pin-pulse cursor-crosshair" />
          <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-[#00E5FF]/20 backdrop-blur-md border border-[#00E5FF] px-3 py-1 rounded text-[9px] font-black uppercase tracking-[0.2em] text-[#00E5FF] whitespace-nowrap">OP-M (LIVE)</div>
        </div>
        <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
          <button className="w-12 h-12 bg-[#0F1440]/80 backdrop-blur-md rounded border border-[#2979FF]/40 flex items-center justify-center text-[#00E5FF] hover:bg-[#2979FF]/20 hover:border-[#00E5FF] transition-all"><Layers size={20} /></button>
          <button className="w-12 h-12 bg-[#0F1440]/80 backdrop-blur-md rounded border border-[#2979FF]/40 flex items-center justify-center text-[#00E5FF] hover:bg-[#2979FF]/20 hover:border-[#00E5FF] transition-all"><Navigation size={20} /></button>
          <button className="w-12 h-12 bg-[#FF3B30]/10 backdrop-blur-md rounded border border-[#FF3B30]/40 flex items-center justify-center text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white transition-all mt-4"><Zap size={20} /></button>
        </div>
        <div className="absolute bottom-8 right-8 bg-[#0F1440]/90 backdrop-blur-xl border border-[#2979FF]/40 p-5 rounded shadow-[0_0_30px_rgba(0,0,0,0.8)] z-20 w-64">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB2FF] mb-4 flex items-center gap-2"><Crosshair size={12} className="text-[#00E5FF]" /> Tactical Legend</h4>
          <div className="space-y-4">
            {[["#00C853", "TGT SECURED"], ["#FFD600", "TGT PENDING"], ["#FF3B30", "TGT HOSTILE"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-sm transform rotate-45" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /><span className="text-[10px] font-bold text-[#F5F7FF] uppercase tracking-widest">{label}</span></div>
            ))}
            <div className="flex items-center gap-3 pt-3 mt-3 border-t border-[#2979FF]/20"><div className="w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] pin-pulse" /><span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-widest">LIVE OPERATIVE</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
