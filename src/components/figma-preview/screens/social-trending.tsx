"use client";
import React, { useState } from "react";
import { TrendingUp, Flame, Clock, Eye, MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TRENDING_TOPICS = [
  { id: 1, topic: "Climate Action Budget", views: "124K", polls: 23, growth: "+890%", velocity: "🔥", sentiment: 68, tags: ["Environment", "Local", "Budget"], trending: 1 },
  { id: 2, topic: "Tech Tax Breaks", views: "98K", polls: 18, growth: "+620%", velocity: "🔥", sentiment: 42, tags: ["Economy", "Tech", "State"], trending: 2 },
  { id: 3, topic: "Public Transit Expansion", views: "87K", polls: 31, growth: "+440%", velocity: "⚡", sentiment: 75, tags: ["Transit", "Infrastructure"], trending: 3 },
  { id: 4, topic: "School Board AI Literacy", views: "76K", polls: 14, growth: "+380%", velocity: "⚡", sentiment: 55, tags: ["Education", "AI", "Schools"], trending: 4 },
  { id: 5, topic: "Downtown Housing Density", views: "62K", polls: 27, growth: "+310%", velocity: "↗", sentiment: 38, tags: ["Housing", "Development"], trending: 5 },
  { id: 6, topic: "Police Body Camera Mandate", views: "58K", polls: 19, growth: "+280%", velocity: "↗", sentiment: 81, tags: ["Safety", "Reform"], trending: 6 },
  { id: 7, topic: "Minimum Wage Increase", views: "54K", polls: 22, growth: "+245%", velocity: "↗", sentiment: 64, tags: ["Economy", "Labor"], trending: 7 },
  { id: 8, topic: "Green Energy Subsidies", views: "49K", polls: 16, growth: "+198%", velocity: "→", sentiment: 72, tags: ["Energy", "Climate"], trending: 8 },
];

export function SocialTrending() {
  const [filter, setFilter] = useState<"all" | "local" | "state" | "national">("all");

  return (
    <div className="h-full w-full bg-[#0B0B0F] overflow-y-auto pt-14 pb-6">
      <header className="px-6 mb-6 sticky top-14 bg-[#0B0B0F]/95 backdrop-blur-xl z-10 pb-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-[#FFFFFF] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] flex items-center gap-2">
            <Flame size={24} className="text-[#FF3B30] fill-[#FF3B30] drop-shadow-[0_0_15px_#FF3B30]" />
            Trending
          </h1>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] flex items-center gap-2 bg-[#00E5FF]/10 px-3 py-1.5 rounded-full border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Clock size={10} className="animate-pulse" /> LIVE DATA
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", "local", "state", "national"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex-shrink-0",
                filter === f
                  ? "bg-[#00E5FF] text-[#0B0B0F] shadow-[0_0_20px_rgba(0,229,255,0.6)]"
                  : "bg-[#141419] text-[#B0B3C0] border border-[#FFFFFF]/10 hover:border-[#00E5FF]/50 hover:text-[#FFFFFF]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 space-y-3">
        {TRENDING_TOPICS.map((topic, idx) => {
          const sentimentColor = topic.sentiment >= 70 ? "#00E676" : topic.sentiment >= 40 ? "#FFD600" : "#FF3B30";
          const circumference = 2 * Math.PI * 28;
          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#141419]/80 backdrop-blur-xl rounded-2xl border border-[#FFFFFF]/10 p-4 hover:border-[#00E5FF]/50 hover:bg-[#141419] transition-all cursor-pointer group relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute -top-1 -left-1 w-12 h-12 bg-gradient-to-br from-[#00E5FF] to-[#2979FF] rounded-full flex items-center justify-center text-xl font-black text-[#0B0B0F] shadow-[0_0_20px_rgba(0,229,255,0.6)] border-4 border-[#0B0B0F]">
                {topic.trending}
              </div>
              <div className="flex items-start gap-4 pl-10">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <h3 className="text-[16px] font-black text-[#FFFFFF] leading-tight tracking-tight group-hover:text-[#00E5FF] transition-colors drop-shadow-md">
                      {topic.topic}
                    </h3>
                    <span className="text-2xl flex-shrink-0">{topic.velocity}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {topic.tags.map((tag, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-wider bg-[#FFFFFF]/10 text-[#B0B3C0] px-2 py-0.5 rounded border border-[#FFFFFF]/10">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 text-[#00E5FF]"><Eye size={12} /><span>{topic.views}</span></div>
                    <div className="flex items-center gap-1.5 text-[#AAB2FF]"><MessageCircle size={12} /><span>{topic.polls} polls</span></div>
                    <div className="flex items-center gap-1.5 text-[#FF3B30]"><TrendingUp size={12} /><span>{topic.growth}</span></div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="#141419" strokeWidth="6" fill="none" />
                      <circle
                        cx="32" cy="32" r="28"
                        stroke={sentimentColor} strokeWidth="6" fill="none"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={`${circumference * (1 - topic.sentiment / 100)}`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${sentimentColor})`, transition: "stroke-dashoffset 0.5s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[14px] font-black text-[#FFFFFF]">{topic.sentiment}%</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#6C6F7F]">Sentiment</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-[#00E5FF]" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-6 mt-6 flex justify-center">
        <button className="w-full py-4 bg-[#141419] border border-[#FFFFFF]/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#B0B3C0] hover:text-[#00E5FF] hover:border-[#00E5FF]/50 hover:bg-[#141419]/80 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          Load More Signals
        </button>
      </div>
    </div>
  );
}
