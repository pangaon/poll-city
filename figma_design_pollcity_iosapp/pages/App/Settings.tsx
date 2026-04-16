import React from "react";
import { Settings as SettingsIcon, Shield, Lock, Bell, Zap, Database } from "lucide-react";

export function Settings() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3">
            <SettingsIcon className="text-[#00E5FF]" size={28} /> System Protocols
          </h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">Configure war room telemetry and access parameters.</p>
        </div>
        <button className="bg-[#2979FF] text-[#F5F7FF] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#00E5FF] transition-all shadow-[0_0_20px_rgba(41,121,255,0.4)]">
          Commit Changes
        </button>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-6">
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-[#2979FF]/20 flex items-center gap-4 bg-[#050A1F]/50">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#00E5FF] to-[#2979FF] rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center justify-center font-black text-[#050A1F] text-xl">
                OP
              </div>
              <div>
                <div className="font-black text-[#F5F7FF] uppercase tracking-widest text-sm">Operator Alpha</div>
                <div className="text-[10px] text-[#00E5FF] uppercase tracking-widest font-mono">Level 5 Clearance</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { icon: Shield, text: "Security Profile", active: true },
                { icon: Lock, text: "Data Encryption", active: false },
                { icon: Bell, text: "Alert Rules", active: false },
                { icon: Zap, text: "Integrations", active: false },
                { icon: Database, text: "Storage Limits", active: false }
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${item.active ? 'bg-[#2979FF]/20 border-[#2979FF]/50 text-[#00E5FF] shadow-[inset_0_0_10px_rgba(41,121,255,0.2)]' : 'border-transparent text-[#AAB2FF] hover:bg-[#2979FF]/10 hover:text-[#F5F7FF]'} transition-all cursor-pointer font-bold uppercase text-[11px] tracking-widest`}>
                  <item.icon size={16} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-8">
          <h2 className="text-[#F5F7FF] font-black uppercase tracking-[0.2em] border-b border-[#2979FF]/20 pb-4 mb-6 text-lg">Active Configuration: Security Profile</h2>
          
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] text-[#AAB2FF] font-black uppercase tracking-widest block">Two-Factor Auth</label>
                <div className="flex gap-4">
                  <button className="flex-1 bg-[#00C853]/20 border border-[#00C853]/50 text-[#00C853] py-2 rounded text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,200,83,0.2)]">Enforced</button>
                  <button className="flex-1 bg-[#050A1F] border border-[#2979FF]/30 text-[#6B72A0] py-2 rounded text-xs font-bold uppercase tracking-widest hover:text-[#F5F7FF] hover:border-[#2979FF]/50 transition-colors">Bypass</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-[#AAB2FF] font-black uppercase tracking-widest block">Session Timeout</label>
                <select className="w-full bg-[#050A1F] border border-[#2979FF]/30 rounded px-4 py-2.5 text-[#F5F7FF] text-sm font-mono tracking-widest outline-none focus:border-[#00E5FF] transition-colors shadow-inner appearance-none">
                  <option>15 Minutes</option>
                  <option>30 Minutes</option>
                  <option>1 Hour</option>
                  <option>Never (Local)</option>
                </select>
              </div>
            </div>

            <div className="bg-[#050A1F] border border-[#FF3B30]/30 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#FF3B30]/5 pointer-events-none"></div>
              <h3 className="text-[#FF3B30] font-black uppercase tracking-widest text-[11px] mb-4 flex items-center gap-2"><Shield size={14}/> Danger Zone</h3>
              <p className="text-[#AAB2FF] text-sm mb-6 leading-relaxed">Initiating a system purge will erase all local cache, end active sessions, and disconnect from live turf vectors.</p>
              <button className="bg-transparent border border-[#FF3B30] text-[#FF3B30] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#FF3B30] hover:text-[#F5F7FF] transition-all shadow-[0_0_15px_rgba(255,59,48,0.2)] text-xs">
                Purge System State
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}