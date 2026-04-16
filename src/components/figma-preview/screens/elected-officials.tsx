"use client";
import React, { useState, useMemo } from "react";
import { Search, Filter, Plus, ChevronRight, Phone, Mail, Globe, Star, Building2, Users, Shield, AlertTriangle, User, Calendar, X, Tag, MapPin, Award, BarChart2, TrendingUp, Download, Zap, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

const OFFICIALS = [
  { id: 1, name: "Mayor Lisa Thompson", title: "Mayor", level: "Municipal", ward: "City-Wide", party: "Liberal", approval: 58, stance: "ally", phone: "(416) 555-0100", email: "mayor@cityhall.ca", issues: { Economy: 72, Healthcare: 68, Climate: 84, Safety: 76, Housing: 80, Transit: 65 } },
  { id: 2, name: "Cllr. David Park", title: "City Councillor", level: "Municipal", ward: "Ward 3", party: "NDP", approval: 62, stance: "ally", phone: "(416) 555-0233", email: "d.park@cityhall.ca", issues: { Economy: 65, Healthcare: 78, Climate: 90, Safety: 70, Housing: 88, Transit: 82 } },
  { id: 3, name: "MP Sarah Wilson", title: "Member of Parliament", level: "Federal", ward: "Riding 42", party: "Conservative", approval: 44, stance: "neutral", phone: "(613) 555-0344", email: "s.wilson@parl.gc.ca", issues: { Economy: 88, Healthcare: 60, Climate: 45, Safety: 82, Housing: 55, Transit: 50 } },
  { id: 4, name: "MPP Robert Osei", title: "Member of Prov. Parliament", level: "Provincial", ward: "District 12", party: "Liberal", approval: 51, stance: "neutral", phone: "(416) 555-0455", email: "r.osei@ola.on.ca", issues: { Economy: 70, Healthcare: 82, Climate: 75, Safety: 68, Housing: 77, Transit: 71 } },
];

export function ElectedOfficials() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof OFFICIALS[0] | null>(null);

  const filtered = useMemo(() => OFFICIALS.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || o.ward.toLowerCase().includes(search.toLowerCase())), [search]);

  const radarData = selected ? Object.entries(selected.issues).map(([subject, value]) => ({ subject, A: value })) : [];

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      {/* Main Table */}
      <div className={cn("flex flex-col transition-all duration-300", selected ? "w-2/3 border-r border-[#2979FF]/30" : "flex-1")}>
        <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
          <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter flex items-center gap-2"><Building2 size={20} className="text-[#00E5FF]" /> Elected Officials</h1>
          <div className="flex items-center gap-3">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2979FF]" size={14} /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search officials..." className="w-64 bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs rounded pl-8 pr-3 py-2 focus:outline-none focus:border-[#00E5FF] placeholder:text-[#6B72A0]" /></div>
            <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all"><Plus size={14} /> Add Official</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0F1440] z-10">
              <tr>{["Name & Title", "Ward/Riding", "Level", "Party", "Approval", "Stance", ""].map((h, i) => <th key={i} className="py-3 px-4 text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] border-b border-[#2979FF]/20">{h}</th>)}</tr>
            </thead>
            <AnimatePresence mode="sync">
              <tbody className="divide-y divide-[#2979FF]/10">
                {filtered.map((official) => {
                  const isViewed = selected?.id === official.id;
                  return (
                    <motion.tr key={official.id} layout onClick={() => setSelected(official)} className={cn("group transition-all cursor-pointer text-sm", isViewed ? "bg-[#2979FF]/20" : "hover:bg-[#2979FF]/5")}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{official.name}</div>
                        <div className="text-[11px] text-[#6B72A0]">{official.title}</div>
                      </td>
                      <td className="py-3 px-4 text-[#AAB2FF]">{official.ward}</td>
                      <td className="py-3 px-4"><span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-[#2979FF]/40 text-[#AAB2FF]">{official.level}</span></td>
                      <td className="py-3 px-4 font-bold text-[#F5F7FF]">{official.party}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#050A1F] rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${official.approval}%`, backgroundColor: official.approval >= 55 ? "#00C853" : official.approval >= 45 ? "#FFD600" : "#FF3B30" }} /></div>
                          <span className="text-[11px] font-bold text-[#AAB2FF]">{official.approval}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border", official.stance === "ally" ? "text-[#00C853] border-[#00C853]/40 bg-[#00C853]/10" : "text-[#FFD600] border-[#FFD600]/40 bg-[#FFD600]/10")}>{official.stance}</span></td>
                      <td className="py-3 px-4"><button className="text-[#6B72A0] hover:text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-all p-1"><ChevronRight size={16} /></button></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </AnimatePresence>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "33.333%", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="h-full bg-[#0F1440]/95 backdrop-blur-xl overflow-y-auto border-l border-[#00E5FF]/30 relative z-20 flex-shrink-0">
            <div className="p-6 min-w-[300px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tight">{selected.name}</h2>
                  <div className="text-[11px] text-[#AAB2FF] mt-0.5">{selected.title}</div>
                  <div className="flex gap-2 mt-2">
                    <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border", selected.stance === "ally" ? "text-[#00C853] border-[#00C853]/40 bg-[#00C853]/10" : "text-[#FFD600] border-[#FFD600]/40 bg-[#FFD600]/10")}>{selected.stance}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-[#2979FF]/40 text-[#AAB2FF]">{selected.level}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 text-[#6B72A0] hover:text-[#FF3B30] transition-colors"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                <button className="flex items-center justify-center gap-2 p-3 bg-[#050A1F] border border-[#2979FF]/30 rounded hover:border-[#00E5FF]/50 transition-all"><Phone size={14} className="text-[#00E5FF]" /><span className="text-[11px] font-bold text-[#AAB2FF]">Call</span></button>
                <button className="flex items-center justify-center gap-2 p-3 bg-[#050A1F] border border-[#2979FF]/30 rounded hover:border-[#00E5FF]/50 transition-all"><Mail size={14} className="text-[#00E5FF]" /><span className="text-[11px] font-bold text-[#AAB2FF]">Email</span></button>
              </div>

              <div className="space-y-3 mb-6">
                {[["Ward/Riding", selected.ward], ["Party", selected.party], ["Phone", selected.phone], ["Email", selected.email]].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-[#2979FF]/20">
                    <span className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-bold text-[#F5F7FF]">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-3">Issue Alignment</div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2979FF" strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#AAB2FF", fontSize: 8, fontWeight: 700 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
