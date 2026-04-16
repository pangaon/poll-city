"use client";
import React from "react";
import { Printer, Layers } from "lucide-react";

export function Print() {
  const items = [
    { id: 1, district: 3, qty: "42k", pct: 65 },
    { id: 2, district: 7, qty: "28k", pct: 38 },
    { id: 3, district: 11, qty: "55k", pct: 82 },
    { id: 4, district: 2, qty: "19k", pct: 21 },
  ];
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3"><Printer className="text-[#00E5FF]" size={28} /> Logistics Queue</h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">Direct mail routing and large scale collateral production.</p>
        </div>
        <button className="bg-[#00E5FF] text-[#050A1F] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#F5F7FF] transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)]">Queue Order</button>
      </header>
      <div className="flex-1 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="p-6 border-b border-[#2979FF]/20 flex justify-between items-center bg-[#050A1F]/50">
          <h3 className="text-[#AAB2FF] font-black uppercase tracking-[0.2em] text-[10px]">Active Print Nodes</h3>
          <div className="flex gap-2">
            <span className="bg-[#00C853]/20 text-[#00C853] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(0,200,83,0.3)]">Node Alpha Online</span>
            <span className="bg-[#00C853]/20 text-[#00C853] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(0,200,83,0.3)]">Node Beta Online</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-[#050A1F] p-5 rounded border border-[#2979FF]/20 hover:border-[#00E5FF]/50 transition-all group flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-[#2979FF]/10 rounded flex items-center justify-center border border-[#2979FF]/30 text-[#00E5FF] group-hover:bg-[#00E5FF]/20 group-hover:border-[#00E5FF]/50 transition-colors"><Layers size={20} /></div>
                  <div>
                    <h4 className="text-[#F5F7FF] font-bold text-sm mb-1 group-hover:text-[#00E5FF] transition-colors">Mailer {item.id} - District {item.district}</h4>
                    <div className="text-[10px] font-mono tracking-widest text-[#AAB2FF] uppercase flex items-center gap-4"><span>QTY: {item.qty}</span><span className="text-[#FFD600]">Status: Processing</span></div>
                  </div>
                </div>
                <div className="w-64"><div className="w-full bg-[#0F1440] h-2 rounded-full overflow-hidden border border-[#2979FF]/20"><div className="bg-[#00E5FF] h-full shadow-[0_0_10px_#00E5FF]" style={{ width: `${item.pct}%` }} /></div></div>
                <button className="text-[#6B72A0] hover:text-[#FF3B30] transition-colors bg-[#0F1440] px-3 py-1.5 rounded border border-[#2979FF]/30 font-black uppercase text-[10px] tracking-widest">Halt</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
