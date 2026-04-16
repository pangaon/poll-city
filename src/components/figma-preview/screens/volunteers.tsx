"use client";
import React, { useState } from "react";
import { Users, Plus, Search, Filter, MessageSquare, CheckCircle, Clock, MapPin, Phone, Mail, ChevronRight, Star, MoreHorizontal, X, Calendar, Activity, Heart, Shield, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const VOLUNTEERS = [
  { id: 1, name: "Sophie Bouchard", role: "Team Lead", hours: 48, shifts: 12, rating: 5, status: "ACTIVE", skills: ["Canvass", "Phone Bank", "Data Entry"], color: "#00C853" },
  { id: 2, name: "Kevin Nguyen", role: "Canvasser", hours: 24, shifts: 6, rating: 4, status: "ACTIVE", skills: ["Canvass", "Signs"], color: "#00E5FF" },
  { id: 3, name: "Amina Diallo", role: "Phone Bank Lead", hours: 36, shifts: 9, rating: 5, status: "ACTIVE", skills: ["Phone Bank", "Training"], color: "#2979FF" },
  { id: 4, name: "James Park", role: "Data Analyst", hours: 18, shifts: 5, rating: 3, status: "INACTIVE", skills: ["Data Entry", "Analysis"], color: "#FFD600" },
  { id: 5, name: "Chloe Martin", role: "Canvasser", hours: 12, shifts: 3, rating: 4, status: "ACTIVE", skills: ["Canvass", "Lit Drop"], color: "#00C853" },
];

const chartData = [{ week: "W1", hours: 42 }, { week: "W2", hours: 68 }, { week: "W3", hours: 85 }, { week: "W4", hours: 124 }, { week: "W5", hours: 98 }];

export function Volunteers() {
  const [selected, setSelected] = useState<typeof VOLUNTEERS[0] | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      {/* Main Table */}
      <div className={cn("flex flex-col min-w-0 transition-all duration-300 overflow-hidden", selected ? "flex-1 border-r border-[#2979FF]/30" : "flex-1")}>
        <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
          <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter flex items-center gap-2"><Heart size={20} className="text-[#FF3B30]" /> Ground Force</h1>
          <div className="flex items-center gap-3">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2979FF]" size={14} /><input type="text" placeholder="Search operatives..." className="w-64 bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs rounded pl-8 pr-3 py-2 focus:outline-none focus:border-[#00E5FF] placeholder:text-[#6B72A0]" /></div>
            <button className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#AAB2FF] hover:text-[#F5F7FF] border border-[#2979FF]/30 rounded px-3 py-2 hover:border-[#2979FF]/60 transition-all"><Filter size={12} /> Filter</button>
            <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all"><Plus size={14} /> Recruit</button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 border-b border-[#2979FF]/20 bg-[#0F1440]/40 flex items-center gap-8">
          {[{ label: "Total", value: VOLUNTEERS.length, color: "#2979FF" }, { label: "Active", value: VOLUNTEERS.filter(v => v.status === "ACTIVE").length, color: "#00C853" }, { label: "Total Hours", value: VOLUNTEERS.reduce((a, v) => a + v.hours, 0), color: "#00E5FF" }].map((stat, i) => (
            <div key={i} className="flex items-center gap-2"><span className="text-[11px] font-black text-[#6B72A0] uppercase tracking-widest">{stat.label}</span><span className="font-black text-lg" style={{ color: stat.color }}>{stat.value}</span></div>
          ))}
          <div className="flex-1 ml-4 h-[40px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" hide />
                <Tooltip contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #2979FF", borderRadius: "4px", color: "#F5F7FF" }} />
                <Bar dataKey="hours" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={idx === chartData.length - 1 ? "#00E5FF" : "#2979FF"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0F1440] z-10">
              <tr>{["Name/Role", "Hours", "Shifts", "Rating", "Skills", "Status", ""].map((h, i) => <th key={i} className="py-3 px-4 text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] border-b border-[#2979FF]/20">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#2979FF]/10">
              {VOLUNTEERS.map((vol) => {
                const isViewed = selected?.id === vol.id;
                return (
                  <tr key={vol.id} onClick={() => setSelected(vol)} className={cn("group transition-all cursor-pointer text-sm", isViewed ? "bg-[#2979FF]/20" : "hover:bg-[#2979FF]/5")}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black" style={{ backgroundColor: `${vol.color}20`, color: vol.color }}>{vol.name[0]}</div>
                        <div><div className="font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{vol.name}</div><div className="text-[11px] text-[#6B72A0]">{vol.role}</div></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#00E5FF]">{vol.hours}h</td>
                    <td className="py-3 px-4 font-mono text-[#AAB2FF]">{vol.shifts}</td>
                    <td className="py-3 px-4"><div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < vol.rating ? "text-[#FFD600] fill-[#FFD600]" : "text-[#2979FF]/30"} />)}</div></td>
                    <td className="py-3 px-4"><div className="flex gap-1 flex-wrap">{vol.skills.slice(0, 2).map((s, i) => <span key={i} className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#050A1F] text-[#AAB2FF] border border-[#2979FF]/30">{s}</span>)}</div></td>
                    <td className="py-3 px-4"><span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border", vol.status === "ACTIVE" ? "text-[#00C853] border-[#00C853]/40 bg-[#00C853]/10" : "text-[#FFD600] border-[#FFD600]/40 bg-[#FFD600]/10")}>{vol.status}</span></td>
                    <td className="py-3 px-4"><button className="text-[#6B72A0] hover:text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-all p-1"><MoreHorizontal size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Drawer */}
      {selected && (
        <div className="w-[340px] bg-[#0F1440]/95 backdrop-blur-xl border-l border-[#00E5FF]/30 flex flex-col overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black" style={{ backgroundColor: `${selected.color}20`, color: selected.color }}>{selected.name[0]}</div>
              <div><div className="font-black text-[#F5F7FF] text-lg">{selected.name}</div><div className="text-[11px] text-[#AAB2FF]">{selected.role}</div></div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 text-[#6B72A0] hover:text-[#FF3B30] transition-colors"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[{ icon: Phone, label: "Call" }, { icon: Mail, label: "Email" }, { icon: MessageSquare, label: "Text" }].map((action, i) => (
              <button key={i} className="flex flex-col items-center gap-1.5 p-3 bg-[#050A1F] border border-[#2979FF]/30 rounded hover:border-[#00E5FF]/50 transition-all"><action.icon size={16} className="text-[#00E5FF]" /><span className="text-[10px] font-bold uppercase tracking-widest text-[#AAB2FF]">{action.label}</span></button>
            ))}
          </div>
          <div className="space-y-4">
            {[["Hours Logged", `${selected.hours}h`], ["Shifts Completed", selected.shifts], ["Availability", "Weekends + Evenings"]].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-[#2979FF]/20">
                <span className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest">{label}</span>
                <span className="font-bold text-[#F5F7FF] text-sm">{value}</span>
              </div>
            ))}
            <div className="pt-2"><div className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">Skills</div><div className="flex flex-wrap gap-2">{selected.skills.map((s, i) => <span key={i} className="text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-[#2979FF]/40 text-[#00E5FF] bg-[#2979FF]/10">{s}</span>)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
