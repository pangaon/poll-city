import React, { useState } from "react";
import {
  MapPin, Target, Plus, Search, Camera,
  CheckCircle, Clock, XCircle, AlertTriangle, Map,
  List, MoreHorizontal, Phone, User,
  RefreshCcw, Trash2, Home, Trees, Square,
  LayoutGrid, Flag, Fence, Building2, Frame, Eye,
  ChevronDown, Download, TrendingUp, Package
} from "lucide-react";
import { cn } from "../../utils/cn";
import NewSignRequestModal from "../../components/NewSignRequestModal";

/* ─── TYPES ──────────────────────────────────────────────── */

type SignStatus = "requested" | "scheduled" | "installed" | "removed" | "declined";

type SignType =
  | "small-lawn"
  | "large-lawn"
  | "corner-lot"
  | "window"
  | "fence"
  | "balcony"
  | "boulevard"
  | "banner";

/* ─── CONFIG ─────────────────────────────────────────────── */

const SIGN_TYPE_CONFIG: Record<SignType, {
  label: string;
  size: string;
  color: string;
  icon: React.ElementType;
  shortCode: string;
}> = {
  "small-lawn":  { label: "Small Lawn",  size: '12×18"', color: "#00C853", icon: Home,      shortCode: "SML" },
  "large-lawn":  { label: "Large Lawn",  size: '18×24"', color: "#2979FF", icon: Home,      shortCode: "LRG" },
  "corner-lot":  { label: "Corner Lot",  size: '18×24"×2', color: "#FF9F0A", icon: Flag,   shortCode: "CRN" },
  "window":      { label: "Window",      size: '11×17"', color: "#00E5FF", icon: Frame,    shortCode: "WIN" },
  "fence":       { label: "Fence",       size: '18×24"', color: "#9C27B0", icon: Fence,    shortCode: "FNC" },
  "balcony":     { label: "Balcony",     size: '18×24"', color: "#FF3B30", icon: Building2, shortCode: "BAL" },
  "boulevard":   { label: "Boulevard",   size: '24×36"', color: "#FFD600", icon: Trees,    shortCode: "BLV" },
  "banner":      { label: "Banner",      size: "3×8′",   color: "#FF6B35", icon: Square,   shortCode: "BNR" },
};

const STATUS_CONFIG: Record<SignStatus, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: "Requested", color: "#2979FF", icon: Clock },
  scheduled:  { label: "Scheduled", color: "#FFD600", icon: Clock },
  installed:  { label: "Installed",  color: "#00C853", icon: CheckCircle },
  removed:    { label: "Removed",   color: "#6B72A0", icon: RefreshCcw },
  declined:   { label: "Declined",  color: "#FF3B30", icon: XCircle },
};

/* ─── MOCK DATA ──────────────────────────────────────────── */

const SIGN_QUEUE: {
  id: number; name: string; address: string; phone: string;
  requested: string; note: string; support: number;
  signType: SignType; qty: number;
}[] = [
  { id: 1, name: "Margaret Chen",  address: "44 Maple Ave, Unit 2",  phone: "416-555-0121", requested: "2h ago",  note: "Backyard install preferred — full fence line",     support: 5, signType: "fence",      qty: 3 },
  { id: 2, name: "David Williams", address: "112 Oak Street",         phone: "416-555-0188", requested: "3h ago",  note: "Front lawn — high traffic intersection",           support: 4, signType: "corner-lot", qty: 2 },
  { id: 3, name: "Priya Patel",    address: "78 River Rd",            phone: "416-555-0144", requested: "5h ago",  note: "Corner lot — very high visibility, 2 roads",       support: 5, signType: "large-lawn", qty: 1 },
  { id: 4, name: "James Murphy",   address: "200 King St W, #804",    phone: "416-555-0199", requested: "8h ago",  note: "Balcony unit — faces main road",                   support: 4, signType: "balcony",    qty: 2 },
  { id: 5, name: "Fatima Al-Zahra",address: "55 Dalhousie St",        phone: "416-555-0233", requested: "10h ago", note: "Window display — ground floor office unit",        support: 5, signType: "window",     qty: 1 },
  { id: 6, name: "Nguyen Thi Lan", address: "33 Parliament St",       phone: "416-555-0312", requested: "Yesterday",note: "Boulevard median outside — city permit attached", support: 3, signType: "boulevard",  qty: 4 },
];

const SIGN_BOARD: {
  id: number; name: string; address: string; status: SignStatus;
  installDate: string; removeDate: string; crew: string; photoProof: boolean;
  note: string; signType: SignType; qty: number;
}[] = [
  { id: 1,  name: "Margaret Chen",   address: "44 Maple Ave",       status: "installed", installDate: "Apr 10", removeDate: "—",      crew: "Aisha M.",  photoProof: true,  note: "",                                    signType: "fence",      qty: 3 },
  { id: 2,  name: "Tom Harrison",    address: "18 Oak Blvd",        status: "installed", installDate: "Apr 9",  removeDate: "—",      crew: "Marcus T.", photoProof: true,  note: "",                                    signType: "large-lawn", qty: 1 },
  { id: 3,  name: "Sophia Kim",      address: "7 Birch Cres",       status: "scheduled", installDate: "Apr 13", removeDate: "—",      crew: "Aisha M.",  photoProof: false, note: "Saturday AM slot — confirm day before",signType: "corner-lot", qty: 2 },
  { id: 4,  name: "Robert Liu",      address: "330 Queen St",       status: "requested", installDate: "—",      removeDate: "—",      crew: "Unassigned",photoProof: false, note: "",                                    signType: "small-lawn", qty: 1 },
  { id: 5,  name: "Linda Park",      address: "55 Elm St",          status: "removed",   installDate: "Apr 5",  removeDate: "Apr 11", crew: "Dev P.",    photoProof: true,  note: "Election law — 30-day area restriction", signType: "large-lawn",qty: 1 },
  { id: 6,  name: "Gary Foster",     address: "892 Main St",        status: "declined",  installDate: "—",      removeDate: "—",      crew: "—",         photoProof: false, note: "HOA restrictions — cannot install",    signType: "small-lawn", qty: 1 },
  { id: 7,  name: "Anna Torres",     address: "14 Cedar Ave",       status: "installed", installDate: "Apr 8",  removeDate: "—",      crew: "Marcus T.", photoProof: true,  note: "",                                    signType: "window",     qty: 2 },
  { id: 8,  name: "Kevin Zhang",     address: "201 Dundas W",       status: "installed", installDate: "Apr 7",  removeDate: "—",      crew: "Aisha M.",  photoProof: true,  note: "",                                    signType: "balcony",    qty: 1 },
  { id: 9,  name: "Yi-Ling Chow",    address: "88 Broadview Ave",   status: "installed", installDate: "Apr 11", removeDate: "—",      crew: "Dev P.",    photoProof: true,  note: "",                                    signType: "boulevard",  qty: 3 },
  { id: 10, name: "Patrick Sullivan",address: "45 Gerrard St E",    status: "scheduled", installDate: "Apr 14", removeDate: "—",      crew: "Marcus T.", photoProof: false, note: "Confirm parking — no overnight",       signType: "banner",     qty: 1 },
  { id: 11, name: "Dana Whitfield",  address: "100 Pape Ave",       status: "requested", installDate: "—",      removeDate: "—",      crew: "Unassigned",photoProof: false, note: "Fence along south property — long run",signType: "fence",      qty: 5 },
  { id: 12, name: "Wei-Chen Liang",  address: "22 Carlaw Ave",      status: "installed", installDate: "Apr 6",  removeDate: "—",      crew: "Aisha M.",  photoProof: true,  note: "",                                    signType: "corner-lot", qty: 2 },
];

/* ─── SIGN TYPE BADGE ────────────────────────────────────── */

function SignTypeBadge({ type, size = "sm" }: { type: SignType; size?: "xs" | "sm" | "md" }) {
  const cfg = SIGN_TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[8px] gap-1",
    sm: "px-2 py-1 text-[9px] gap-1.5",
    md: "px-3 py-1.5 text-[10px] gap-2",
  };
  return (
    <span
      className={cn("inline-flex items-center font-black uppercase tracking-widest rounded-md", sizeClasses[size])}
      style={{ backgroundColor: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      <Icon size={size === "xs" ? 8 : size === "sm" ? 10 : 12} />
      {cfg.label}
      {size !== "xs" && <span className="opacity-60 ml-0.5">· {cfg.size}</span>}
    </span>
  );
}

/* ─── SIGN QUEUE TAB ─────────────────────────────────────── */

function SignQueueTab({ onNewRequest }: { onNewRequest: () => void }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SignType | "all">("all");

  const filtered = SIGN_QUEUE.filter(req => {
    const matchSearch = req.name.toLowerCase().includes(search.toLowerCase()) ||
      req.address.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || req.signType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#2979FF]/15 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B72A0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or address…"
              className="w-full bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6B72A0] focus:outline-none focus:border-[#00E5FF]/50"
            />
          </div>
          <button
            onClick={onNewRequest}
            className="flex items-center gap-2 bg-[#FF3B30] text-white px-4 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-[#FF3B30]/80 transition-all shadow-[0_0_15px_rgba(255,59,48,0.3)] active:scale-95"
          >
            <Plus size={13} /> New Request
          </button>
        </div>
        {/* Sign type filter chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
              typeFilter === "all"
                ? "bg-[#2979FF]/20 border-[#2979FF]/50 text-[#00E5FF]"
                : "border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF]"
            )}
          >
            All Types
          </button>
          {(Object.keys(SIGN_TYPE_CONFIG) as SignType[]).map(t => {
            const cfg = SIGN_TYPE_CONFIG[t];
            const count = SIGN_QUEUE.filter(q => q.signType === t).length;
            if (count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all"
                style={{
                  backgroundColor: typeFilter === t ? `${cfg.color}20` : "rgba(15,20,64,0.4)",
                  borderColor: typeFilter === t ? `${cfg.color}60` : "rgba(41,121,255,0.2)",
                  color: typeFilter === t ? cfg.color : "#6B72A0",
                  boxShadow: typeFilter === t ? `0 0 10px ${cfg.color}20` : undefined,
                }}
              >
                {cfg.shortCode} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-2xl space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#6B72A0]">
              <Flag size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No requests match your filter</p>
            </div>
          )}
          {filtered.map(req => (
            <div
              key={req.id}
              className="bg-[#0F1440]/60 border border-[#2979FF]/20 hover:border-[#2979FF]/50 rounded-xl p-5 transition-all relative overflow-hidden group"
            >
              {/* Ambient glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-40"
                style={{ backgroundColor: `${SIGN_TYPE_CONFIG[req.signType].color}20` }}
              />

              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center font-black text-[#00E5FF] text-sm flex-shrink-0">
                    {req.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#F5F7FF]">{req.name}</div>
                    <div className="text-[10px] text-[#6B72A0] flex items-center gap-1 mt-0.5">
                      <MapPin size={9} /> {req.address}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[9px] text-[#6B72A0] font-bold">{req.requested}</span>
                  {/* Support stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <div
                        key={s}
                        className="w-2 h-2 rounded-sm transform rotate-45"
                        style={{ backgroundColor: s <= req.support ? "#00E5FF" : "#2979FF30" }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sign type + qty badges */}
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <SignTypeBadge type={req.signType} size="sm" />
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border"
                  style={{ backgroundColor: "#2979FF18", color: "#AAB2FF", borderColor: "#2979FF30" }}
                >
                  <Package size={9} /> {req.qty} {req.qty === 1 ? "sign" : "signs"}
                </span>
              </div>

              {req.note && (
                <div className="mb-3 bg-[#050A1F]/60 border border-[#2979FF]/15 rounded-lg p-3 relative z-10">
                  <p className="text-[10px] text-[#AAB2FF] italic">"{req.note}"</p>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Phone size={11} className="text-[#6B72A0]" />
                <span className="text-[10px] text-[#AAB2FF] font-mono">{req.phone}</span>
              </div>

              <div className="flex gap-3 relative z-10">
                <button className="flex-1 bg-[#00C853]/10 border border-[#00C853]/40 text-[#00C853] text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-[#00C853]/20 hover:shadow-[0_0_15px_rgba(0,200,83,0.2)] transition-all flex items-center justify-center gap-2">
                  <CheckCircle size={12} /> Schedule Install
                </button>
                <button className="flex-1 bg-[#2979FF]/10 border border-[#2979FF]/30 text-[#AAB2FF] text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-[#2979FF]/20 transition-all flex items-center justify-center gap-2">
                  <User size={12} /> Assign Crew
                </button>
                <button className="px-4 bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-[#FF3B30]/20 transition-all">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── SIGN BOARD TAB ─────────────────────────────────────── */

function SignBoardTab() {
  const [filterStatus, setFilterStatus] = useState<SignStatus | "all">("all");
  const [filterType, setFilterType] = useState<SignType | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = SIGN_BOARD.filter(s => {
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchType = filterType === "all" || s.signType === filterType;
    const matchSearch = search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const stats = (["requested", "scheduled", "installed", "removed", "declined"] as SignStatus[]).map(s => ({
    status: s,
    count: SIGN_BOARD.filter(sg => sg.status === s).length,
    qty: SIGN_BOARD.filter(sg => sg.status === s).reduce((a, b) => a + b.qty, 0),
    ...STATUS_CONFIG[s],
  }));

  const totalInstalled = SIGN_BOARD.filter(s => s.status === "installed").reduce((a, b) => a + b.qty, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Status strip */}
      <div className="flex-shrink-0 px-6 py-4 bg-[#0F1440]/40 border-b border-[#2979FF]/20">
        <div className="flex gap-3 flex-wrap items-center">
          {stats.map(s => (
            <button
              key={s.status}
              onClick={() => setFilterStatus(filterStatus === s.status ? "all" : s.status)}
              className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all")}
              style={{
                backgroundColor: filterStatus === s.status ? `${s.color}18` : "rgba(15,20,64,0.5)",
                borderColor: filterStatus === s.status ? `${s.color}50` : "rgba(41,121,255,0.2)",
                boxShadow: filterStatus === s.status ? `0 0 15px ${s.color}25` : undefined,
              }}
            >
              <s.icon size={13} style={{ color: s.color }} />
              <div className="text-left">
                <div className="text-base font-black leading-none" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[7px] font-black uppercase tracking-widest text-[#6B72A0] mt-0.5">{s.label} · {s.qty} signs</div>
              </div>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="text-[10px] font-black text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/30 px-3 py-2 rounded-lg">
              {totalInstalled} signs in field
            </div>
            <button className="flex items-center gap-2 border border-[#2979FF]/20 text-[#6B72A0] text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg hover:text-[#AAB2FF] hover:border-[#2979FF]/40 transition-all">
              <Download size={11} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Sign type + search filter bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[#2979FF]/10 flex gap-3 items-center flex-wrap bg-[#050A1F]/50">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B72A0]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-lg pl-7 pr-3 py-2 text-[11px] text-[#F5F7FF] placeholder:text-[#6B72A0] focus:outline-none focus:border-[#00E5FF]/40 w-36"
          />
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-[#6B72A0] mr-1">Sign Type:</div>
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
            filterType === "all"
              ? "bg-[#2979FF]/20 border-[#2979FF]/50 text-[#00E5FF]"
              : "border-[#2979FF]/15 text-[#6B72A0] hover:text-[#AAB2FF]"
          )}
        >
          All
        </button>
        {(Object.keys(SIGN_TYPE_CONFIG) as SignType[]).map(t => {
          const cfg = SIGN_TYPE_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? "all" : t)}
              className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
              style={{
                backgroundColor: filterType === t ? `${cfg.color}20` : "rgba(15,20,64,0.3)",
                borderColor: filterType === t ? `${cfg.color}50` : "rgba(41,121,255,0.15)",
                color: filterType === t ? cfg.color : "#6B72A0",
              }}
            >
              {cfg.shortCode}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0B0F35]/95 backdrop-blur-sm z-10">
            <tr className="border-b border-[#2979FF]/20">
              {["Supporter", "Address", "Sign Type", "Qty", "Status", "Install Date", "Crew", "Photo", "Actions"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[8px] font-black uppercase tracking-widest text-[#6B72A0] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-[#6B72A0]">
                  <Target size={28} className="mx-auto mb-3 opacity-30" />
                  <div className="text-sm font-bold">No signs match your filters</div>
                </td>
              </tr>
            ) : filtered.map((sign, idx) => {
              const scfg = STATUS_CONFIG[sign.status];
              const tcfg = SIGN_TYPE_CONFIG[sign.signType];
              return (
                <tr
                  key={sign.id}
                  className={cn(
                    "border-b border-[#2979FF]/10 hover:bg-[#2979FF]/5 transition-colors group",
                    idx % 2 === 0 ? "" : "bg-[#0F1440]/20"
                  )}
                >
                  {/* Supporter */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#2979FF]/15 border border-[#2979FF]/30 flex items-center justify-center text-[9px] font-black text-[#00E5FF] flex-shrink-0">
                        {sign.name.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors whitespace-nowrap">{sign.name}</span>
                    </div>
                  </td>

                  {/* Address */}
                  <td className="px-5 py-3.5 text-[10px] text-[#AAB2FF] whitespace-nowrap">{sign.address}</td>

                  {/* Sign Type */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                      style={{ backgroundColor: `${tcfg.color}18`, color: tcfg.color, border: `1px solid ${tcfg.color}40` }}
                    >
                      <tcfg.icon size={9} />
                      {tcfg.label}
                    </span>
                    <div className="text-[8px] text-[#6B72A0] mt-0.5 pl-0.5">{tcfg.size}</div>
                  </td>

                  {/* Qty */}
                  <td className="px-5 py-3.5">
                    <span className="text-[#F5F7FF] font-black text-sm tabular-nums">{sign.qty}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <span
                      className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 w-fit whitespace-nowrap"
                      style={{ backgroundColor: `${scfg.color}18`, color: scfg.color, border: `1px solid ${scfg.color}40` }}
                    >
                      <scfg.icon size={8} /> {scfg.label}
                    </span>
                    {sign.note && (
                      <p className="text-[8px] text-[#6B72A0] mt-1 italic max-w-[120px] truncate" title={sign.note}>{sign.note}</p>
                    )}
                  </td>

                  {/* Install Date */}
                  <td className="px-5 py-3.5 text-[10px] font-mono text-[#AAB2FF] whitespace-nowrap">{sign.installDate}</td>

                  {/* Crew */}
                  <td className="px-5 py-3.5 text-[10px] text-[#AAB2FF] whitespace-nowrap">{sign.crew}</td>

                  {/* Photo */}
                  <td className="px-5 py-3.5">
                    {sign.photoProof ? (
                      <span className="flex items-center gap-1 text-[#00C853] text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        <Camera size={10} /> Verified
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#6B72A0]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {sign.status === "installed" && (
                        <>
                          <button className="text-[8px] font-black text-[#6B72A0] bg-[#2979FF]/10 border border-[#2979FF]/20 px-2 py-1 rounded-md uppercase tracking-widest hover:text-[#FF3B30] hover:border-[#FF3B30]/30 hover:bg-[#FF3B30]/10 transition-all flex items-center gap-1 whitespace-nowrap">
                            <Trash2 size={8} /> Remove
                          </button>
                          <button className="text-[8px] font-black text-[#6B72A0] bg-[#2979FF]/10 border border-[#2979FF]/20 px-2 py-1 rounded-md uppercase tracking-widest hover:text-[#FFD600] hover:border-[#FFD600]/30 transition-all flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle size={8} /> Damage
                          </button>
                        </>
                      )}
                      {sign.status === "requested" && (
                        <>
                          <button className="text-[8px] font-black text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/30 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-[#00C853]/20 transition-all whitespace-nowrap">
                            Schedule
                          </button>
                          <button className="text-[8px] font-black text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/30 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-[#FF3B30]/20 transition-all">
                            Decline
                          </button>
                        </>
                      )}
                      {sign.status === "scheduled" && (
                        <button className="text-[8px] font-black text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/30 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-[#00C853]/20 transition-all flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle size={8} /> Installed
                        </button>
                      )}
                      {(sign.status === "removed" || sign.status === "declined") && (
                        <span className="text-[8px] text-[#6B72A0] font-bold uppercase tracking-widest">No Actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── MAP VIEW ───────────────────────────────────────────── */

function MapViewTab() {
  return (
    <div className="flex-1 relative bg-[#0B0B15] overflow-hidden m-6 rounded-xl border border-[#2979FF]/30">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: "linear-gradient(rgba(41,121,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radar sweep */}
      <div className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_85%,rgba(255,59,48,0.15)_100%)] rounded-full animate-[spin_6s_linear_infinite] pointer-events-none" />

      {/* Header */}
      <div className="absolute top-4 left-4 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded-xl px-4 py-2.5 z-10">
        <div className="text-[8px] font-black uppercase tracking-widest text-[#6B72A0] mb-1">Ward 3 — Riverdale East</div>
        <div className="text-xs font-black text-[#F5F7FF]">{SIGN_BOARD.filter(s => s.status !== "declined").length} Sign Locations</div>
      </div>

      {/* Sign blips */}
      {SIGN_BOARD.filter(s => s.status !== "declined").map((sign, i) => {
        const x = 12 + (i * 17 + 3) % 74;
        const y = 12 + (i * 13 + 7) % 70;
        const scfg = STATUS_CONFIG[sign.status];
        const tcfg = SIGN_TYPE_CONFIG[sign.signType];
        return (
          <div
            key={sign.id}
            className="absolute group cursor-pointer z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {/* Diamond blip */}
            <div
              className="w-3.5 h-3.5 transform rotate-45 transition-all group-hover:scale-150 group-hover:rotate-[225deg]"
              style={{ backgroundColor: scfg.color, boxShadow: `0 0 12px ${scfg.color}` }}
            />
            {/* Quantity badge */}
            {sign.qty > 1 && (
              <div
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center bg-[#050A1F] border"
                style={{ color: tcfg.color, borderColor: `${tcfg.color}60` }}
              >
                {sign.qty}
              </div>
            )}
            {/* Tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#050A1F]/95 backdrop-blur border rounded-xl px-3 py-2 text-[9px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 space-y-0.5"
              style={{ borderColor: `${scfg.color}50`, color: scfg.color }}
            >
              <div>{sign.name}</div>
              <div className="text-[#6B72A0] normal-case font-normal">{sign.address}</div>
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] mt-1"
                style={{ backgroundColor: `${tcfg.color}20`, color: tcfg.color }}
              >
                <tcfg.icon size={7} /> {tcfg.label} · {sign.qty} {sign.qty === 1 ? "sign" : "signs"}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded-xl p-4 z-10">
        <div className="text-[7px] font-black text-[#6B72A0] uppercase tracking-widest mb-3">Status</div>
        {(["installed", "scheduled", "requested", "removed"] as SignStatus[]).map(s => {
          const scfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 transform rotate-45 flex-shrink-0" style={{ backgroundColor: scfg.color, boxShadow: `0 0 6px ${scfg.color}` }} />
              <span className="text-[8px] font-black uppercase tracking-widest text-[#AAB2FF]">{scfg.label}</span>
            </div>
          );
        })}
        <div className="border-t border-[#2979FF]/20 mt-3 pt-3">
          <div className="text-[7px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">Sign Type</div>
          {(Object.keys(SIGN_TYPE_CONFIG) as SignType[]).map(t => {
            const tcfg = SIGN_TYPE_CONFIG[t];
            const count = SIGN_BOARD.filter(s => s.signType === t && s.status !== "declined").length;
            if (count === 0) return null;
            return (
              <div key={t} className="flex items-center gap-2 mb-1.5">
                <tcfg.icon size={8} style={{ color: tcfg.color }} />
                <span className="text-[8px] font-bold text-[#AAB2FF]">{tcfg.label}</span>
                <span className="text-[8px] font-black ml-auto" style={{ color: tcfg.color }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="absolute bottom-6 left-6 bg-[#0F1440]/90 backdrop-blur border border-[#2979FF]/30 rounded-xl p-4 z-10">
        <div className="text-[7px] font-black text-[#6B72A0] uppercase tracking-widest mb-2">Field Summary</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle size={10} className="text-[#00C853]" />
            <span className="text-[10px] font-black text-[#00C853]">
              {SIGN_BOARD.filter(s => s.status === "installed").reduce((a, b) => a + b.qty, 0)} signs installed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={10} className="text-[#FFD600]" />
            <span className="text-[10px] font-black text-[#FFD600]">
              {SIGN_BOARD.filter(s => s.status === "scheduled").reduce((a, b) => a + b.qty, 0)} scheduled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={10} className="text-[#2979FF]" />
            <span className="text-[10px] font-black text-[#AAB2FF]">
              {SIGN_QUEUE.reduce((a, b) => a + b.qty, 0)} requested
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */

export function Signs() {
  const [activeTab, setActiveTab] = useState<"queue" | "board" | "map">("queue");
  const [modalOpen, setModalOpen] = useState(false);

  const queueCount = SIGN_QUEUE.length;
  const totalQueueSigns = SIGN_QUEUE.reduce((a, b) => a + b.qty, 0);
  const installedCount = SIGN_BOARD.filter(s => s.status === "installed").length;
  const installedQty = SIGN_BOARD.filter(s => s.status === "installed").reduce((a, b) => a + b.qty, 0);

  return (
    <div className="flex flex-col h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* Header */}
      <div className="px-8 pt-7 pb-4 border-b border-[#2979FF]/20 flex-shrink-0">
        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#F5F7FF] uppercase flex items-center gap-3">
              <MapPin size={28} className="text-[#FF3B30]" style={{ filter: "drop-shadow(0 0 10px #FF3B30)" }} />
              Sign Operations
            </h1>
            <p className="text-[#6B72A0] text-xs font-bold tracking-[0.15em] uppercase mt-1.5 flex items-center gap-4">
              <span className="text-[#00C853]">{installedCount} locations · {installedQty} signs installed</span>
              <span>·</span>
              <span className="text-[#2979FF]">{queueCount} requests · {totalQueueSigns} signs pending</span>
              <span>·</span>
              <span>Tracking {SIGN_BOARD.length} total locations</span>
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#FF3B30] text-white px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-[#FF3B30]/80 transition-all shadow-[0_0_20px_rgba(255,59,48,0.35)] active:scale-95"
          >
            <Plus size={14} /> New Sign Request
          </button>
        </div>

        {/* Sign type legend row */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {(Object.keys(SIGN_TYPE_CONFIG) as SignType[]).map(t => {
            const cfg = SIGN_TYPE_CONFIG[t];
            const boardCount = SIGN_BOARD.filter(s => s.signType === t).length;
            const queueCount = SIGN_QUEUE.filter(s => s.signType === t).length;
            const total = boardCount + queueCount;
            if (total === 0) return null;
            return (
              <div
                key={t}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest"
                style={{ backgroundColor: `${cfg.color}12`, borderColor: `${cfg.color}35`, color: cfg.color }}
              >
                <cfg.icon size={9} />
                {cfg.label}
                <span className="opacity-60 ml-0.5">{total}</span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-[#050A1F] border border-[#2979FF]/20 rounded-xl p-1 w-fit">
          {([
            { id: "queue", label: "Sign Queue", count: queueCount, icon: Clock },
            { id: "board", label: "Sign Board", count: SIGN_BOARD.length, icon: List },
            { id: "map",   label: "Map View",   count: null, icon: Map },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id
                  ? "bg-[#2979FF] text-white shadow-[0_0_15px_rgba(41,121,255,0.4)]"
                  : "text-[#6B72A0] hover:text-[#AAB2FF]"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
              {tab.count !== null && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-black",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-[#2979FF]/20 text-[#AAB2FF]"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "queue" && <SignQueueTab onNewRequest={() => setModalOpen(true)} />}
      {activeTab === "board" && <SignBoardTab />}
      {activeTab === "map"   && <MapViewTab />}

      {/* New Sign Request Modal */}
      <NewSignRequestModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
