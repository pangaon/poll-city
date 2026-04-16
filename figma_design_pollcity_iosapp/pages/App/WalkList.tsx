import React, { useState } from "react";
import {
  List, Filter, MapPin, Download, Phone, Send, Plus,
  CheckCircle, Clock, Home, User, ChevronRight, Search,
  Printer, Navigation, MoreHorizontal, AlertTriangle, X
} from "lucide-react";
import { cn } from "../../utils/cn";

/* ─── MOCK DATA ──────────────────────────────────────────────── */

const WALK_LISTS = [
  { id: 1, name: "Ward 4-A Morning Run", turf: "Ward 4-A", canvasser: "Marcus T.", doors: 42, total: 68, status: "active", created: "Apr 12", pushed: true },
  { id: 2, name: "Ward 4-B Afternoon", turf: "Ward 4-B", canvasser: "Dev P.", doors: 18, total: 55, status: "active", created: "Apr 12", pushed: true },
  { id: 3, name: "North Dist. Lit Drop", turf: "North Dist.", canvasser: "Lisa N.", doors: 55, total: 120, status: "active", created: "Apr 12", pushed: true },
  { id: 4, name: "Riverdale Revisit", turf: "Riverdale", canvasser: "Unassigned", doors: 0, total: 88, status: "pending", created: "Apr 11", pushed: false },
  { id: 5, name: "Downtown GOTV", turf: "Downtown", canvasser: "Sarah K.", doors: 0, total: 200, status: "paused", created: "Apr 10", pushed: false },
  { id: 6, name: "East End Complete", turf: "East End", canvasser: "Tom R.", doors: 145, total: 145, status: "complete", created: "Apr 9", pushed: true },
];

type StopOutcome = "not_started" | "support" | "soft_sup" | "undecided" | "not_home" | "refused" | "revisit";

const STOPS: { id: number; address: string; resident: string; support: StopOutcome; note: string; attempts: number }[] = [
  { id: 1, address: "12 Maple Ave", resident: "Smith, J.", support: "support", note: "Strong supporter – sign requested", attempts: 1 },
  { id: 2, address: "14 Maple Ave", resident: "Johnson, M.", support: "not_home", note: "Knocked twice — no answer", attempts: 2 },
  { id: 3, address: "16 Maple Ave", resident: "Ng, A.", support: "soft_sup", note: "Leaning our way — follow up needed", attempts: 1 },
  { id: 4, address: "18 Maple Ave", resident: "Patel, R.", support: "undecided", note: "Concerned about transit policy", attempts: 1 },
  { id: 5, address: "20 Maple Ave", resident: "Williams, D.", support: "revisit", note: "Requested callback Sat morning", attempts: 1 },
  { id: 6, address: "22 Maple Ave", resident: "Chen, L.", support: "not_started", note: "", attempts: 0 },
  { id: 7, address: "24 Maple Ave", resident: "Garcia, F.", support: "not_started", note: "", attempts: 0 },
  { id: 8, address: "26 Maple Ave", resident: "Brown, K.", support: "refused", note: "Hard no – do not contact", attempts: 1 },
  { id: 9, address: "28 Maple Ave", resident: "Kim, S.", support: "not_started", note: "", attempts: 0 },
  { id: 10, address: "30 Maple Ave", resident: "Davis, P.", support: "not_started", note: "", attempts: 0 },
];

const OUTCOME_CONFIG: Record<StopOutcome, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#6B72A0", bg: "rgba(107,114,160,0.1)" },
  support: { label: "Supporter", color: "#00C853", bg: "rgba(0,200,83,0.15)" },
  soft_sup: { label: "Soft Support", color: "#00E5FF", bg: "rgba(0,229,255,0.1)" },
  undecided: { label: "Undecided", color: "#FFD600", bg: "rgba(255,214,0,0.1)" },
  not_home: { label: "Not Home", color: "#AAB2FF", bg: "rgba(170,178,255,0.1)" },
  refused: { label: "Refused", color: "#FF3B30", bg: "rgba(255,59,48,0.1)" },
  revisit: { label: "Revisit", color: "#FF9F0A", bg: "rgba(255,159,10,0.1)" },
};

/* ─── STOP CARD ──────────────────────────────────────────────── */

function StopCard({ stop, selected, onClick }: { stop: typeof STOPS[0]; selected: boolean; onClick: () => void }) {
  const cfg = OUTCOME_CONFIG[stop.support];

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border transition-all cursor-pointer relative overflow-hidden group",
        selected
          ? "bg-[#0F1440] border-[#00E5FF]/60 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
          : "bg-[#050A1F] border-[#2979FF]/15 hover:border-[#2979FF]/40 hover:bg-[#0F1440]/50"
      )}
    >
      {selected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />}

      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40` }}>
          {stop.support === "support" && <CheckCircle size={12} style={{ color: cfg.color }} />}
          {stop.support === "not_home" && <Clock size={12} style={{ color: cfg.color }} />}
          {stop.support === "revisit" && <Phone size={12} style={{ color: cfg.color }} />}
          {stop.support === "not_started" && <Home size={12} style={{ color: cfg.color }} />}
          {(stop.support === "undecided" || stop.support === "soft_sup" || stop.support === "refused") && (
            <span className="text-[8px] font-black" style={{ color: cfg.color }}>
              {stop.support === "refused" ? "✕" : "?"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{stop.address}</span>
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="text-[10px] text-[#6B72A0] mt-0.5">{stop.resident}</div>
          {stop.note && (
            <div className="text-[10px] text-[#AAB2FF] mt-1.5 italic">"{stop.note}"</div>
          )}
          {stop.attempts > 0 && (
            <div className="text-[9px] text-[#6B72A0] mt-1">{stop.attempts} attempt{stop.attempts > 1 ? "s" : ""}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── LOG INTERACTION PANEL ──────────────────────────────────── */

function LogPanel({ stop, onClose }: { stop: typeof STOPS[0]; onClose: () => void }) {
  const [outcome, setOutcome] = useState<StopOutcome | null>(null);
  const outcomes: StopOutcome[] = ["support", "soft_sup", "undecided", "not_home", "refused", "revisit"];

  return (
    <div className="flex flex-col h-full bg-[#0F1440]/95 border-l border-[#2979FF]/30">
      <div className="px-5 py-4 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
        <div>
          <h3 className="text-[12px] font-black text-[#F5F7FF] uppercase tracking-widest">{stop.address}</h3>
          <p className="text-[10px] text-[#6B72A0] mt-0.5">{stop.resident}</p>
        </div>
        <button onClick={onClose} className="text-[#6B72A0] hover:text-[#F5F7FF] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">

        {/* Outcome Buttons */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-3 block">Outcome</label>
          <div className="grid grid-cols-3 gap-2">
            {outcomes.map(o => {
              const cfg = OUTCOME_CONFIG[o];
              return (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className="py-2 px-2 rounded border text-[9px] font-black uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: outcome === o ? cfg.bg : "rgba(5,10,31,0.8)",
                    color: outcome === o ? cfg.color : "#6B72A0",
                    borderColor: outcome === o ? `${cfg.color}60` : "rgba(41,121,255,0.2)",
                    boxShadow: outcome === o ? `0 0 10px ${cfg.color}20` : "none"
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Resident Name</label>
          <input
            type="text"
            defaultValue={stop.resident}
            className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs p-3 rounded focus:outline-none focus:border-[#00E5FF] transition-all"
          />
        </div>

        {/* Support Level */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Support Level</label>
          <div className="grid grid-cols-5 gap-1">
            {[
              { v: 5, label: "Strong ✓", color: "#00C853" },
              { v: 4, label: "Soft ✓", color: "#00E5FF" },
              { v: 3, label: "Undec.", color: "#FFD600" },
              { v: 2, label: "Soft ✗", color: "#FF9F0A" },
              { v: 1, label: "Hard ✗", color: "#FF3B30" },
            ].map(sl => (
              <button key={sl.v} className="py-2 rounded border border-[#2979FF]/20 hover:border-[#2979FF]/50 text-center transition-all group" style={{ backgroundColor: "rgba(5,10,31,0.8)" }}>
                <div className="text-[11px] font-black" style={{ color: sl.color }}>{sl.v}</div>
                <div className="text-[7px] font-bold uppercase tracking-wider text-[#6B72A0] group-hover:text-[#AAB2FF] transition-colors mt-0.5">{sl.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Issue Flags</label>
          <div className="flex flex-wrap gap-2">
            {["Housing", "Transit", "Safety", "Taxes", "Environment", "Sign Request"].map(issue => (
              <button
                key={issue}
                className="px-2.5 py-1 rounded border border-[#2979FF]/20 text-[9px] font-bold text-[#AAB2FF] uppercase tracking-widest hover:border-[#00E5FF]/40 hover:text-[#00E5FF] hover:bg-[#00E5FF]/5 transition-all"
              >
                {issue}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Notes</label>
          <textarea
            rows={3}
            defaultValue={stop.note}
            placeholder="Add notes about this stop..."
            className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs p-3 rounded focus:outline-none focus:border-[#00E5FF] transition-all resize-none placeholder:text-[#6B72A0]"
          />
        </div>
      </div>

      <div className="p-5 border-t border-[#2979FF]/20 space-y-2 flex-shrink-0">
        <button className="w-full bg-[#2979FF] text-white py-3 rounded font-black uppercase tracking-[0.15em] text-xs hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_15px_rgba(41,121,255,0.4)] flex items-center justify-center gap-2">
          <CheckCircle size={14} /> Save & Next Stop
        </button>
        <button className="w-full bg-transparent border border-[#2979FF]/30 text-[#AAB2FF] py-2 rounded font-black uppercase tracking-widest text-[10px] hover:border-[#2979FF]/60 hover:text-[#F5F7FF] transition-all">
          Flag for Follow-up
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

export function WalkList() {
  const [selectedList, setSelectedList] = useState(0);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"lists" | "route">("lists");
  const [filterOutcome, setFilterOutcome] = useState<StopOutcome | "all">("all");

  const activeList = WALK_LISTS[selectedList];
  const pct = Math.round((activeList.doors / activeList.total) * 100);

  const filteredStops = filterOutcome === "all"
    ? STOPS
    : STOPS.filter(s => s.support === filterOutcome);

  return (
    <div className="flex h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* Left: Walk List Index */}
      <div className="w-[280px] flex-shrink-0 bg-[#0F1440]/90 backdrop-blur-xl border-r border-[#2979FF]/20 flex flex-col">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50 flex-shrink-0">
          <h1 className="text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#F5F7FF]">
            <List size={16} className="text-[#00E5FF]" /> Walk Lists
          </h1>
          <button className="w-7 h-7 rounded border border-[#2979FF]/30 flex items-center justify-center text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-all">
            <Plus size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-[#2979FF]/20">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF] group-focus-within:text-[#00E5FF]" size={13} />
            <input
              type="text"
              placeholder="Search lists..."
              className="w-full bg-[#050A1F] border border-[#2979FF]/30 text-[#F5F7FF] text-xs pl-9 pr-3 py-2 rounded focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-[#6B72A0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {WALK_LISTS.map((list, i) => {
            const lpct = Math.round((list.doors / list.total) * 100);
            const statusColor = { active: "#00E5FF", pending: "#6B72A0", paused: "#FFD600", complete: "#00C853" }[list.status] || "#AAB2FF";
            return (
              <div
                key={list.id}
                onClick={() => { setSelectedList(i); setSelectedStop(null); }}
                className={cn(
                  "p-3 rounded border cursor-pointer transition-all relative overflow-hidden",
                  selectedList === i
                    ? "bg-[#0F1440] border-[#00E5FF]/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                    : "bg-[#050A1F] border-[#2979FF]/15 hover:border-[#2979FF]/40"
                )}
              >
                {selectedList === i && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00E5FF]" />}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#F5F7FF] leading-tight">{list.name}</span>
                  <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded ml-1 flex-shrink-0" style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                    {list.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-[#6B72A0] mb-2">
                  <User size={9} /> <span>{list.canvasser}</span>
                  <span className="ml-auto">{list.doors}/{list.total} doors</span>
                </div>
                <div className="h-1 w-full bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                  <div className="h-full rounded-full transition-all" style={{ width: `${lpct}%`, backgroundColor: statusColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Stop List */}
      <div className={cn("flex flex-col border-r border-[#2979FF]/20 transition-all", selectedStop !== null ? "w-[360px]" : "flex-1")}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-[#2979FF]/20 bg-[#0F1440]/70">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[13px] font-black text-[#F5F7FF] uppercase tracking-widest">{activeList.name}</h2>
              <p className="text-[10px] text-[#6B72A0] mt-0.5">{activeList.turf} · {activeList.canvasser}</p>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded border border-[#2979FF]/30 flex items-center justify-center text-[#AAB2FF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">
                <Printer size={14} />
              </button>
              <button className="w-8 h-8 rounded border border-[#2979FF]/30 flex items-center justify-center text-[#AAB2FF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">
                <Send size={14} />
              </button>
              <button className="w-8 h-8 rounded border border-[#2979FF]/30 flex items-center justify-center text-[#AAB2FF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-all">
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
              <div
                className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-[#00E5FF]">{pct}%</span>
            <span className="text-[9px] text-[#6B72A0]">{activeList.doors}/{activeList.total} doors</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-[#2979FF]/20 bg-[#0F1440]/40 flex items-center gap-2 overflow-x-auto">
          <Filter size={11} className="text-[#6B72A0] flex-shrink-0" />
          {(["all", "not_started", "support", "soft_sup", "undecided", "not_home", "revisit", "refused"] as const).map(f => {
            const cfg = f === "all" ? { label: "All", color: "#AAB2FF" } : { label: OUTCOME_CONFIG[f].label, color: OUTCOME_CONFIG[f].color };
            return (
              <button
                key={f}
                onClick={() => setFilterOutcome(f)}
                className={cn(
                  "px-2.5 py-1 rounded border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                  filterOutcome === f
                    ? "border-current bg-current/10"
                    : "border-[#2979FF]/20 text-[#6B72A0] hover:border-[#2979FF]/40 hover:text-[#AAB2FF]"
                )}
                style={{ color: filterOutcome === f ? cfg.color : undefined }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Stop list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#2979FF]/10">
          {filteredStops.map(stop => (
            <StopCard
              key={stop.id}
              stop={stop}
              selected={selectedStop === stop.id}
              onClick={() => setSelectedStop(selectedStop === stop.id ? null : stop.id)}
            />
          ))}
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 p-4 border-t border-[#2979FF]/20 bg-[#0F1440]/70 flex gap-3">
          <button className="flex-1 bg-[#2979FF] text-white py-2.5 rounded font-black uppercase tracking-[0.1em] text-[10px] hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_15px_rgba(41,121,255,0.3)] flex items-center justify-center gap-2">
            <Navigation size={13} /> Push to Mobile
          </button>
          <button className="flex-1 bg-[#050A1F] border border-[#2979FF]/30 text-[#AAB2FF] py-2.5 rounded font-black uppercase tracking-widest text-[10px] hover:border-[#2979FF]/60 hover:text-[#F5F7FF] transition-all flex items-center justify-center gap-2">
            <Printer size={13} /> Print List
          </button>
        </div>
      </div>

      {/* Right: Log Interaction Panel */}
      {selectedStop !== null && (
        <div className="flex-1 min-w-0">
          <LogPanel
            stop={STOPS.find(s => s.id === selectedStop)!}
            onClose={() => setSelectedStop(null)}
          />
        </div>
      )}
    </div>
  );
}
