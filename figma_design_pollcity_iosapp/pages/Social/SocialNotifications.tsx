import React from "react";
import { motion } from "motion/react";
import { Bell, ShieldAlert, Zap, UserPlus, Heart } from "lucide-react";
import { cn } from "../../utils/cn";

export function SocialNotifications() {
  const NOTIFICATIONS = [
    { id: 1, type: "alert", icon: ShieldAlert, color: "#FF3B30", title: "Sector Alpha Anomaly", time: "2m ago", desc: "Unusual spike in dissent detected." },
    { id: 2, type: "engage", icon: Zap, color: "#00E5FF", title: "High Engagement", time: "15m ago", desc: "Your latest campaign reached 10k vectors." },
    { id: 3, type: "follow", icon: UserPlus, color: "#00E676", title: "New Cadre Joined", time: "1h ago", desc: "34 new users joined your coalition." },
    { id: 4, type: "like", icon: Heart, color: "#E91E63", title: "Sentiment Shift", time: "3h ago", desc: "Positive sentiment increased by 4% in District 9." },
  ];

  return (
    <div className="h-full w-full bg-[#050A1F] overflow-y-auto pt-14 pb-24 relative selection:bg-[#00E5FF]/30 selection:text-[#00E5FF]">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[-10%] w-[200px] h-[200px] bg-[#2979FF]/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[30%] left-[-10%] w-[150px] h-[150px] bg-[#00E5FF]/10 rounded-full blur-[60px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
      </div>

      <header className="px-6 mb-6 sticky top-14 bg-[#050A1F]/90 backdrop-blur-xl z-20 pb-4 pt-2 border-b border-[#2979FF]/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell size={24} className="text-[#00E5FF] drop-shadow-[0_0_15px_#00E5FF]" />
            <div className="absolute inset-0 bg-[#00E5FF] blur-md opacity-50 animate-pulse"></div>
          </div>
          <h1 className="text-xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(41,121,255,0.8)]">
            Alerts & Comm
          </h1>
        </div>
      </header>

      <div className="px-6 space-y-3 relative z-10">
        {NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0F1440]/80 backdrop-blur-xl border border-[#2979FF]/20 hover:border-[#00E5FF]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer group flex gap-4"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              style={{ 
                backgroundColor: `${n.color}15`, 
                borderColor: `${n.color}40`,
                boxShadow: `0 0 15px ${n.color}30` 
              }}
            >
              <n.icon size={18} style={{ color: n.color, filter: `drop-shadow(0 0 8px ${n.color})` }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-[13px] font-bold text-[#F5F7FF] tracking-tight truncate group-hover:text-[#00E5FF] transition-colors">
                  {n.title}
                </h3>
                <span className="text-[9px] font-mono text-[#6B72A0] whitespace-nowrap ml-2 mt-0.5">
                  {n.time}
                </span>
              </div>
              <p className="text-[11px] text-[#AAB2FF] leading-relaxed line-clamp-2">
                {n.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}