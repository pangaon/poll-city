"use client";
import React, { useState } from "react";
import { Shield, Server, Activity, Users, Zap, Database, Lock, AlertTriangle, Key } from "lucide-react";
import { cn } from "@/lib/utils";

export function Admin() {
  const [activeTab, setActiveTab] = useState("tenants");

  return (
    <div className="flex h-full w-full bg-[#0B0B15] text-[#F5F7FF] font-mono selection:bg-[#FF3B30]/30 selection:text-[#FF3B30]">
      {/* Left Sidebar */}
      <div className="w-[260px] border-r border-[#FF3B30]/20 bg-[#140505]/90 backdrop-blur-xl flex flex-col shadow-[10px_0_30px_rgba(255,59,48,0.1)] z-20">
        <div className="h-16 px-5 border-b border-[#FF3B30]/20 flex items-center bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black text-[#FF3B30] uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_#FF3B30]"><Shield size={16} /> FOUNDER CORE</h1>
        </div>
        <div className="p-4 space-y-2 flex-1">
          {[{ id: "tenants", icon: Server, label: "Active Campaigns" }, { id: "audit", icon: Activity, label: "Global Audit Log" }, { id: "db", icon: Database, label: "Infrastructure" }, { id: "users", icon: Users, label: "Platform Admins" }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest transition-all border", activeTab === item.id ? "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/40 shadow-[inset_0_0_10px_rgba(255,59,48,0.1)]" : "border-transparent text-[#AAB2FF] hover:bg-[#FF3B30]/5")}>
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-[#FF3B30]/20 bg-[#140505]">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#6B72A0]"><Lock size={12} /> Root Access Active</div>
          <button className="w-full py-2 bg-[#FF3B30] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-red-500 shadow-[0_0_20px_rgba(255,59,48,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"><Key size={14} /> REVOKE TOKENS</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050A1F]">
        <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-[#FF3B30]/5 rounded-full blur-[150px] pointer-events-none z-0" />
        <div className="absolute bottom-[0%] left-[20%] w-[400px] h-[400px] bg-[#2979FF]/5 rounded-full blur-[120px] pointer-events-none z-0" />

        {activeTab === "tenants" && (
          <div className="flex-1 flex flex-col p-8 relative z-20 overflow-y-auto">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#FF3B30]/20">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#FF3B30] drop-shadow-[0_0_10px_rgba(255,59,48,0.8)]">Multi-Tenant Control</h2>
                <div className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mt-1">Viewing all active campaign instances</div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-[#FF3B30]/40 text-[#FF3B30] rounded text-[11px] font-bold uppercase tracking-widest hover:bg-[#FF3B30]/10 transition-colors">Provision Tenant</button>
                <button className="px-4 py-2 border border-[#2979FF]/40 text-[#00E5FF] rounded text-[11px] font-bold uppercase tracking-widest hover:bg-[#2979FF]/10 transition-colors">Global Sync</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#140505]/80 border border-[#FF3B30]/30 rounded p-4"><h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-2">Total Tenants</h3><div className="text-4xl font-black text-[#F5F7FF]">24</div></div>
              <div className="bg-[#050A1F]/80 border border-[#2979FF]/30 rounded p-4"><h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-2">Active Data Points</h3><div className="text-4xl font-black text-[#00E5FF] drop-shadow-[0_0_10px_#00E5FF]">14.2M</div></div>
              <div className="bg-[#050A1F]/80 border border-[#00C853]/30 rounded p-4 flex items-center justify-between"><div><h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-2">System Status</h3><div className="text-2xl font-black text-[#00C853] drop-shadow-[0_0_10px_#00C853]">OPTIMAL</div></div><Activity size={32} className="text-[#00C853] opacity-50" /></div>
            </div>
            <div className="bg-[#0B0B15]/80 border border-[#FF3B30]/20 rounded overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#140505] border-b border-[#FF3B30]/30">
                  <tr>{["Tenant ID", "Campaign Name", "Users", "Storage", "Status", "Actions"].map((h, i) => <th key={i} className="py-3 px-4 text-[10px] font-black text-[#FF3B30] uppercase tracking-[0.2em]">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#FF3B30]/10">
                  {[{ id: "T-091", name: "Chen for Mayor 2030", users: 45, storage: "1.2 TB", status: "ACTIVE", color: "#00C853" }, { id: "T-044", name: "Tech Forward Initiative", users: 12, storage: "420 GB", status: "ACTIVE", color: "#00C853" }, { id: "T-102", name: "District 9 Recount", users: 8, storage: "95 GB", status: "SUSPENDED", color: "#FFD600" }, { id: "T-012", name: "Prop B Committee", users: 140, storage: "4.5 TB", status: "THROTTLED", color: "#FF3B30" }].map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-[#FF3B30]/5 transition-colors group">
                      <td className="py-3 px-4 text-[11px] font-bold text-[#AAB2FF]">{tenant.id}</td>
                      <td className="py-3 px-4 text-[12px] font-bold text-[#F5F7FF] group-hover:text-[#FF3B30] transition-colors">{tenant.name}</td>
                      <td className="py-3 px-4 text-[11px] text-[#AAB2FF]">{tenant.users}</td>
                      <td className="py-3 px-4 text-[11px] text-[#AAB2FF]">{tenant.storage}</td>
                      <td className="py-3 px-4"><span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border" style={{ color: tenant.color, borderColor: `${tenant.color}50`, backgroundColor: `${tenant.color}15` }}>{tenant.status}</span></td>
                      <td className="py-3 px-4 text-right"><button className="text-[10px] font-bold text-[#6B72A0] hover:text-[#00E5FF] uppercase tracking-widest px-2 py-1 border border-transparent hover:border-[#00E5FF]/40 rounded transition-all">Inspect</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab !== "tenants" && (
          <div className="flex-1 flex items-center justify-center relative z-20">
            <div className="text-center"><div className="text-[#FF3B30] text-4xl font-black uppercase tracking-widest mb-4">{activeTab.toUpperCase()}</div><div className="text-[#6B72A0] text-[11px] uppercase tracking-widest">Module Active — Data Streaming</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
