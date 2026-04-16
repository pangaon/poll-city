"use client";
import React, { useState } from "react";
import { BarChart2, Plus, Zap, Send, Copy, Share2, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKGROUNDS = [
  { id: "cyan", gradient: "from-[#00E5FF] to-[#2979FF]", name: "Cyber Blue" },
  { id: "fire", gradient: "from-[#FFD600] to-[#FF3B30]", name: "Fire" },
  { id: "purple", gradient: "from-[#2979FF] to-[#800080]", name: "Deep Purple" },
  { id: "green", gradient: "from-[#00E676] to-[#00C853]", name: "Electric Green" },
];

export function Polling() {
  const [question, setQuestion] = useState("Should we reallocate 15% of the transportation budget to expand the Riverfront Park?");
  const [background, setBackground] = useState("cyan");
  const bg = BACKGROUNDS.find(b => b.id === background)!;

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono">
      {/* Left: Poll Builder */}
      <div className="w-[400px] bg-[#0F1440]/90 backdrop-blur-xl border-r border-[#2979FF]/30 flex flex-col">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black text-[#F5F7FF] uppercase tracking-[0.2em] flex items-center gap-2"><Target size={16} className="text-[#00E5FF]" /> Signal Constructor</h1>
          <button className="flex items-center gap-1.5 bg-[#2979FF] text-white px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#00E5FF] transition-all"><Plus size={12} /> New Poll</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Question */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-2 block">Poll Question</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-sm rounded-lg p-3 focus:outline-none focus:border-[#00E5FF] transition-all resize-none h-24 placeholder:text-[#6B72A0]" />
          </div>

          {/* Theme Selector */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-3 block">Visual Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((b) => (
                <button key={b.id} onClick={() => setBackground(b.id)} className={cn("aspect-[3/2] rounded-lg border-2 transition-all overflow-hidden relative", background === b.id ? "border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.4)]" : "border-[#2979FF]/30 hover:border-[#2979FF]/60")}>
                  <div className={cn("w-full h-full bg-gradient-to-br", b.gradient)} />
                  {background === b.id && <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 rounded-full bg-[#00E5FF] flex items-center justify-center shadow-[0_0_15px_#00E5FF]"><Zap size={12} className="text-[#050A1F] fill-[#050A1F]" /></div></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Active Polls Table */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-3 block flex items-center gap-2"><Layers size={10} /> Active Signals</label>
            <div className="space-y-2">
              {[{ q: "Riverfront Park expansion?", votes: "2.3K", trend: "+12.4%" }, { q: "Clean energy tax incentives?", votes: "7.3K", trend: "-4.2%" }, { q: "AI literacy in schools?", votes: "2.9K", trend: "+89.1%" }].map((poll, i) => (
                <div key={i} className="bg-[#050A1F] p-3 rounded border border-[#2979FF]/20 hover:border-[#00E5FF]/40 transition-all cursor-pointer">
                  <div className="font-bold text-[#F5F7FF] text-xs mb-2 line-clamp-1">{poll.q}</div>
                  <div className="flex justify-between text-[10px] font-mono"><span className="text-[#AAB2FF]">{poll.votes} votes</span><span className={poll.trend.startsWith("+") ? "text-[#00C853]" : "text-[#FF3B30]"}>{poll.trend}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#2979FF]/20 bg-[#050A1F]/80">
          <button className="w-full py-3 bg-[#00E5FF] text-[#050A1F] rounded font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2"><Send size={16} /> Deploy Signal</button>
        </div>
      </div>

      {/* Right: Phone Preview */}
      <div className="flex-1 flex items-center justify-center bg-[#050A1F] p-8">
        <div className="relative">
          <div className="text-[10px] font-black text-[#6B72A0] uppercase tracking-widest mb-4 text-center flex items-center justify-center gap-2"><BarChart2 size={12} className="text-[#00E5FF]" /> Live Preview</div>
          {/* Phone Frame */}
          <div className="w-[280px] h-[520px] bg-[#0B0B0F] rounded-[44px] border-[3px] border-[#1a1a22] shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(41,121,255,0.15)] overflow-hidden flex flex-col">
            <div className="h-8 bg-black flex items-center justify-center"><div className="w-[80px] h-[24px] bg-black rounded-b-[16px] border-b border-x border-[#1a1a22]" /></div>
            <div className={cn("flex-1 bg-gradient-to-br relative overflow-hidden", bg.gradient)}>
              <div className="absolute inset-0 bg-[#0B0B0F]/40" />
              <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#0B0B0F] to-transparent" />
              <div className="absolute bottom-16 left-0 right-0 px-6 z-10">
                <div className="flex gap-2 mb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded border border-white/20">Local</span>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-1 rounded border border-[#00E5FF]/40">HOT</span>
                </div>
                <p className="text-white font-black text-xl leading-tight tracking-tight">{question || "Your question here..."}</p>
              </div>
            </div>
            <div className="h-16 bg-[#0B0B0F] flex items-center justify-center gap-6 border-t border-[#1a1a22]">
              <button className="flex-1 mx-3 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#2979FF] text-[#050A1F] text-xs font-black uppercase tracking-widest">AGREE</button>
              <button className="flex-1 mx-3 py-2 rounded-xl bg-gradient-to-r from-[#FF3B30] to-[#D50000] text-white text-xs font-black uppercase tracking-widest">OPPOSE</button>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#AAB2FF] hover:text-[#00E5FF] transition-colors"><Copy size={12} /> Copy Link</button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#AAB2FF] hover:text-[#00E5FF] transition-colors"><Share2 size={12} /> Share</button>
          </div>
        </div>
      </div>
    </div>
  );
}
