import React, { useState } from "react";
import { MessageSquare, Send, Search, Filter, Phone, Mail, Clock, ShieldAlert, CheckCircle, MoreVertical, Zap } from "lucide-react";
import { cn } from "../../utils/cn";

export function Communications() {
  const [activeTab, setActiveTab] = useState("broadcast");

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono">
      
      {/* Left Sidebar - Comms Navigation */}
      <div className="w-[280px] border-r border-[#2979FF]/20 bg-[#0F1440]/90 backdrop-blur-xl flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(41,121,255,0.8)]">
            <MessageSquare size={16} className="text-[#00E5FF]" /> Comms Grid
          </h1>
        </div>

        <div className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("broadcast")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest transition-all border",
              activeTab === "broadcast" ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40 shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]" : "border-transparent text-[#AAB2FF] hover:bg-[#2979FF]/10"
            )}
          >
            <span className="flex items-center gap-2"><Send size={14} /> Broadcast Deploy</span>
          </button>
          <button 
            onClick={() => setActiveTab("inbox")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest transition-all border",
              activeTab === "inbox" ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40 shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]" : "border-transparent text-[#AAB2FF] hover:bg-[#2979FF]/10"
            )}
          >
            <span className="flex items-center gap-2"><MessageSquare size={14} /> Triage Inbox</span>
            <span className="bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-[3px] text-[9px] shadow-[0_0_8px_#FF3B30] animate-pulse">42</span>
          </button>
          <button 
            onClick={() => setActiveTab("auto")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded text-[11px] font-bold uppercase tracking-widest transition-all border",
              activeTab === "auto" ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40 shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]" : "border-transparent text-[#AAB2FF] hover:bg-[#2979FF]/10"
            )}
          >
            <span className="flex items-center gap-2"><Clock size={14} /> Auto-Triggers</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-[#2979FF]/20">
          <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-4">Active Sequences</h3>
          {[
            { name: "GotV Push - Dist 4", stat: "42%", status: "LIVE", color: "#00C853" },
            { name: "Fundraising Q3", stat: "14%", status: "LIVE", color: "#00C853" },
            { name: "Persuasion: Prop B", stat: "--", status: "PEND", color: "#FFD600" },
            { name: "Volunteer Recall", stat: "100%", status: "DONE", color: "#6B72A0" }
          ].map((seq, i) => (
            <div key={i} className="mb-3 flex items-start justify-between cursor-pointer group">
              <div>
                <div className="text-[11px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">{seq.name}</div>
                <div className="text-[9px] text-[#AAB2FF] mt-0.5 tracking-widest">Progress: {seq.stat}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: seq.color, boxShadow: `0 0 5px ${seq.color}` }}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050A1F]">
        
        {/* CRT Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(41,121,255,0.05)_50%)] bg-[length:100%_4px] z-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] z-10"></div>

        {activeTab === "broadcast" && (
          <div className="flex-1 flex flex-col p-6 relative z-20 custom-scrollbar overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(41,121,255,0.8)] flex items-center gap-3">
                New Deployment <span className="bg-[#2979FF]/20 text-[#2979FF] border border-[#2979FF]/40 text-[10px] px-2 py-0.5 rounded tracking-widest">DRAFT</span>
              </h2>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-[#2979FF]/40 rounded text-[11px] font-bold uppercase tracking-widest text-[#AAB2FF] hover:bg-[#2979FF]/10 transition-colors">Test Send</button>
                <button className="px-6 py-2 bg-[#FF3B30] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-red-500 shadow-[0_0_20px_rgba(255,59,48,0.4)] transition-all flex items-center gap-2">
                  <Zap size={14} /> ARM PAYLOAD
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 h-full min-h-0">
              
              <div className="col-span-2 flex flex-col gap-6">
                <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[#2979FF]/20 pb-3">
                    <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em]">Target Vector</h3>
                    <button className="text-[10px] text-[#00E5FF] hover:underline tracking-widest">View Matrix</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase text-[#6B72A0] w-16">Segment</span>
                    <select className="bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs p-2 rounded flex-1 outline-none focus:border-[#00E5FF]">
                      <option>High-Propensity Democrats (Score &gt; 80)</option>
                      <option>Undecided Independents (Score 40-60)</option>
                      <option>Recent Event Attendees</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase text-[#6B72A0] w-16">Exclusion</span>
                    <div className="flex-1 flex gap-2">
                      <span className="bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] text-[10px] px-2 py-1 rounded">Already Voted</span>
                      <span className="bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] text-[10px] px-2 py-1 rounded">Hard Oppose</span>
                    </div>
                  </div>
                  <div className="bg-[#2979FF]/10 p-3 rounded border border-[#2979FF]/20 flex justify-between items-center mt-2">
                    <span className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest">Calculated Reach</span>
                    <span className="text-xl font-black text-[#00E5FF] drop-shadow-[0_0_8px_#00E5FF]">14,204</span>
                  </div>
                </div>

                <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded flex-1 flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <div className="flex border-b border-[#2979FF]/20">
                    <button className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-[#00E5FF] border-b-2 border-[#00E5FF] bg-[#00E5FF]/5 flex items-center justify-center gap-2">
                      <Phone size={14} /> SMS Text
                    </button>
                    <button className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-[#6B72A0] hover:text-[#AAB2FF] border-b-2 border-transparent hover:bg-[#2979FF]/5 flex items-center justify-center gap-2">
                      <Mail size={14} /> Email
                    </button>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <textarea 
                      className="w-full flex-1 bg-[#050A1F] border border-[#2979FF]/40 rounded p-4 text-[#F5F7FF] text-sm resize-none focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all font-sans"
                      placeholder="Enter payload content..."
                      defaultValue="Hi {first_name}, this is Jane from the Mayor's campaign. Polling shows District {district} is neck-and-neck. Can we count on your support this Tuesday? Reply YES or NO. Stop2Quit"
                    />
                    <div className="flex justify-between items-center text-[10px] text-[#6B72A0]">
                      <div className="flex gap-2">
                        <button className="hover:text-[#00E5FF] border border-[#2979FF]/30 px-2 py-1 rounded bg-[#050A1F]">+{'{first_name}'}</button>
                        <button className="hover:text-[#00E5FF] border border-[#2979FF]/30 px-2 py-1 rounded bg-[#050A1F]">+{'{polling_loc}'}</button>
                        <button className="hover:text-[#00E5FF] border border-[#2979FF]/30 px-2 py-1 rounded bg-[#050A1F]"><Zap size={10} className="inline mr-1"/> AI Optimize</button>
                      </div>
                      <span>154 / 160 chars (1 segment)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel: Live Preview & Compliance */}
              <div className="col-span-1 flex flex-col gap-6">
                <div className="bg-[#050A1F] border border-[#2979FF]/40 rounded p-4 relative shadow-[0_0_20px_rgba(0,0,0,0.8)] h-[400px] flex flex-col items-center justify-center">
                  <div className="absolute top-3 left-4 text-[9px] font-black text-[#6B72A0] uppercase tracking-[0.2em]">Device Sim</div>
                  
                  {/* Fake Phone UI */}
                  <div className="w-[220px] h-[320px] border-2 border-[#141419] rounded-2xl p-2 bg-[#0B0B0F] relative shadow-lg">
                    <div className="w-full h-full bg-[#141419] rounded-xl overflow-hidden flex flex-col font-sans">
                      <div className="bg-[#0B0B0F] p-2 text-center text-[10px] font-bold border-b border-[#FFFFFF]/10 text-white">888-555-0199</div>
                      <div className="flex-1 p-3 bg-[#0B0B0F] flex flex-col justify-end">
                        <div className="bg-[#2979FF] text-white p-2.5 rounded-2xl rounded-bl-sm text-[11px] shadow-sm ml-auto max-w-[85%] self-end">
                          Hi Michael, this is Jane from the Mayor's campaign. Polling shows District 4 is neck-and-neck. Can we count on your support this Tuesday? Reply YES or NO. Stop2Quit
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0F1440]/60 border border-[#00C853]/40 rounded p-4 shadow-[0_0_20px_rgba(0,200,83,0.1)]">
                  <h3 className="text-[11px] font-black text-[#00C853] uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <CheckCircle size={14} /> System Checks Passed
                  </h3>
                  <div className="space-y-2 text-[10px] text-[#AAB2FF]">
                    <div className="flex justify-between border-b border-[#2979FF]/20 pb-1">
                      <span>TCPA Compliance</span>
                      <span className="text-[#00C853]">VERIFIED</span>
                    </div>
                    <div className="flex justify-between border-b border-[#2979FF]/20 pb-1">
                      <span>Carrier Route Check</span>
                      <span className="text-[#00C853]">OPTIMAL</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Cost Est.</span>
                      <span className="text-[#F5F7FF] font-bold">$142.04</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
