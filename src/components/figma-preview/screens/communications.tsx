"use client";
import React, { useState } from "react";
import { MessageSquare, Send, Search, Filter, Phone, Mail, Clock, ShieldAlert, CheckCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Communications() {
  const [activeTab, setActiveTab] = useState("broadcast");

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono">
      {/* Left Panel */}
      <div className="w-[320px] bg-[#0F1440]/90 backdrop-blur-xl border-r border-[#2979FF]/30 flex flex-col">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black text-[#F5F7FF] uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={16} className="text-[#00E5FF]" /> Comms Grid</h1>
        </div>
        <div className="p-3 border-b border-[#2979FF]/20">
          <div className="flex gap-1">
            {["broadcast", "inbox", "auto"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "text-[#AAB2FF] border border-transparent hover:border-[#2979FF]/30")}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="p-3 border-b border-[#2979FF]/20">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2979FF]" size={12} /><input type="text" placeholder="Search..." className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#00E5FF] placeholder:text-[#6B72A0]" /></div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[{ name: "All Supporters", count: "12.4K", type: "sms", status: "sent" }, { name: "Top Donors", count: "234", type: "email", status: "draft" }, { name: "Volunteers", count: "89", type: "robocall", status: "scheduled" }, { name: "District 4", count: "3.2K", type: "sms", status: "sent" }, { name: "Persuadables", count: "1.8K", type: "email", status: "sent" }].map((item, i) => (
            <div key={i} className="p-3 rounded border border-[#2979FF]/20 hover:border-[#00E5FF]/40 cursor-pointer transition-all bg-[#050A1F] group">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-[#F5F7FF] text-xs group-hover:text-[#00E5FF] transition-colors">{item.name}</div>
                <span className={cn("text-[9px] font-black uppercase px-1 py-0.5 rounded", item.status === "sent" ? "text-[#00C853] bg-[#00C853]/10" : item.status === "scheduled" ? "text-[#00E5FF] bg-[#00E5FF]/10" : "text-[#FFD600] bg-[#FFD600]/10")}>{item.status}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#6B72A0]"><span>{item.count} recipients</span><span className="uppercase">{item.type}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-[#0B0B15]">
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 2px, rgba(0,229,255,0.03) 2px, rgba(0,229,255,0.03) 4px)" }} />

        <div className="h-14 px-6 border-b border-[#2979FF]/20 flex items-center justify-between bg-[#050A1F]/50 relative z-10">
          <h2 className="font-black text-[#F5F7FF] uppercase tracking-tighter">New Broadcast</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#AAB2FF] border border-[#2979FF]/30 rounded px-3 py-1.5 hover:text-[#F5F7FF] hover:border-[#2979FF]/60 transition-all uppercase tracking-widest"><Clock size={12} /> Schedule</button>
            <button className="flex items-center gap-1.5 bg-[#00E5FF] text-[#050A1F] px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)]"><Zap size={12} /> Deploy Now</button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto relative z-10 space-y-5">
          {/* Recipient Select */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-2 block">Target Audience</label>
            <div className="flex gap-2 flex-wrap">
              {["All Supporters", "District 4", "Volunteers", "Donors"].map((seg, i) => (
                <button key={i} className={cn("px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest border transition-all", i === 0 ? "bg-[#2979FF]/20 text-[#00E5FF] border-[#00E5FF]/40" : "text-[#AAB2FF] border-[#2979FF]/30 hover:border-[#2979FF]/60")}>{seg}</button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-2 block">Channel</label>
            <div className="flex gap-3">
              {[{ icon: Phone, label: "SMS", active: true }, { icon: Mail, label: "Email", active: false }, { icon: MessageSquare, label: "Robocall", active: false }].map((ch, i) => (
                <button key={i} className={cn("flex items-center gap-2 px-4 py-2 rounded border text-[11px] font-bold uppercase tracking-widest transition-all", ch.active ? "bg-[#2979FF]/20 text-[#00E5FF] border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]" : "text-[#AAB2FF] border-[#2979FF]/30 hover:border-[#2979FF]/60")}><ch.icon size={14} />{ch.label}</button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-2 block">Message Content</label>
            <textarea defaultValue="Hi [FIRST_NAME], this is the Chen for Mayor campaign. Election Day is Oct 27 — polls are open 10am–8pm. Can we count on your vote? Reply STOP to opt out." className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-sm font-sans rounded-lg p-4 focus:outline-none focus:border-[#00E5FF] transition-all resize-none h-32 placeholder:text-[#6B72A0]" />
            <div className="flex justify-between mt-2 text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest"><span>160 chars</span><span className="text-[#00C853]">12,400 recipients · Est. cost: $0.62</span></div>
          </div>

          {/* Recent Broadcasts */}
          <div>
            <label className="text-[10px] font-black text-[#AAB2FF] uppercase tracking-widest mb-3 block">Recent Transmissions</label>
            <div className="space-y-2">
              {[{ msg: "GOTV reminder sent to all supporters", time: "2h ago", opens: "68%", status: "delivered" }, { msg: "Volunteer shift reminder — Sat morning", time: "1d ago", opens: "82%", status: "delivered" }, { msg: "Debate watch party invitation", time: "3d ago", opens: "45%", status: "partial" }].map((broadcast, i) => (
                <div key={i} className="bg-[#050A1F] p-4 rounded border border-[#2979FF]/20 flex items-start justify-between hover:border-[#2979FF]/60 transition-all">
                  <div className="flex-1">
                    <div className="font-bold text-[#F5F7FF] text-xs mb-1">{broadcast.msg}</div>
                    <div className="flex gap-4 text-[10px] text-[#6B72A0]"><span>{broadcast.time}</span><span className="text-[#00C853]">{broadcast.opens} open rate</span></div>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[#00C853]"><CheckCircle size={10} />{broadcast.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
