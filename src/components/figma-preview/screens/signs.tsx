"use client";
import React, { useState } from "react";
import { MapPin, Plus, Search, CheckCircle, Clock, AlertTriangle, LayoutGrid, List, Flag, Fence, Building2, Home, Trees, Square, Frame, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import NewSignRequestModal from "@/components/figma-preview/new-sign-request-modal";

const SIGN_CONFIGS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "yard-small": { label: "Small Yard", color: "#00C853", icon: Home },
  "yard-large": { label: "Large Yard", color: "#2979FF", icon: Home },
  "window": { label: "Window", color: "#00E5FF", icon: Frame },
  "fence": { label: "Fence", color: "#FFD600", icon: Fence },
  "corner-lot": { label: "Corner Lot", color: "#FF3B30", icon: Flag },
  "business": { label: "Business", color: "#9C27B0", icon: Building2 },
  "tree-lawn": { label: "Tree Lawn", color: "#4CAF50", icon: Trees },
  "boulevard": { label: "Boulevard", color: "#FF9800", icon: Square },
};

const SIGNS = [
  { id: 1, address: "123 Maple St", type: "yard-small", status: "installed", requestDate: "Apr 8", installDate: "Apr 10" },
  { id: 2, address: "456 Oak Ave", type: "yard-large", status: "pending", requestDate: "Apr 9", installDate: null },
  { id: 3, address: "789 Pine Rd", type: "corner-lot", status: "installed", requestDate: "Apr 7", installDate: "Apr 9" },
  { id: 4, address: "321 Elm Dr", type: "business", status: "pending", requestDate: "Apr 10", installDate: null },
  { id: 5, address: "654 Cedar Ln", type: "window", status: "issue", requestDate: "Apr 6", installDate: null },
  { id: 6, address: "987 Birch Blvd", type: "fence", status: "installed", requestDate: "Apr 5", installDate: "Apr 8" },
];

export function Signs() {
  const [tab, setTab] = useState<"queue" | "board" | "map">("queue");
  const [modalOpen, setModalOpen] = useState(false);

  const counts = {
    installed: SIGNS.filter(s => s.status === "installed").length,
    pending: SIGNS.filter(s => s.status === "pending").length,
    issue: SIGNS.filter(s => s.status === "issue").length,
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-[#00E5FF]" />
          <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter">Sign Deployments</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {(["queue", "board", "map"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all", tab === t ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "text-[#AAB2FF] border border-transparent hover:border-[#2979FF]/30")}>{t}</button>
            ))}
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-[#2979FF] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all"><Plus size={14} /> Request Sign</button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-6 py-3 border-b border-[#2979FF]/20 bg-[#0F1440]/40 flex items-center gap-8">
        {[{ label: "Installed", value: counts.installed, color: "#00C853", icon: CheckCircle }, { label: "Pending", value: counts.pending, color: "#FFD600", icon: Clock }, { label: "Issues", value: counts.issue, color: "#FF3B30", icon: AlertTriangle }, { label: "Total", value: SIGNS.length, color: "#2979FF", icon: MapPin }].map((stat, i) => (
          <div key={i} className="flex items-center gap-2">
            <stat.icon size={16} style={{ color: stat.color }} />
            <span className="text-[11px] font-black text-[#6B72A0] uppercase tracking-widest">{stat.label}</span>
            <span className="font-black text-lg" style={{ color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "queue" && (
          <div className="space-y-3">
            {SIGNS.map((sign) => {
              const config = SIGN_CONFIGS[sign.type] ?? { label: sign.type, color: "#AAB2FF", icon: Flag };
              const Icon = config.icon;
              return (
                <div key={sign.id} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5 flex items-center justify-between hover:border-[#2979FF]/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}40` }}>
                      <Icon size={20} style={{ color: config.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{sign.address}</div>
                      <div className="text-[11px] text-[#AAB2FF] mt-0.5">{config.label} · Requested {sign.requestDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {sign.installDate && <div className="text-[11px] text-[#6B72A0]">Installed {sign.installDate}</div>}
                    <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded border", sign.status === "installed" ? "text-[#00C853] border-[#00C853]/40 bg-[#00C853]/10" : sign.status === "pending" ? "text-[#FFD600] border-[#FFD600]/40 bg-[#FFD600]/10" : "text-[#FF3B30] border-[#FF3B30]/40 bg-[#FF3B30]/10")}>{sign.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === "board" && (
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(SIGN_CONFIGS).map(([type, config]) => {
              const count = SIGNS.filter(s => s.type === type).length;
              const Icon = config.icon;
              return (
                <div key={type} className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl p-5 hover:border-[#2979FF]/60 transition-all cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-20" style={{ backgroundColor: config.color }} />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}40` }}>
                    <Icon size={18} style={{ color: config.color }} />
                  </div>
                  <div className="font-black text-[#F5F7FF] text-sm mb-1">{config.label}</div>
                  <div className="text-2xl font-black" style={{ color: config.color }}>{count}</div>
                  <div className="text-[10px] text-[#6B72A0] uppercase tracking-widest">deployed</div>
                </div>
              );
            })}
          </div>
        )}
        {tab === "map" && (
          <div className="h-full relative bg-[#0B0B15] rounded-xl border border-[#2979FF]/20 overflow-hidden min-h-[400px]">
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(41,121,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(41,121,255,0.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center"><MapPin size={48} className="text-[#2979FF] mx-auto mb-4 opacity-40" /><div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Interactive Map — Coming Soon</div></div>
            </div>
          </div>
        )}
      </div>

      <NewSignRequestModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
