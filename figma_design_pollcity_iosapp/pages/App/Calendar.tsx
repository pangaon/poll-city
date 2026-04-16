import React from "react";
import { Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";

export function Calendar() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3">
            <CalendarIcon className="text-[#00E5FF]" size={28} /> Timeline Control
          </h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">Orchestrate campaign events and field operations.</p>
        </div>
        <button className="bg-[#00E5FF] text-[#050A1F] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#F5F7FF] transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)]">
          Schedule Event
        </button>
      </header>

      <div className="flex-1 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00E5FF]/5 to-transparent pointer-events-none"></div>
        <div className="grid grid-cols-7 gap-4 h-full relative z-10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[#6B72A0] font-black uppercase tracking-widest text-xs mb-2">
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-[#050A1F]/80 border border-[#2979FF]/20 rounded p-2 hover:border-[#00E5FF]/50 transition-colors group relative cursor-pointer min-h-[100px]">
              <span className="text-[#AAB2FF] font-bold text-sm group-hover:text-[#00E5FF] transition-colors">{i % 31 + 1}</span>
              {i === 12 && (
                <div className="mt-2 bg-[#FF3B30]/20 border border-[#FF3B30]/50 rounded p-1 text-[10px] text-[#FF3B30] font-bold truncate shadow-[0_0_10px_rgba(255,59,48,0.2)]">
                  Debate Prep
                </div>
              )}
              {i === 15 && (
                <div className="mt-2 bg-[#00E5FF]/20 border border-[#00E5FF]/50 rounded p-1 text-[10px] text-[#00E5FF] font-bold truncate shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                  Rally @ 5PM
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}