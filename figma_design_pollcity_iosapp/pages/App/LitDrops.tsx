import React, { useState } from "react";
import {
  BookOpen, MapPin, Users, CheckCircle, AlertTriangle,
  Clock, Plus, Search, Filter, ChevronRight, MoreHorizontal,
  Lock, RefreshCcw, TrendingUp, Home, X
} from "lucide-react";
import { cn } from "../../utils/cn";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ─── MOCK DATA ──────────────────────────────────────────────── */

type ZoneStatus = "complete" | "in-progress" | "partial" | "blocked" | "pending" | "reopened";

const ZONES = [
  { id: 1, name: "Zone Alpha — Maple District", area: "Maple Ave & Oak St", team: "Lisa N. + Dev P.", homes: 220, dropped: 220, status: "complete" as ZoneStatus, date: "Apr 12", priority: "standard" },
  { id: 2, name: "Zone Beta — Riverside North", area: "River Rd between King & Queen", team: "Sarah K.", homes: 180, dropped: 82, status: "in-progress" as ZoneStatus, date: "Apr 12", priority: "elevated" },
  { id: 3, name: "Zone Gamma — University Heights", area: "University Ave corridor", team: "Marcus T.", homes: 310, dropped: 145, status: "partial" as ZoneStatus, date: "Apr 12", priority: "elevated" },
  { id: 4, name: "Zone Delta — Gated Complex", area: "300 Parkside Dr (secured)", team: "Unassigned", homes: 88, dropped: 0, status: "blocked" as ZoneStatus, date: "Apr 11", priority: "standard" },
  { id: 5, name: "Zone Epsilon — East Market", area: "Market St & Dundas E", team: "Tom R.", homes: 250, dropped: 0, status: "pending" as ZoneStatus, date: "Apr 13", priority: "critical" },
  { id: 6, name: "Zone Zeta — Old Town", area: "King St Heritage Block", team: "Lisa N.", homes: 140, dropped: 140, status: "complete" as ZoneStatus, date: "Apr 11", priority: "standard" },
];

const COVERAGE_DATA = [
  { zone: "Alpha", pct: 100 },
  { zone: "Beta", pct: 46 },
  { zone: "Gamma", pct: 47 },
  { zone: "Delta", pct: 0 },
  { zone: "Epsilon", pct: 0 },
  { zone: "Zeta", pct: 100 },
];

const STATUS_CONFIG: Record<ZoneStatus, { label: string; color: string; icon: React.ElementType }> = {
  complete: { label: "Complete", color: "#00C853", icon: CheckCircle },
  "in-progress": { label: "In Progress", color: "#00E5FF", icon: RefreshCcw },
  partial: { label: "Partial", color: "#FFD600", icon: Clock },
  blocked: { label: "Blocked", color: "#FF3B30", icon: Lock },
  pending: { label: "Pending", color: "#6B72A0", icon: Clock },
  reopened: { label: "Reopened", color: "#FF9F0A", icon: RefreshCcw },
};

const PRIORITY_CONFIG: Record<string, { color: string }> = {
  standard: { color: "#2979FF" },
  elevated: { color: "#FFD600" },
  critical: { color: "#FF3B30" },
};

/* ─── ZONE DETAIL PANEL ──────────────────────────────────────── */

function ZoneDetailPanel({ zone, onClose }: { zone: typeof ZONES[0]; onClose: () => void }) {
  const scfg = STATUS_CONFIG[zone.status];
  const pct = zone.homes > 0 ? Math.round((zone.dropped / zone.homes) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#0F1440]/95 border-l border-[#2979FF]/30">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2979FF]/20 bg-[#050A1F]/50 flex-shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 pr-4">
            <h3 className="text-[13px] font-black text-[#F5F7FF] uppercase tracking-widest leading-tight">{zone.name}</h3>
            <p className="text-[10px] text-[#6B72A0] mt-1 flex items-center gap-1">
              <MapPin size={9} /> {zone.area}
            </p>
          </div>
          <button onClick={onClose} className="text-[#6B72A0] hover:text-[#F5F7FF] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"
            style={{ backgroundColor: `${scfg.color}15`, color: scfg.color, border: `1px solid ${scfg.color}40` }}
          >
            <scfg.icon size={9} /> {scfg.label}
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
            style={{
              backgroundColor: `${PRIORITY_CONFIG[zone.priority].color}15`,
              color: PRIORITY_CONFIG[zone.priority].color,
              border: `1px solid ${PRIORITY_CONFIG[zone.priority].color}30`
            }}
          >
            {zone.priority}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        {/* Progress */}
        <div className="bg-[#050A1F] border border-[#2979FF]/20 rounded-xl p-4">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
            <span className="text-[#6B72A0]">Drop Coverage</span>
            <span style={{ color: scfg.color }}>{pct}%</span>
          </div>
          <div className="h-3 w-full bg-[#0F1440] rounded-full overflow-hidden border border-[#2979FF]/20 mb-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: scfg.color, boxShadow: `0 0 10px ${scfg.color}60` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Dropped", value: zone.dropped, color: "#00C853" },
              { label: "Remaining", value: zone.homes - zone.dropped, color: "#FFD600" },
              { label: "Total Homes", value: zone.homes, color: "#2979FF" },
            ].map(m => (
              <div key={m.label} className="bg-[#0F1440] rounded-lg p-3 border border-[#2979FF]/20">
                <div className="text-xl font-black" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-[#6B72A0] mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Assigned Team</label>
          <div className="flex items-center gap-3 bg-[#050A1F] border border-[#2979FF]/20 rounded p-3">
            <div className="w-8 h-8 rounded-full bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[10px] font-black text-[#00E5FF]">
              {zone.team === "Unassigned" ? "?" : zone.team.charAt(0)}
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#F5F7FF]">{zone.team}</div>
              <div className="text-[9px] text-[#6B72A0]">Lit Drop Team</div>
            </div>
            <button className="ml-auto text-[9px] font-black uppercase tracking-widest text-[#00E5FF] hover:text-white transition-colors">
              Reassign →
            </button>
          </div>
        </div>

        {/* Blocked note */}
        {zone.status === "blocked" && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={12} className="text-[#FF3B30]" />
              <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest">Access Blocked</span>
            </div>
            <p className="text-[11px] text-[#F5F7FF]">Gated community — access code required. Contact building manager or community liaison.</p>
            <button className="mt-3 text-[9px] font-black uppercase tracking-widest text-[#FF3B30] border border-[#FF3B30]/40 px-3 py-1.5 rounded hover:bg-[#FF3B30] hover:text-white transition-all">
              Log Resolution
            </button>
          </div>
        )}

        {/* Missed homes */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Missed Homes</label>
          <div className="space-y-2">
            {[
              { addr: "45 River Rd", reason: "No mail slot — left at door" },
              { addr: "67 River Rd", reason: "Dog blocking access" },
              { addr: "89 River Rd", reason: "Construction blocked driveway" },
            ].map((h, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#050A1F] border border-[#2979FF]/15 rounded p-3">
                <AlertTriangle size={11} className="text-[#FFD600] flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[#F5F7FF]">{h.addr}</div>
                  <div className="text-[9px] text-[#6B72A0]">{h.reason}</div>
                </div>
                <button className="text-[9px] font-black uppercase tracking-widest text-[#00E5FF] hover:text-white transition-colors whitespace-nowrap">Retry</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-5 border-t border-[#2979FF]/20 space-y-2">
        {zone.status !== "complete" && (
          <button className="w-full bg-[#00C853] text-[#050A1F] py-3 rounded font-black uppercase tracking-[0.15em] text-xs hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(0,200,83,0.3)] flex items-center justify-center gap-2">
            <CheckCircle size={14} /> Mark Zone Complete
          </button>
        )}
        {zone.status === "complete" && (
          <button className="w-full bg-[#FFD600]/20 text-[#FFD600] py-3 rounded font-black uppercase tracking-[0.15em] text-xs border border-[#FFD600]/40 hover:bg-[#FFD600]/30 transition-all flex items-center justify-center gap-2">
            <RefreshCcw size={14} /> Reopen Zone
          </button>
        )}
        <button className="w-full bg-transparent border border-[#2979FF]/30 text-[#AAB2FF] py-2 rounded font-black uppercase tracking-widest text-[10px] hover:border-[#2979FF]/60 hover:text-[#F5F7FF] transition-all">
          Partial Update
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

export function LitDrops() {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ZoneStatus | "all">("all");
  const [searchQ, setSearchQ] = useState("");

  const totalHomes = ZONES.reduce((a, z) => a + z.homes, 0);
  const totalDropped = ZONES.reduce((a, z) => a + z.dropped, 0);
  const overallPct = Math.round((totalDropped / totalHomes) * 100);

  const filtered = ZONES.filter(z => {
    const matchStatus = filterStatus === "all" || z.status === filterStatus;
    const matchSearch = z.name.toLowerCase().includes(searchQ.toLowerCase()) || z.area.toLowerCase().includes(searchQ.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* Main List */}
      <div className={cn("flex flex-col transition-all", selectedZone !== null ? "flex-1" : "w-full")}>

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-[#2979FF]/20 flex-shrink-0">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#F5F7FF] uppercase flex items-center gap-3">
                <BookOpen size={28} className="text-[#FFD600]" style={{ filter: "drop-shadow(0 0 10px #FFD600)" }} />
                Literature Drops
              </h1>
              <p className="text-[#FFD600] text-xs font-bold tracking-[0.2em] uppercase mt-1">
                {ZONES.filter(z => z.status === "in-progress").length} Zones Active · {overallPct}% Overall Coverage
              </p>
            </div>
            <button className="flex items-center gap-2 bg-[#FFD600] text-[#050A1F] px-5 py-2.5 rounded font-black uppercase tracking-widest text-xs hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(255,214,0,0.3)] active:scale-95">
              <Plus size={14} /> New Drop Zone
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4 mb-5">
            {[
              { label: "Total Zones", value: ZONES.length, color: "#2979FF" },
              { label: "Complete", value: ZONES.filter(z => z.status === "complete").length, color: "#00C853" },
              { label: "In Progress", value: ZONES.filter(z => z.status === "in-progress").length, color: "#00E5FF" },
              { label: "Blocked", value: ZONES.filter(z => z.status === "blocked").length, color: "#FF3B30" },
              { label: "Total Dropped", value: `${totalDropped.toLocaleString()}/${totalHomes.toLocaleString()}`, color: "#FFD600" },
            ].map((s, i) => (
              <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-black" style={{ color: s.color, textShadow: `0 0 10px ${s.color}50` }}>{s.value}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
              <span className="text-[#6B72A0] flex items-center gap-2"><TrendingUp size={11} /> Overall Drop Coverage</span>
              <span className="text-[#FFD600]">{overallPct}% — {totalDropped.toLocaleString()} / {totalHomes.toLocaleString()} homes</span>
            </div>
            <div className="h-3 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, #FFD600, #00E5FF)", boxShadow: "0 0 15px rgba(255,214,0,0.5)" }}
              />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-8 py-4 border-b border-[#2979FF]/20 flex items-center gap-4 flex-shrink-0 bg-[#0F1440]/30">
          <div className="relative group flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF] group-focus-within:text-[#00E5FF]" size={13} />
            <input
              type="text"
              placeholder="Search zones..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs pl-9 pr-3 py-2 rounded focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-[#6B72A0]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={11} className="text-[#6B72A0]" />
            {(["all", "complete", "in-progress", "partial", "blocked", "pending"] as const).map(f => {
              const cfg = f === "all" ? { label: "All", color: "#AAB2FF" } : { label: STATUS_CONFIG[f].label, color: STATUS_CONFIG[f].color };
              return (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "px-3 py-1.5 rounded border text-[9px] font-black uppercase tracking-widest transition-all",
                    filterStatus === f ? "border-current bg-current/10" : "border-[#2979FF]/20 text-[#6B72A0] hover:border-[#2979FF]/40 hover:text-[#AAB2FF]"
                  )}
                  style={{ color: filterStatus === f ? cfg.color : undefined }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filtered.map(zone => {
              const scfg = STATUS_CONFIG[zone.status];
              const pcfg = PRIORITY_CONFIG[zone.priority];
              const pct = zone.homes > 0 ? Math.round((zone.dropped / zone.homes) * 100) : 0;
              const selected = selectedZone === zone.id;

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(selected ? null : zone.id)}
                  className={cn(
                    "bg-[#0F1440]/60 border rounded-xl p-5 cursor-pointer transition-all relative overflow-hidden group",
                    selected
                      ? "border-[#FFD600]/60 shadow-[0_0_25px_rgba(255,214,0,0.12)]"
                      : "border-[#2979FF]/20 hover:border-[#2979FF]/50 hover:shadow-[0_0_20px_rgba(41,121,255,0.08)]"
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none" style={{ backgroundColor: scfg.color }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-3">
                      <h3 className="text-[13px] font-black text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors leading-tight">{zone.name}</h3>
                      <p className="text-[10px] text-[#6B72A0] mt-1 flex items-center gap-1">
                        <MapPin size={9} /> {zone.area}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"
                        style={{ backgroundColor: `${scfg.color}15`, color: scfg.color, border: `1px solid ${scfg.color}40` }}
                      >
                        <scfg.icon size={8} /> {scfg.label}
                      </span>
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${pcfg.color}10`, color: pcfg.color, border: `1px solid ${pcfg.color}30` }}
                      >
                        {zone.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-[#6B72A0] font-bold mb-4">
                    <span className="flex items-center gap-1.5"><Users size={10} className="text-[#2979FF]" /> {zone.team}</span>
                    <span className="ml-auto">Sched: {zone.date}</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest" style={{ color: scfg.color }}>
                      <span>{zone.dropped} / {zone.homes} homes</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: scfg.color, boxShadow: `0 0 8px ${scfg.color}60` }}
                      />
                    </div>
                  </div>

                  {zone.status === "blocked" && (
                    <div className="mt-3 flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded p-2">
                      <Lock size={10} className="text-[#FF3B30]" />
                      <span className="text-[9px] font-bold text-[#FF3B30]">Access blocked — requires resolution</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {zone.status !== "complete" && (
                      <button
                        className="flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded border transition-all"
                        style={{ borderColor: `${scfg.color}40`, color: scfg.color, backgroundColor: `${scfg.color}10` }}
                        onClick={e => { e.stopPropagation(); }}
                      >
                        Update Progress
                      </button>
                    )}
                    {zone.status === "complete" && (
                      <button
                        className="flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded border border-[#FFD600]/30 text-[#FFD600] bg-[#FFD600]/10 hover:bg-[#FFD600]/20 transition-all"
                        onClick={e => { e.stopPropagation(); }}
                      >
                        Reopen Zone
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedZone(zone.id); }}
                      className="px-3 text-[9px] font-black uppercase tracking-widest py-2 rounded border border-[#2979FF]/30 text-[#AAB2FF] bg-[#2979FF]/10 hover:border-[#2979FF]/60 hover:text-[#00E5FF] transition-all"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zone Detail Sidebar */}
      {selectedZone !== null && (
        <div className="w-[400px] flex-shrink-0">
          <ZoneDetailPanel
            zone={ZONES.find(z => z.id === selectedZone)!}
            onClose={() => setSelectedZone(null)}
          />
        </div>
      )}
    </div>
  );
}
