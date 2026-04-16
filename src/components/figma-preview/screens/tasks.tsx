"use client";
import React from "react";
import { CheckSquare, Zap } from "lucide-react";

export function Tasks() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3"><CheckSquare className="text-[#00E5FF]" size={28} /> Action Items</h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">High-velocity task assignment and completion tracking.</p>
        </div>
        <button className="bg-[#FF3B30] text-[#F5F7FF] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#FFD600] hover:text-[#050A1F] transition-all shadow-[0_0_20px_rgba(255,59,48,0.4)]">Deploy Task</button>
      </header>
      <div className="flex gap-6 flex-1 overflow-x-auto pb-4">
        {["Backlog", "Active Deployment", "Review", "Completed"].map(status => (
          <div key={status} className="w-[280px] flex-shrink-0 flex flex-col gap-4">
            <h3 className="font-black text-[#AAB2FF] uppercase tracking-[0.2em] text-xs pb-3 border-b border-[#2979FF]/30">{status}</h3>
            <div className="flex-1 bg-[#0F1440]/60 backdrop-blur-xl rounded-xl border border-[#2979FF]/20 p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#050A1F] p-4 rounded border border-[#2979FF]/40 hover:border-[#00E5FF]/60 transition-all cursor-pointer group shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-widest bg-[#00E5FF]/10 px-2 py-0.5 rounded">TKT-00{i}</span>
                    <Zap size={14} className="text-[#FFD600]" />
                  </div>
                  <h4 className="text-sm font-black text-[#F5F7FF] mb-3 group-hover:text-[#00E5FF] transition-colors">{["Call Key Donors", "Prepare GOTV Script", "Review Mailer Copy"][i - 1]}</h4>
                  <div className="w-full bg-[#0F1440] h-1.5 rounded-full overflow-hidden"><div className="bg-[#00E5FF] h-full shadow-[0_0_10px_#00E5FF]" style={{ width: `${[50, 80, 30][i - 1]}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
