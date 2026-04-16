import React, { useState } from "react";
import {
  Users, Plus, Search, Filter, MessageSquare,
  CheckCircle, Clock, MapPin, Phone, Mail,
  ChevronRight, Star, MoreHorizontal, X,
  Calendar, Activity, Heart, Shield, Zap, Eye
} from "lucide-react";
import { cn } from "../../utils/cn";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ─── MOCK DATA ──────────────────────────────────────────────── */

type VolStatus = "active" | "inactive" | "onshift" | "pending";
type VolRole = "Canvasser" | "Team Lead" | "Sign Crew" | "Lit Drop" | "Driver" | "Phone Banker";

interface Volunteer {
  id: number; name: string; email: string; phone: string; role: VolRole;
  status: VolStatus; shifts: number; hours: number; doors: number;
  skills: string[]; availability: string; turf: string; joinDate: string; score: number;
}

const VOLUNTEERS: Volunteer[] = [
  { id: 1, name: "Sarah Kim", email: "sarah.k@gmail.com", phone: "416-555-0101", role: "Team Lead", status: "onshift", shifts: 14, hours: 52, doors: 620, skills: ["Canvassing", "Training", "Spanish"], availability: "Weekends + Mon Eve", turf: "Ward 4", joinDate: "Jan 15", score: 98 },
  { id: 2, name: "Marcus Thompson", email: "m.thompson@mail.com", phone: "416-555-0122", role: "Canvasser", status: "onshift", shifts: 11, hours: 38, doors: 445, skills: ["Canvassing", "Data Entry"], availability: "Weekends", turf: "Ward 4-A", joinDate: "Feb 3", score: 84 },
  { id: 3, name: "Dev Patel", email: "dev.p@outlook.com", phone: "416-555-0133", role: "Canvasser", status: "onshift", shifts: 8, hours: 29, doors: 310, skills: ["Canvassing", "Hindi"], availability: "Sat AM + Thu Eve", turf: "Ward 4-B", joinDate: "Feb 20", score: 76 },
  { id: 4, name: "Aisha Mohamed", email: "aisha.m@gmail.com", phone: "416-555-0144", role: "Sign Crew", status: "onshift", shifts: 12, hours: 44, doors: 0, skills: ["Sign Install", "Heavy Lifting", "Driving"], availability: "All week", turf: "Riverdale", joinDate: "Jan 28", score: 92 },
  { id: 5, name: "Lisa Nguyen", email: "lisa.n@gmail.com", phone: "416-555-0155", role: "Lit Drop", status: "onshift", shifts: 9, hours: 31, doors: 740, skills: ["Lit Drop", "Canvassing"], availability: "Weekends", turf: "North Dist.", joinDate: "Mar 5", score: 80 },
  { id: 6, name: "Tom Reynolds", email: "tom.r@hotmail.com", phone: "416-555-0166", role: "Canvasser", status: "inactive", shifts: 3, hours: 8, doors: 95, skills: ["Canvassing"], availability: "Sporadic", turf: "Ward 4-A", joinDate: "Mar 18", score: 42 },
  { id: 7, name: "Chen Wei", email: "chen.w@mail.com", phone: "416-555-0177", role: "Driver", status: "active", shifts: 6, hours: 22, doors: 0, skills: ["Driving", "Cantonese", "Mandarin"], availability: "Weekends", turf: "All", joinDate: "Feb 10", score: 68 },
  { id: 8, name: "Fatima Hassan", email: "f.hassan@gmail.com", phone: "416-555-0188", role: "Phone Banker", status: "active", shifts: 15, hours: 60, doors: 0, skills: ["Phone Banking", "Arabic", "French"], availability: "Evenings all week", turf: "Remote", joinDate: "Jan 20", score: 95 },
  { id: 9, name: "James O'Brien", email: "james.o@gmail.com", phone: "416-555-0199", role: "Canvasser", status: "pending", shifts: 0, hours: 0, doors: 0, skills: ["Canvassing"], availability: "TBD", turf: "Unassigned", joinDate: "Apr 10", score: 0 },
];

const STATUS_CONFIG: Record<VolStatus, { label: string; color: string }> = {
  onshift: { label: "On Shift", color: "#00E5FF" },
  active: { label: "Active", color: "#00C853" },
  inactive: { label: "Inactive", color: "#FF3B30" },
  pending: { label: "Pending", color: "#FFD600" },
};

const ROLE_COLORS: Record<VolRole, string> = {
  "Team Lead": "#FF3B30",
  "Canvasser": "#2979FF",
  "Sign Crew": "#00C853",
  "Lit Drop": "#FFD600",
  "Driver": "#FF9F0A",
  "Phone Banker": "#AA00FF",
};

const ACTIVITY_DATA = [
  { day: "Mon", shifts: 3 }, { day: "Tue", shifts: 5 }, { day: "Wed", shifts: 4 },
  { day: "Thu", shifts: 7 }, { day: "Fri", shifts: 6 }, { day: "Sat", shifts: 9 }, { day: "Sun", shifts: 8 },
];

/* ─── VOLUNTEER PROFILE DRAWER ───────────────────────────────── */

function VolunteerProfile({ vol, onClose }: { vol: Volunteer; onClose: () => void }) {
  const scfg = STATUS_CONFIG[vol.status];
  const rc = ROLE_COLORS[vol.role];

  const recentShifts = [
    { date: "Apr 12", type: "Canvassing", turf: vol.turf, doors: 42, hours: 4 },
    { date: "Apr 7", type: "Canvassing", turf: vol.turf, doors: 38, hours: 3.5 },
    { date: "Apr 2", type: "Training", turf: "HQ", doors: 0, hours: 2 },
    { date: "Mar 30", type: "Lit Drop", turf: "North Dist.", doors: 120, hours: 3 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F1440]/98 border-l border-[#2979FF]/30">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-[#2979FF]/20 bg-[#050A1F]/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black border-2"
              style={{ backgroundColor: `${rc}20`, borderColor: `${rc}50`, color: rc }}
            >
              {vol.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h3 className="text-[15px] font-black text-[#F5F7FF]">{vol.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: `${rc}20`, color: rc, border: `1px solid ${rc}40` }}>
                  {vol.role}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: `${scfg.color}15`, color: scfg.color, border: `1px solid ${scfg.color}40` }}>
                  {scfg.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6B72A0] hover:text-[#F5F7FF] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2">
          <Star size={12} className="text-[#FFD600]" />
          <div className="h-2 flex-1 bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2979FF] to-[#00E5FF] transition-all"
              style={{ width: `${vol.score}%` }}
            />
          </div>
          <span className="text-[11px] font-black text-[#00E5FF]">{vol.score}</span>
          <span className="text-[9px] text-[#6B72A0] uppercase tracking-widest">Engagement Score</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        {/* Contact */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Contact Info</label>
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-[#050A1F] border border-[#2979FF]/15 rounded p-3">
              <Phone size={11} className="text-[#2979FF]" />
              <span className="text-[11px] font-mono text-[#F5F7FF]">{vol.phone}</span>
              <button className="ml-auto text-[9px] font-black text-[#00E5FF] hover:text-white transition-colors">Call</button>
            </div>
            <div className="flex items-center gap-3 bg-[#050A1F] border border-[#2979FF]/15 rounded p-3">
              <Mail size={11} className="text-[#2979FF]" />
              <span className="text-[11px] text-[#F5F7FF]">{vol.email}</span>
              <button className="ml-auto text-[9px] font-black text-[#00E5FF] hover:text-white transition-colors">Email</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Performance Summary</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Shifts", value: vol.shifts, color: "#2979FF" },
              { label: "Hours", value: `${vol.hours}h`, color: "#00E5FF" },
              { label: "Doors", value: vol.doors, color: "#00C853" },
            ].map(s => (
              <div key={s.label} className="bg-[#050A1F] border border-[#2979FF]/15 rounded-lg p-3 text-center">
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-[#6B72A0] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Skills & Languages</label>
          <div className="flex flex-wrap gap-2">
            {vol.skills.map(skill => (
              <span
                key={skill}
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border border-[#2979FF]/30 text-[#AAB2FF] bg-[#2979FF]/10"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Availability</label>
          <div className="bg-[#050A1F] border border-[#2979FF]/15 rounded p-3">
            <div className="flex items-center gap-2">
              <Calendar size={11} className="text-[#FFD600]" />
              <span className="text-[11px] text-[#F5F7FF]">{vol.availability}</span>
            </div>
          </div>
        </div>

        {/* Shift History */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0] mb-2 block">Shift History</label>
          <div className="space-y-2">
            {recentShifts.map((shift, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#050A1F] border border-[#2979FF]/15 rounded p-3">
                <div className="text-[9px] font-mono text-[#6B72A0] w-14 flex-shrink-0">{shift.date}</div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[#F5F7FF]">{shift.type}</div>
                  <div className="text-[9px] text-[#6B72A0]">{shift.turf}</div>
                </div>
                <div className="text-right text-[9px] text-[#AAB2FF]">
                  <div>{shift.hours}h</div>
                  {shift.doors > 0 && <div className="text-[#00E5FF]">{shift.doors} doors</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-5 border-t border-[#2979FF]/20 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-[#2979FF]/10 border border-[#2979FF]/30 text-[#00E5FF] text-[10px] font-black uppercase tracking-widest py-2.5 rounded hover:bg-[#2979FF]/20 transition-all flex items-center justify-center gap-2">
            <MessageSquare size={12} /> Message
          </button>
          <button className="bg-[#2979FF]/10 border border-[#2979FF]/30 text-[#00E5FF] text-[10px] font-black uppercase tracking-widest py-2.5 rounded hover:bg-[#2979FF]/20 transition-all flex items-center justify-center gap-2">
            <Calendar size={12} /> Assign Shift
          </button>
        </div>
        <button className="w-full bg-[#2979FF] text-white py-2.5 rounded font-black uppercase tracking-widest text-[10px] hover:bg-[#00E5FF] hover:text-[#050A1F] transition-all shadow-[0_0_15px_rgba(41,121,255,0.3)] flex items-center justify-center gap-2">
          <MapPin size={12} /> Assign to Turf
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

export function Volunteers() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<VolRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<VolStatus | "all">("all");
  const [selectedVolunteer, setSelectedVolunteer] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = VOLUNTEERS.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()) ||
      v.turf.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || v.role === filterRole;
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const totalHours = VOLUNTEERS.reduce((a, v) => a + v.hours, 0);
  const totalDoors = VOLUNTEERS.reduce((a, v) => a + v.doors, 0);
  const onShift = VOLUNTEERS.filter(v => v.status === "onshift").length;

  return (
    <div className="flex h-full bg-[#050A1F] text-[#F5F7FF]">

      <div className={cn("flex flex-col transition-all", selectedVolunteer !== null ? "flex-1" : "w-full")}>

        {/* Header */}
        <div className="px-8 pt-7 pb-4 border-b border-[#2979FF]/20 flex-shrink-0">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                <Heart size={28} className="text-[#00C853]" style={{ filter: "drop-shadow(0 0 10px #00C853)" }} />
                Ground Force
              </h1>
              <p className="text-[#00C853] text-xs font-bold tracking-[0.2em] uppercase mt-1">
                {onShift} On Shift · {VOLUNTEERS.filter(v => v.status === "active").length} Active · {totalHours}h Total Hours Logged
              </p>
            </div>
            <div className="flex gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-[#2979FF]/10 border border-[#2979FF]/30 rounded px-4 py-2">
                  <span className="text-[10px] font-black text-[#00E5FF] uppercase tracking-widest">{selectedIds.size} selected</span>
                  <button className="text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest hover:text-[#00E5FF] transition-colors ml-2">Bulk Assign</button>
                  <button className="text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest hover:text-[#00E5FF] transition-colors">Message All</button>
                </div>
              )}
              <button className="flex items-center gap-2 bg-[#00C853] text-[#050A1F] px-5 py-2.5 rounded font-black uppercase tracking-widest text-xs hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(0,200,83,0.3)] active:scale-95">
                <Plus size={14} /> Add Volunteer
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: "Total Volunteers", value: VOLUNTEERS.length, icon: Users, color: "#2979FF" },
              { label: "Currently On Shift", value: onShift, icon: Activity, color: "#00E5FF" },
              { label: "Hours Logged", value: `${totalHours}h`, icon: Clock, color: "#FFD600" },
              { label: "Doors Knocked", value: totalDoors.toLocaleString(), icon: MapPin, color: "#00C853" },
            ].map((k, i) => (
              <div key={i} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-4 relative overflow-hidden group hover:border-[#00E5FF]/30 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-10" style={{ backgroundColor: k.color }} />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">{k.label}</span>
                  <k.icon size={12} style={{ color: k.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: k.color, textShadow: `0 0 10px ${k.color}40` }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-4">
            <div className="relative group flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF] group-focus-within:text-[#00E5FF]" size={13} />
              <input
                type="text"
                placeholder="Search volunteers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0F1440]/60 border border-[#2979FF]/30 text-[#F5F7FF] text-xs pl-9 pr-3 py-2 rounded focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-[#6B72A0]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={11} className="text-[#6B72A0]" />
              {(["all", "onshift", "active", "inactive", "pending"] as const).map(s => {
                const cfg = s === "all" ? { label: "All", color: "#AAB2FF" } : { label: STATUS_CONFIG[s].label, color: STATUS_CONFIG[s].color };
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "px-3 py-1.5 rounded border text-[9px] font-black uppercase tracking-widest transition-all",
                      filterStatus === s ? "border-current bg-current/10" : "border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF] hover:border-[#2979FF]/40"
                    )}
                    style={{ color: filterStatus === s ? cfg.color : undefined }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {(["all", "Canvasser", "Team Lead", "Sign Crew", "Lit Drop", "Driver", "Phone Banker"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r as VolRole | "all")}
                  className={cn(
                    "px-2.5 py-1 rounded border text-[9px] font-black uppercase tracking-wider transition-all",
                    filterRole === r
                      ? "border-current bg-current/10"
                      : "border-[#2979FF]/15 text-[#6B72A0] hover:text-[#AAB2FF]"
                  )}
                  style={{ color: filterRole === r && r !== "all" ? ROLE_COLORS[r as VolRole] : filterRole === r ? "#AAB2FF" : undefined }}
                >
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#050A1F]/95 backdrop-blur z-10">
              <tr className="border-b border-[#2979FF]/20">
                <th className="px-4 py-3 w-10">
                  <div className="w-4 h-4 border border-[#2979FF]/40 rounded" />
                </th>
                {["Volunteer", "Role", "Status", "Assigned Turf", "Shifts", "Hours", "Doors", "Score", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(vol => {
                const scfg = STATUS_CONFIG[vol.status];
                const rc = ROLE_COLORS[vol.role];
                const isSelected = selectedIds.has(vol.id);
                const isProfileOpen = selectedVolunteer === vol.id;

                return (
                  <tr
                    key={vol.id}
                    className={cn(
                      "border-b border-[#2979FF]/10 transition-colors group",
                      isProfileOpen ? "bg-[#2979FF]/10" : "hover:bg-[#2979FF]/5"
                    )}
                  >
                    <td className="px-4 py-4" onClick={() => toggleSelect(vol.id)}>
                      <div
                        className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center cursor-pointer transition-all",
                          isSelected ? "bg-[#2979FF] border-[#2979FF]" : "border-[#2979FF]/40 hover:border-[#00E5FF]"
                        )}
                      >
                        {isSelected && <CheckCircle size={10} className="text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ backgroundColor: `${rc}20`, border: `1px solid ${rc}40`, color: rc }}
                        >
                          {vol.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{vol.name}</div>
                          <div className="text-[9px] text-[#6B72A0]">{vol.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded" style={{ backgroundColor: `${rc}15`, color: rc, border: `1px solid ${rc}30` }}>
                        {vol.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
                        style={{ backgroundColor: `${scfg.color}10`, color: scfg.color, border: `1px solid ${scfg.color}30` }}
                      >
                        {scfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[11px] text-[#AAB2FF]">{vol.turf}</td>
                    <td className="px-4 py-4 text-[12px] font-bold text-[#F5F7FF]">{vol.shifts}</td>
                    <td className="px-4 py-4 text-[12px] font-bold text-[#00E5FF]">{vol.hours}h</td>
                    <td className="px-4 py-4 text-[12px] font-bold text-[#00C853]">{vol.doors.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/20">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2979FF] to-[#00E5FF]"
                            style={{ width: `${vol.score}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-[#AAB2FF]">{vol.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedVolunteer(isProfileOpen ? null : vol.id)}
                          className={cn(
                            "text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest px-2.5 py-1.5 rounded border transition-all flex items-center gap-1",
                            isProfileOpen
                              ? "bg-[#2979FF]/30 border-[#2979FF]/60 text-[#00E5FF]"
                              : "bg-[#2979FF]/10 border-[#2979FF]/20 hover:border-[#2979FF]/50 hover:text-[#00E5FF]"
                          )}
                        >
                          <Eye size={9} /> Profile
                        </button>
                        <button className="text-[9px] font-black text-[#AAB2FF] uppercase tracking-widest bg-[#2979FF]/10 border border-[#2979FF]/20 px-2.5 py-1.5 rounded hover:border-[#2979FF]/50 hover:text-[#00E5FF] transition-all flex items-center gap-1">
                          <Zap size={9} /> Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-[#6B72A0]">
              <Users size={28} className="mb-3 opacity-40" />
              <p className="text-sm font-bold uppercase tracking-widest">No volunteers match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Drawer */}
      {selectedVolunteer !== null && (
        <div className="w-[380px] flex-shrink-0">
          <VolunteerProfile
            vol={VOLUNTEERS.find(v => v.id === selectedVolunteer)!}
            onClose={() => setSelectedVolunteer(null)}
          />
        </div>
      )}
    </div>
  );
}
