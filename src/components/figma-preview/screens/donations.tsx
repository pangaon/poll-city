"use client";
import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mon", amt: 120000 }, { name: "Tue", amt: 210000 }, { name: "Wed", amt: 180000 },
  { name: "Thu", amt: 350000 }, { name: "Fri", amt: 290000 }, { name: "Sat", amt: 480000 }, { name: "Sun", amt: 620000 },
];

export function Donations() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3"><DollarSign className="text-[#FFD600]" size={28} /> Capital Ledger</h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">High-density donor CRM and fundraising telemetry.</p>
        </div>
        <button className="bg-[#FFD600] text-[#050A1F] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#F5F7FF] transition-all shadow-[0_0_20px_rgba(255,214,0,0.4)]">Record Influx</button>
      </header>
      <div className="flex-1 grid grid-cols-3 gap-6">
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-[#0F1440]/60 backdrop-blur-xl border border-[#FFD600]/30 rounded-xl p-6 relative flex flex-col justify-center items-center h-48">
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFD600]/10 to-transparent pointer-events-none rounded-xl" />
            <h3 className="text-[#AAB2FF] font-black uppercase tracking-[0.2em] text-[10px] mb-2 relative z-10">War Chest Total</h3>
            <div className="text-5xl font-black text-[#F5F7FF] tracking-tighter flex items-center gap-2 relative z-10"><span className="text-[#FFD600]">$</span>2.4M</div>
            <div className="mt-4 flex items-center gap-1 text-[#00C853] text-[10px] font-bold uppercase tracking-widest bg-[#00C853]/10 px-3 py-1 rounded relative z-10"><TrendingUp size={12} /> +12% this week</div>
          </div>
          <div className="bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl flex-1 p-6">
            <h3 className="text-[#AAB2FF] font-black uppercase tracking-[0.2em] text-[10px] mb-4">Top Vectors</h3>
            <ul className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <li key={i} className="flex justify-between items-center bg-[#050A1F] p-3 rounded border border-[#2979FF]/20 group hover:border-[#00E5FF]/40 transition-all cursor-pointer">
                  <span className="font-bold text-[#F5F7FF] text-sm group-hover:text-[#00E5FF] transition-colors">PAC {i}</span>
                  <span className="text-[#FFD600] font-mono font-bold">${i * 10},000</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col-span-2 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none mix-blend-screen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-64 object-contain filter grayscale" />
          </div>
          <h3 className="text-[#AAB2FF] font-black uppercase tracking-[0.2em] text-[10px] mb-4 relative z-10">Live Capital Flow</h3>
          <div className="flex-1 rounded border border-[#2979FF]/20 relative overflow-hidden bg-[#050A1F]/80 z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/><stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#6B72A0" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B72A0" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: "#0F1440", borderColor: "#2979FF", borderRadius: "8px" }} itemStyle={{ color: "#00E5FF", fontWeight: "bold" }} formatter={((value: number) => [`$${value.toLocaleString()}`, "Raised"]) as never} />
                <Area type="monotone" dataKey="amt" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.6))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
