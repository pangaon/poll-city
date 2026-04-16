"use client";
import React, { useState } from "react";
import { Settings, Share2, TrendingUp, ThumbsUp, ThumbsDown, BarChart2, Award, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const USER_STATS = [
  { label: "Total Votes", value: "12.4K", icon: Zap, color: "#00E5FF" },
  { label: "Polls Created", value: "47", icon: BarChart2, color: "#2979FF" },
  { label: "Influence Score", value: "892", icon: Award, color: "#FFD600" },
  { label: "Streak Days", value: "28", icon: TrendingUp, color: "#00E676" },
];

const USER_POLLS = [
  { id: 1, question: "Should we reallocate 15% of the transportation budget to expand the Riverfront Park?", agrees: 1420, opposes: 890, views: "2.3K", trending: true, time: "2d ago" },
  { id: 2, question: "Do you support the new proposed tax incentives for clean energy startups?", agrees: 3200, opposes: 4100, views: "7.3K", trending: false, time: "5d ago" },
  { id: 3, question: "Is the current school board doing enough to integrate AI literacy into the curriculum?", agrees: 850, opposes: 2100, views: "2.9K", trending: false, time: "1w ago" },
];

const ACHIEVEMENTS = [
  { id: 1, name: "First Vote", icon: "🎯", unlocked: true },
  { id: 2, name: "10K Votes", icon: "⚡", unlocked: true },
  { id: 3, name: "Trending Poll", icon: "🔥", unlocked: true },
  { id: 4, name: "100 Polls", icon: "💎", unlocked: false },
  { id: 5, name: "Influencer", icon: "👑", unlocked: false },
];

export function SocialProfile() {
  const [activeTab, setActiveTab] = useState<"polls" | "activity" | "achievements">("polls");

  return (
    <div className="h-full w-full bg-[#0B0B0F] overflow-y-auto pt-14 pb-6">
      {/* Profile Header */}
      <div className="relative mb-6 overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-[#00E5FF]/20 via-[#2979FF]/20 to-[#800080]/20 relative">
          <div className="absolute inset-0 bg-[#0B0B0F]/60 backdrop-blur-sm" />
        </div>
        <div className="px-6 -mt-16 relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#2979FF] flex items-center justify-center text-4xl font-black shadow-[0_0_30px_rgba(0,229,255,0.6)] border-4 border-[#0B0B0F] mb-4">
            You
          </div>
          <div className="mb-4">
            <h1 className="text-2xl font-black text-[#FFFFFF] tracking-tight uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-1">Jane Voter</h1>
            <p className="text-[13px] font-mono text-[#B0B3C0] uppercase tracking-widest">@janevoter2030</p>
          </div>
          <p className="text-[14px] text-[#AAB2FF] mb-4 leading-relaxed max-w-md">
            Making my voice heard on the issues that matter. Democracy is a contact sport.
          </p>
          <div className="flex gap-3 mb-6">
            <button className="flex-1 py-3 bg-gradient-to-r from-[#00E5FF] to-[#2979FF] text-[#0B0B0F] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.6)] hover:shadow-[0_0_30px_rgba(0,229,255,0.8)] transition-all flex items-center justify-center gap-2">
              <Settings size={14} /> Edit Profile
            </button>
            <button className="flex-1 py-3 bg-[#141419] border border-[#FFFFFF]/20 text-[#FFFFFF] rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-[#00E5FF]/50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <Share2 size={14} /> Share
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {USER_STATS.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-[#141419]/80 backdrop-blur-xl rounded-xl border border-[#FFFFFF]/10 p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-20 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: stat.color }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: stat.color }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#6C6F7F]">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-black text-[#FFFFFF]">{stat.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 mb-6">
        <div className="flex bg-[#141419] p-1.5 rounded-xl border border-[#FFFFFF]/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          {(["polls", "activity", "achievements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-[#FFFFFF] text-[#0B0B0F] shadow-[0_0_15px_rgba(255,255,255,0.8)]" : "text-[#B0B3C0] hover:text-[#FFFFFF]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6">
        {activeTab === "polls" && (
          <div className="space-y-3">
            {USER_POLLS.map((poll, idx) => {
              const totalVotes = poll.agrees + poll.opposes;
              const agreePercent = (poll.agrees / totalVotes) * 100;
              return (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#141419]/80 backdrop-blur-xl rounded-xl border border-[#FFFFFF]/10 p-4 hover:border-[#00E5FF]/50 hover:bg-[#141419] transition-all cursor-pointer group shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-[14px] font-bold text-[#FFFFFF] leading-tight flex-1 group-hover:text-[#00E5FF] transition-colors">{poll.question}</h3>
                    {poll.trending && (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[#FF3B30]/20 text-[#FF3B30] px-2 py-1 rounded border border-[#FF3B30]/50 flex-shrink-0 animate-pulse">
                        <TrendingUp size={10} /> HOT
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 h-2 bg-[#0B0B0F] rounded-full overflow-hidden border border-[#FFFFFF]/10">
                        <div className="h-full bg-gradient-to-r from-[#00E676] to-[#00C853] shadow-[0_0_10px_#00E676]" style={{ width: `${agreePercent}%` }} />
                      </div>
                      <div className="flex-1 h-2 bg-[#0B0B0F] rounded-full overflow-hidden border border-[#FFFFFF]/10">
                        <div className="h-full bg-gradient-to-l from-[#FF3B30] to-[#D50000] shadow-[0_0_10px_#FF3B30]" style={{ width: `${100 - agreePercent}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1 text-[#00E676]"><ThumbsUp size={12} />{poll.agrees}</div>
                      <div className="flex items-center gap-1 text-[#FF3B30]"><ThumbsDown size={12} />{poll.opposes}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6C6F7F]">
                    <span>{poll.views} views</span>
                    <span>{poll.time}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="bg-[#141419]/80 backdrop-blur-xl rounded-xl border border-[#FFFFFF]/10 p-6 text-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="w-16 h-16 bg-[#0B0B0F] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#FFFFFF]/10">
                <BarChart2 size={28} className="text-[#6C6F7F]" />
              </div>
              <h3 className="text-lg font-black text-[#FFFFFF] mb-2 uppercase tracking-tight">Activity Feed</h3>
              <p className="text-[12px] font-mono text-[#6C6F7F] uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">
                Your voting activity and engagement history will appear here.
              </p>
            </div>
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement, idx) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "aspect-square rounded-xl border p-3 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all",
                  achievement.unlocked
                    ? "bg-[#141419]/80 backdrop-blur-xl border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                    : "bg-[#0B0B0F] border-[#FFFFFF]/10 opacity-40"
                )}
              >
                <div className="text-3xl">{achievement.icon}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#FFFFFF] text-center leading-tight">{achievement.name}</span>
                {achievement.unlocked && <div className="w-2 h-2 bg-[#00E676] rounded-full shadow-[0_0_10px_#00E676] animate-pulse" />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
