import React, { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, Download, Mail, Phone, Tag, ChevronRight, Zap, Crosshair } from "lucide-react";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "motion/react";

const DEMO_CONTACTS = [
  { id: "1001", name: "Sarah Jenkins", hhold: "Jenkins H.", class: "A1", phone: "(555) 019-2834", email: "sarah.j@ext.net", score: 85, status: "ACTIVE", tags: ["DN", "VL", "YS"] },
  { id: "1002", name: "Michael Chang", hhold: "Chang C.", class: "U3", phone: "(555) 124-9842", email: "mchang99@ext.net", score: 45, status: "PENDING", tags: ["PT", "TE"] },
  { id: "1003", name: "Elena Rodriguez", hhold: "Rod. E", class: "S1", phone: "(555) 883-1123", email: "elena.rod@ext.net", score: 98, status: "ACTIVE", tags: ["SV", "DN"] },
  { id: "1004", name: "David Kim", hhold: "Kim/Park", class: "O2", phone: "(555) 442-9981", email: "dkim_88@ext.net", score: 25, status: "IDLE", tags: ["LT"] },
  { id: "1005", name: "Marcus Johnson", hhold: "Johnson H.", class: "A2", phone: "(555) 773-4112", email: "marcusj@ext.net", score: 78, status: "ACTIVE", tags: ["YS", "LB"] },
  { id: "1006", name: "Amanda Smith", hhold: "Smith A.", class: "U2", phone: "(555) 231-5543", email: "asmith_law@ext.net", score: 55, status: "PENDING", tags: ["PT"] },
  { id: "1007", name: "Robert Taylor", hhold: "Taylor R.", class: "S1", phone: "(555) 902-1445", email: "robert.t@ext.net", score: 92, status: "ACTIVE", tags: ["DN", "EH"] },
];

export function Contacts() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<typeof DEMO_CONTACTS[0] | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === DEMO_CONTACTS.length) setSelectedIds([]);
    else setSelectedIds(DEMO_CONTACTS.map(c => c.id));
  };

  return (
    <div className="flex h-full w-full bg-[#050A1F] relative">
      {/* Main Table Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", selectedContact ? "w-2/3 border-r border-[#2979FF]/30 shadow-[10px_0_30px_rgba(0,0,0,0.8)] z-10" : "w-full")}>
        
        {/* Header Actions */}
        <div className="h-16 px-6 border-b border-[#2979FF]/20 flex items-center justify-between flex-shrink-0 bg-[#0F1440]/80 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-xl font-black text-[#F5F7FF] uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(41,121,255,0.8)] mr-2 flex items-center gap-2">
              <Crosshair size={20} className="text-[#00E5FF]" /> Target Matrix
            </h1>
            <div className="relative w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF] group-focus-within:text-[#00E5FF]" size={14} />
              <input 
                type="text" 
                placeholder="Query identifier..." 
                className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs font-bold uppercase tracking-wider rounded pl-9 pr-3 py-2 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all placeholder:text-[#6B72A0]"
              />
            </div>
            <button className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#00E5FF] border border-[#00E5FF]/40 rounded px-4 py-2 hover:bg-[#00E5FF]/10 transition-colors shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              <Filter size={14} /> Filter <span className="bg-[#00E5FF] text-[#050A1F] text-[10px] rounded px-1.5 py-0.5 ml-1 font-black">2</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#AAB2FF] hover:text-[#F5F7FF] hover:bg-[#2979FF]/20 px-4 py-2 rounded transition-colors">
              <Download size={14} /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-4 py-2 rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#00E5FF] hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] transition-all active:scale-95 border border-transparent">
              <Plus size={14} /> New Entity
            </button>
          </div>
        </div>

        {/* Selection Actions Bar (Sticky) */}
        {selectedIds.length > 0 && (
          <div className="h-12 bg-[#00E5FF]/10 border-b border-[#00E5FF]/40 px-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-[0_0_15px_rgba(0,229,255,0.2)] relative z-20">
            <div className="text-[11px] font-black uppercase tracking-widest text-[#00E5FF] drop-shadow-[0_0_5px_#00E5FF]">
              {selectedIds.length} ENTIT{selectedIds.length > 1 ? 'IES' : 'Y'} SELECTED
            </div>
            <div className="flex items-center gap-2">
              <button className="text-[10px] font-bold uppercase tracking-widest bg-[#050A1F] border border-[#00E5FF]/50 text-[#00E5FF] px-4 py-1.5 rounded hover:bg-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-1.5 transition-colors">
                <Tag size={12} /> Assign Tag
              </button>
              <button className="text-[10px] font-bold uppercase tracking-widest bg-[#00E5FF] text-[#050A1F] px-4 py-1.5 rounded hover:bg-white shadow-[0_0_15px_#00E5FF] flex items-center gap-1.5 transition-colors">
                <Zap size={12} /> Deploy Comm
              </button>
            </div>
          </div>
        )}

        {/* High Density Table */}
        <div className="flex-1 overflow-auto custom-scrollbar relative z-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0F1440] z-10 shadow-[0_1px_0_0_rgba(41,121,255,0.2)]">
              <tr>
                <th className="py-3 px-4 w-12 text-center border-b border-[#2979FF]/20">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === DEMO_CONTACTS.length}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-[#2979FF] bg-[#050A1F] text-[#00E5FF] focus:ring-[#00E5FF] focus:ring-offset-0 cursor-pointer shadow-[0_0_5px_#00E5FF]" 
                  />
                </th>
                {["ID/Name", "HH/Class", "Probability", "Comms", "Vector", ""].map((header, i) => (
                  <th key={i} className="py-3 px-4 text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] border-b border-[#2979FF]/20">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2979FF]/10 font-mono">
              {DEMO_CONTACTS.map((contact) => {
                const isSelected = selectedIds.includes(contact.id);
                const isViewed = selectedContact?.id === contact.id;
                
                return (
                  <tr 
                    key={contact.id} 
                    onClick={() => setSelectedContact(contact)}
                    className={cn(
                      "group transition-all cursor-pointer text-[12px] relative",
                      isSelected ? "bg-[#00E5FF]/10 shadow-[inset_0_0_15px_rgba(0,229,255,0.2)]" : 
                      isViewed ? "bg-[#2979FF]/20 border-l-2 border-[#00E5FF]" : "hover:bg-[#2979FF]/5"
                    )}
                  >
                    <td className="py-2.5 px-4 text-center relative z-10" onClick={(e) => e.stopPropagation()}>
                      {/* Hover Glow Edge */}
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00E5FF] opacity-0 group-hover:opacity-100 shadow-[0_0_10px_#00E5FF] transition-opacity"></div>

                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelect(contact.id)}
                        className="w-4 h-4 rounded border-[#2979FF] bg-[#050A1F] text-[#00E5FF] focus:ring-[#00E5FF] focus:ring-offset-0 cursor-pointer shadow-[0_0_5px_#00E5FF]" 
                      />
                    </td>
                    <td className="py-2.5 px-4 relative z-10">
                      <div className="font-bold text-[#F5F7FF] tracking-wide">{contact.name}</div>
                      <div className="text-[10px] text-[#6B72A0] uppercase tracking-widest mt-0.5">{contact.id}</div>
                    </td>
                    <td className="py-2.5 px-4 relative z-10">
                      <div className="flex items-center gap-2 text-[#AAB2FF] font-bold">
                        {contact.hhold}
                      </div>
                      <div className="text-[10px] mt-0.5 font-bold text-[#00E5FF] drop-shadow-[0_0_5px_#00E5FF]">{contact.class}</div>
                    </td>
                    <td className="py-2.5 px-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-[#050A1F] rounded-full overflow-hidden border border-[#2979FF]/30">
                          <div 
                            className={cn("h-full rounded-full shadow-[0_0_10px_currentColor]", contact.score >= 80 ? "bg-[#00C853]" : contact.score >= 40 ? "bg-[#FFD600]" : "bg-[#FF3B30]")} 
                            style={{ width: `${contact.score}%`, color: contact.score >= 80 ? "#00C853" : contact.score >= 40 ? "#FFD600" : "#FF3B30" }} 
                          />
                        </div>
                        <span className="text-[11px] font-black text-[#F5F7FF] w-8 text-right">{contact.score}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 relative z-10">
                      <div className="text-[#AAB2FF]">{contact.phone}</div>
                      <div className="text-[10px] text-[#6B72A0] truncate max-w-[140px] mt-0.5">{contact.email}</div>
                    </td>
                    <td className="py-2.5 px-4 relative z-10">
                      <div className="flex flex-wrap gap-1.5">
                        {contact.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#050A1F] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_5px_rgba(0,229,255,0.3)]">
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 2 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#050A1F] text-[#6B72A0] border border-[#2979FF]/30">
                            +{contact.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right relative z-10">
                      <button className="text-[#6B72A0] hover:text-[#00E5FF] transition-colors p-1 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_8px_#00E5FF]">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Contact Profile Panel */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div 
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: "33.333%", opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-[#0F1440]/95 backdrop-blur-xl overflow-y-auto border-l border-[#00E5FF]/30 custom-scrollbar shadow-[-20px_0_50px_rgba(0,229,255,0.1)] relative z-20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2979FF]/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="p-6 w-full min-w-[340px] relative z-10">
              
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{selectedContact.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-2 py-0.5 bg-[#00C853]/20 border border-[#00C853]/50 text-[#00C853] text-[10px] font-black uppercase tracking-widest rounded shadow-[0_0_10px_rgba(0,200,83,0.3)] animate-pulse">
                      {selectedContact.status}
                    </span>
                    <span className="text-xs font-mono text-[#AAB2FF]">{selectedContact.id}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-8 h-8 rounded bg-[#050A1F] border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF] hover:border-[#00E5FF] hover:text-[#00E5FF] hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#050A1F] border border-[#2979FF]/30 rounded hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 transition-all group shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  <Phone size={18} className="text-[#00E5FF] group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_#00E5FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5F7FF]">Comm</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#050A1F] border border-[#2979FF]/30 rounded hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 transition-all group shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  <Mail size={18} className="text-[#00E5FF] group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_#00E5FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5F7FF]">Route</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/40 rounded hover:bg-[#FF3B30] transition-all group shadow-[0_0_15px_rgba(255,59,48,0.2)] hover:shadow-[0_0_20px_rgba(255,59,48,0.6)]">
                  <Zap size={18} className="text-[#FF3B30] group-hover:text-white group-hover:scale-110 transition-colors drop-shadow-[0_0_8px_#FF3B30]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF3B30] group-hover:text-white transition-colors">Deploy</span>
                </button>
              </div>

              {/* Data Cards */}
              <div className="space-y-4">
                <div className="bg-[#050A1F]/80 rounded border border-[#2979FF]/30 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"></div>
                  <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-4">Telemetry</h3>
                  <div className="space-y-3 font-mono">
                    <div className="flex items-start gap-3">
                      <div className="text-[10px] text-[#AAB2FF] w-12 pt-0.5">NET</div>
                      <div className="text-[13px] font-bold text-[#F5F7FF]">{selectedContact.phone}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-[10px] text-[#AAB2FF] w-12 pt-0.5">DIR</div>
                      <div className="text-[13px] font-bold text-[#F5F7FF]">{selectedContact.email}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-[10px] text-[#AAB2FF] w-12 pt-0.5">LOC</div>
                      <div>
                        <div className="text-[13px] font-bold text-[#F5F7FF]">4412 Oakwood Dr. Apt 3B</div>
                        <div className="text-[11px] text-[#6B72A0] mt-1">CLASS: {selectedContact.class} | HH: {selectedContact.hhold}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#050A1F]/80 rounded border border-[#2979FF]/30 p-4">
                  <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-4">Vectors</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] hover:bg-[#00E5FF]/40 transition-colors cursor-pointer">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                    <button className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-[#050A1F] border border-dashed border-[#6B72A0] text-[#6B72A0] hover:text-[#00E5FF] hover:border-[#00E5FF] transition-all hover:shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-[#050A1F]/80 rounded border border-[#2979FF]/30 p-4 font-mono">
                  <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-5">Event Log</h3>
                  <div className="relative pl-5 border-l border-[#2979FF]/20 space-y-6">
                    
                    <div className="relative">
                      <div className="absolute -left-[24px] top-1 w-2.5 h-2.5 bg-[#00E5FF] rounded shadow-[0_0_10px_#00E5FF]" />
                      <p className="text-[10px] font-bold text-[#AAB2FF] mb-1 tracking-widest">T-14:30</p>
                      <p className="text-[12px] font-bold text-[#F5F7FF]">Sweep Complete</p>
                      <p className="text-[11px] text-[#6B72A0] mt-1 tracking-wide">ID positive. Vector applied.</p>
                      <div className="mt-2 text-[9px] font-black tracking-widest uppercase bg-[#2979FF]/20 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/30 inline-block drop-shadow-[0_0_5px_#00E5FF]">Agent: JAKE_44</div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute -left-[24px] top-1 w-2.5 h-2.5 bg-[#FFD600] rounded shadow-[0_0_10px_#FFD600]" />
                      <p className="text-[10px] font-bold text-[#AAB2FF] mb-1 tracking-widest">T-72:00</p>
                      <p className="text-[12px] font-bold text-[#F5F7FF]">Capital Injected ($50.00)</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
