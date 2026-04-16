"use client";
import React, { useState } from "react";
import { List, MapPin, Download, Phone, Send, Plus, CheckCircle, Clock, Home, User, ChevronRight, Search, Printer, Navigation, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STOPS = [
  { id: 1, address: "123 Maple St", household: "Jenkins Family", doors: 3, status: "complete" },
  { id: 2, address: "456 Oak Ave", household: "Chang Household", doors: 2, status: "pending" },
  { id: 3, address: "789 Pine Rd", household: "Rodriguez Home", doors: 1, status: "active" },
  { id: 4, address: "321 Elm Dr", household: "Kim/Park", doors: 4, status: "pending" },
  { id: 5, address: "654 Cedar Ln", household: "Johnson H.", doors: 2, status: "pending" },
];

const VOTERS = [
  { name: "Sarah Jenkins", age: 42, party: "Liberal", score: 85, vote: "yes" },
  { name: "Tom Jenkins", age: 45, party: "Liberal", score: 72, vote: "likely" },
  { name: "Maria Jenkins", age: 19, party: "Undecided", score: 45, vote: "unknown" },
];

export function WalkList() {
  const [activeStop, setActiveStop] = useState(3);
  const [activeVoter, setActiveVoter] = useState<typeof VOTERS[0] | null>(null);

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono overflow-hidden">
      {/* Column 1: Walk List Index */}
      <div className="w-[260px] border-r border-[#2979FF]/20 flex flex-col bg-[#0F1440]/80">
        <div className="h-14 px-4 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
          <span className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-widest flex items-center gap-2"><List size={14} className="text-[#00E5FF]" /> Walk Lists</span>
          <button className="text-[#00E5FF] hover:bg-[#00E5FF]/10 p-1 rounded border border-transparent hover:border-[#00E5FF]/40 transition-all"><Plus size={14} /></button>
        </div>
        <div className="p-3 border-b border-[#2979FF]/20">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2979FF]" size={12} /><input type="text" placeholder="Search..." className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#00E5FF] placeholder:text-[#6B72A0]" /></div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[{ id: 1, name: "Ward 4 - Canvass", stops: 47, complete: 23 }, { id: 2, name: "Ward 4 - Signs", stops: 18, complete: 11 }, { id: 3, name: "Ward 7 - GOTV", stops: 92, complete: 34 }].map((list) => (
            <div key={list.id} className="p-3 rounded border border-[#2979FF]/20 hover:border-[#00E5FF]/40 cursor-pointer transition-all bg-[#050A1F]">
              <div className="font-bold text-[#F5F7FF] text-xs mb-2">{list.name}</div>
              <div className="flex justify-between text-[10px] text-[#6B72A0] mb-2"><span>{list.stops} stops</span><span className="text-[#00C853]">{list.complete} done</span></div>
              <div className="h-1 bg-[#050A1F] rounded overflow-hidden border border-[#2979FF]/20"><div className="h-full bg-[#00E5FF]" style={{ width: `${(list.complete / list.stops) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Stop List */}
      <div className="w-[300px] border-r border-[#2979FF]/20 flex flex-col bg-[#050A1F]/50">
        <div className="h-14 px-4 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
          <span className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-[#00E5FF]" /> Stops (47)</span>
          <div className="flex gap-1">
            <button className="p-1.5 text-[#AAB2FF] hover:text-[#00E5FF] transition-colors"><Navigation size={14} /></button>
            <button className="p-1.5 text-[#AAB2FF] hover:text-[#00E5FF] transition-colors"><Printer size={14} /></button>
            <button className="p-1.5 text-[#AAB2FF] hover:text-[#00E5FF] transition-colors"><Download size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {STOPS.map((stop) => (
            <div key={stop.id} onClick={() => setActiveStop(stop.id)} className={cn("p-3 rounded border cursor-pointer transition-all relative overflow-hidden", activeStop === stop.id ? "bg-[#0F1440] border-[#00E5FF]/60 shadow-[0_0_15px_rgba(0,229,255,0.1)]" : "bg-[#050A1F] border-[#2979FF]/20 hover:border-[#2979FF]/60")}>
              {activeStop === stop.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />}
              <div className="flex items-start justify-between mb-1">
                <div className="text-xs font-bold text-[#F5F7FF]">{stop.address}</div>
                <span className={cn("text-[9px] font-black uppercase px-1 py-0.5 rounded", stop.status === "complete" ? "text-[#00C853] bg-[#00C853]/10" : stop.status === "active" ? "text-[#00E5FF] bg-[#00E5FF]/10" : "text-[#AAB2FF] bg-[#2979FF]/10")}>{stop.status}</span>
              </div>
              <div className="text-[10px] text-[#AAB2FF]">{stop.household}</div>
              <div className="text-[10px] text-[#6B72A0] mt-1 flex items-center gap-1"><Home size={10} />{stop.doors} {stop.doors === 1 ? "voter" : "voters"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Interaction Logger */}
      <div className="flex-1 flex flex-col bg-[#0B0B15]">
        <div className="h-14 px-6 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
          <span className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-widest">Log Interaction</span>
          <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all"><Send size={12} /> Submit</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="text-xs font-black text-[#AAB2FF] uppercase tracking-widest mb-2 flex items-center gap-2"><Home size={12} className="text-[#00E5FF]" /> Active Stop</div>
            <div className="bg-[#0F1440]/60 border border-[#00E5FF]/30 rounded-lg p-4 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <div className="font-black text-[#F5F7FF] mb-1">789 Pine Rd</div>
              <div className="text-[11px] text-[#AAB2FF]">Rodriguez Home — 1 voter</div>
            </div>
          </div>
          <div className="space-y-3">
            {VOTERS.map((voter, i) => (
              <div key={i} onClick={() => setActiveVoter(voter)} className={cn("p-4 rounded border cursor-pointer transition-all", activeVoter?.name === voter.name ? "bg-[#2979FF]/20 border-[#00E5FF]/50" : "bg-[#0F1440]/40 border-[#2979FF]/20 hover:border-[#2979FF]/60")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#00E5FF]"><User size={14} /></div>
                    <div><div className="font-bold text-[#F5F7FF] text-sm">{voter.name}</div><div className="text-[10px] text-[#AAB2FF]">Age {voter.age} · {voter.party}</div></div>
                  </div>
                  <div className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded border", voter.vote === "yes" ? "text-[#00C853] border-[#00C853]/40 bg-[#00C853]/10" : voter.vote === "likely" ? "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10" : "text-[#AAB2FF] border-[#AAB2FF]/20")}>{voter.vote}</div>
                </div>
                {activeVoter?.name === voter.name && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["Support", "Oppose", "Undecided", "Not Home", "Refused", "Moved"].map((opt) => (
                      <button key={opt} className="py-1.5 text-[10px] font-bold text-[#AAB2FF] border border-[#2979FF]/30 rounded hover:border-[#00E5FF]/50 hover:text-[#00E5FF] transition-all uppercase tracking-widest">{opt}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
