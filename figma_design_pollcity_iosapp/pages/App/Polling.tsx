import React, { useState } from "react";
import { BarChart2, Plus, Zap, Image as ImageIcon, Send, ArrowUpRight, Copy, Share2, Layers, Target } from "lucide-react";
import { cn } from "../../utils/cn";

export function Polling() {
  const [question, setQuestion] = useState("Should we reallocate 15% of the transportation budget to expand the Riverfront Park?");
  const [background, setBackground] = useState("cyan");
  
  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono">
      
      {/* Left Sidebar - Poll Management */}
      <div className="w-[320px] border-r border-[#2979FF]/20 bg-[#0F1440]/90 backdrop-blur-xl flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(41,121,255,0.8)]">
            <BarChart2 size={16} className="text-[#00E5FF]" /> Signal Polling
          </h1>
          <button className="bg-[#2979FF] p-1.5 rounded text-white shadow-[0_0_10px_rgba(41,121,255,0.5)] hover:bg-[#00E5FF] hover:shadow-[0_0_15px_#00E5FF] transition-all">
            <Plus size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-[#2979FF]/20 flex items-center gap-3 bg-[#050A1F]">
          <div className="flex-1 bg-[#0F1440] border border-[#2979FF]/40 rounded p-3 flex flex-col gap-1 items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
            <span className="text-[20px] font-black text-[#00E5FF] drop-shadow-[0_0_8px_#00E5FF]">3</span>
            <span className="text-[8px] font-bold text-[#AAB2FF] uppercase tracking-widest">Active Vectors</span>
          </div>
          <div className="flex-1 bg-[#0F1440] border border-[#2979FF]/40 rounded p-3 flex flex-col gap-1 items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
            <span className="text-[20px] font-black text-[#F5F7FF] drop-shadow-md">8,421</span>
            <span className="text-[8px] font-bold text-[#AAB2FF] uppercase tracking-widest">Data Points</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar space-y-3 bg-[#050A1F]/30">
          <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-2 mt-1">Live Instruments</h3>
          
          <div className="p-3 bg-[#00E5FF]/10 border-l-2 border-[#00E5FF] border border-[#00E5FF]/30 rounded shadow-[0_0_15px_rgba(0,229,255,0.1)] cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#00E5FF] text-[#050A1F] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_#00E5FF]"><Zap size={8} /> LIVE</span>
              <span className="text-[9px] text-[#AAB2FF]">T+14h</span>
            </div>
            <div className="text-[11px] font-bold text-[#F5F7FF] leading-snug line-clamp-2">Riverfront Park Budget Reallocation</div>
            <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-[#AAB2FF]">
              <span className="flex items-center gap-1 text-[#00C853]"><ArrowUpRight size={10}/> 64% Agree</span>
              <span className="flex items-center gap-1">2.3k Votes</span>
            </div>
          </div>

          <div className="p-3 bg-[#0F1440] border border-[#2979FF]/20 rounded hover:border-[#2979FF]/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD600] border border-[#FFD600]/40 px-1.5 py-0.5 rounded bg-[#FFD600]/10">PENDING</span>
            </div>
            <div className="text-[11px] font-bold text-[#F5F7FF] leading-snug line-clamp-2 group-hover:text-[#00E5FF] transition-colors">School Board AI Literacy Mandate</div>
          </div>
          
          <div className="p-3 bg-[#0F1440] border border-[#2979FF]/20 rounded opacity-50 cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6B72A0] border border-[#6B72A0]/40 px-1.5 py-0.5 rounded bg-[#050A1F]">CLOSED</span>
            </div>
            <div className="text-[11px] font-bold text-[#F5F7FF] leading-snug line-clamp-2">Tax Incentives for Clean Energy</div>
          </div>
        </div>
      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050A1F]">
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-20">
          
          <div className="flex justify-between items-center mb-8 border-b border-[#2979FF]/20 pb-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(41,121,255,0.8)]">
              Instrument Builder
            </h2>
            <button className="px-6 py-2.5 bg-[#00E5FF] text-[#050A1F] rounded text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,229,255,0.5)] hover:shadow-[0_0_30px_rgba(0,229,255,0.8)] transition-all flex items-center gap-2 active:scale-95">
              <Send size={14} /> DEPLOY TO SOCIAL
            </button>
          </div>

          <div className="grid grid-cols-5 gap-8">
            
            {/* Editor Panel */}
            <div className="col-span-3 space-y-6">
              
              <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded-lg p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Layers size={14} /> Query Payload
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest mb-2">Primary Question</label>
                    <textarea 
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full bg-[#050A1F] border border-[#2979FF]/40 rounded p-4 text-[#F5F7FF] text-xl font-black resize-none focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all font-sans leading-tight h-32"
                      placeholder="Enter question text..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest mb-2">Background Overlay</label>
                      <div className="flex gap-3">
                        <button onClick={() => setBackground("cyan")} className={cn("w-10 h-10 rounded bg-gradient-to-br from-[#00E5FF] to-[#2979FF] border-2", background === "cyan" ? "border-white shadow-[0_0_15px_#00E5FF]" : "border-transparent")}></button>
                        <button onClick={() => setBackground("red")} className={cn("w-10 h-10 rounded bg-gradient-to-br from-[#FFD600] to-[#FF3B30] border-2", background === "red" ? "border-white shadow-[0_0_15px_#FF3B30]" : "border-transparent")}></button>
                        <button onClick={() => setBackground("purple")} className={cn("w-10 h-10 rounded bg-gradient-to-br from-[#FF3B30] to-[#800080] border-2", background === "purple" ? "border-white shadow-[0_0_15px_#800080]" : "border-transparent")}></button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest mb-2">Media Asset</label>
                      <button className="w-full flex items-center justify-center gap-2 h-10 bg-[#050A1F] border border-[#2979FF]/40 border-dashed rounded text-[#AAB2FF] hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors text-[11px] font-bold uppercase tracking-widest">
                        <ImageIcon size={14} /> Upload Vector
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest mb-2">Algorithm Tags</label>
                    <input 
                      type="text" 
                      defaultValue="Local, Environment" 
                      className="w-full bg-[#050A1F] border border-[#2979FF]/40 rounded p-3 text-[#F5F7FF] text-[12px] font-mono focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded-lg p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Target size={14} /> Distribution Protocol
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#050A1F] border border-[#2979FF]/20 rounded">
                    <div>
                      <div className="text-[12px] font-bold text-[#F5F7FF]">Poll City Social Feed</div>
                      <div className="text-[10px] text-[#6B72A0]">Push directly to the public mobile app feed.</div>
                    </div>
                    <div className="w-10 h-5 bg-[#00E5FF] rounded-full relative shadow-[0_0_10px_#00E5FF]">
                      <div className="absolute right-1 top-1 bg-[#050A1F] w-3 h-3 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#050A1F] border border-[#2979FF]/20 rounded">
                    <div>
                      <div className="text-[12px] font-bold text-[#F5F7FF]">SMS Blast Link</div>
                      <div className="text-[10px] text-[#6B72A0]">Generate shortlink for Comms Grid deployment.</div>
                    </div>
                    <div className="w-10 h-5 bg-[#2979FF]/20 rounded-full border border-[#2979FF]/40 relative">
                      <div className="absolute left-1 top-1 bg-[#6B72A0] w-3 h-3 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="col-span-2 flex flex-col items-center justify-start border-l border-[#2979FF]/20 pl-8 relative">
              <div className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 drop-shadow-[0_0_5px_#00E5FF]">
                <Zap size={14} /> Social Feed Sim
              </div>
              
              {/* Mobile Device Frame */}
              <div className="w-[300px] h-[600px] border-[4px] border-[#141419] rounded-[36px] bg-[#0B0B0F] relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden font-sans">
                
                {/* Content Area */}
                <div className={cn(
                  "absolute inset-0 m-3 rounded-[28px] overflow-hidden flex flex-col p-5 text-white justify-between transition-colors duration-500",
                  background === "cyan" ? "bg-gradient-to-br from-[#00E5FF] to-[#2979FF]" : 
                  background === "red" ? "bg-gradient-to-br from-[#FFD600] to-[#FF3B30]" : 
                  "bg-gradient-to-br from-[#FF3B30] to-[#800080]"
                )}>
                  {/* Gradients */}
                  <div className="absolute inset-0 bg-[#0B0B0F]/40 mix-blend-multiply pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent pointer-events-none"></div>

                  <div className="relative z-10 flex items-center gap-2 bg-[#0B0B0F]/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 self-start">
                    <div className="w-6 h-6 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">M</div>
                    <div className="text-[10px] font-bold">@mayorchen</div>
                  </div>

                  <div className="relative z-10 mb-8">
                    <div className="flex gap-1.5 mb-3">
                      <span className="text-[8px] font-black uppercase tracking-wider bg-white/10 px-2 py-1 rounded border border-white/20">Local</span>
                      <span className="text-[8px] font-black uppercase tracking-wider bg-white/10 px-2 py-1 rounded border border-white/20">Environment</span>
                    </div>
                    <h2 className="text-[22px] font-black leading-tight tracking-tight drop-shadow-md">
                      {question || "Enter your question text to preview..."}
                    </h2>
                  </div>

                  {/* Swipe Hints Overlay */}
                  <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-end pr-2 pointer-events-none mix-blend-overlay opacity-30">
                    <div className="text-[20px] font-black italic text-[#00E676] transform rotate-[-90deg]">AGREE</div>
                  </div>
                  <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-start pl-2 pointer-events-none mix-blend-overlay opacity-30">
                    <div className="text-[20px] font-black italic text-[#FF3B30] transform rotate-[-90deg]">OPPOSE</div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
