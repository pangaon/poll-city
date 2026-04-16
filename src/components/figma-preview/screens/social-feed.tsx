"use client";
import React, { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

const POLLS = [
  { id: 1, author: "Mayor Chen", handle: "@mayorchen", question: "Should we reallocate 15% of the transportation budget to expand the Riverfront Park?", bg: "bg-gradient-to-br from-[#00E5FF] to-[#2979FF]", tags: ["Local", "Environment"], yes: 1420, no: 890, trend: "+12.4%" },
  { id: 2, author: "Tech Forward IL", handle: "@techil", question: "Do you support the new proposed tax incentives for clean energy startups?", bg: "bg-gradient-to-br from-[#FFD600] to-[#FF3B30]", tags: ["Economy", "Taxes"], yes: 3200, no: 4100, trend: "-4.2%" },
  { id: 3, author: "Poll City Daily", handle: "@pollcitynews", question: "Is the current school board doing enough to integrate AI literacy into the curriculum?", bg: "bg-gradient-to-br from-[#FF3B30] to-[#800080]", tags: ["Education", "Trending"], yes: 850, no: 2100, trend: "+89.1%" },
];

function Card({ poll, setExitX, index, setIndex }: { poll: typeof POLLS[0]; setExitX: (v: number) => void; index: number; setIndex: (v: number) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const agreeOpacity = useTransform(x, [20, 80], [0, 1]);
  const agreeScale = useTransform(x, [20, 80], [0.8, 1]);
  const opposeOpacity = useTransform(x, [-20, -80], [0, 1]);
  const opposeScale = useTransform(x, [-20, -80], [0.8, 1]);

  const handleDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      setExitX(200);
      setIndex(index + 1);
    } else if (info.offset.x < -100) {
      setExitX(-200);
      setIndex(index + 1);
    }
  };

  const isUp = poll.trend.startsWith("+");

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="absolute w-[calc(100%-32px)] aspect-[4/5] max-h-[640px] left-4 top-[15%] rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] cursor-grab bg-[#141419] z-10 origin-bottom border border-[#FFFFFF]/10"
    >
      <div className={cn("w-full h-full relative flex flex-col p-6 text-[#FFFFFF] justify-between", poll.bg)}>
        <div className="absolute inset-0 bg-[#0B0B0F]/40 pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-3 bg-[#0B0B0F]/60 backdrop-blur-xl px-4 py-2 rounded-full border border-[#FFFFFF]/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="w-10 h-10 rounded-full bg-[#FFFFFF]/10 flex items-center justify-center text-sm font-black border border-[#FFFFFF]/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              {poll.author[0]}
            </div>
            <div>
              <div className="text-[14px] font-black leading-tight tracking-wide">{poll.author}</div>
              <div className="text-[11px] text-[#B0B3C0] font-mono uppercase tracking-widest leading-tight">{poll.handle}</div>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-[#0B0B0F]/60 backdrop-blur-xl flex items-center justify-center text-[#FFFFFF] border border-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="relative z-10 mt-auto mb-16">
          <div className="flex gap-2 mb-6">
            {poll.tags.map((tag, i) => (
              <span key={i} className="text-[10px] font-black uppercase tracking-[0.2em] bg-[#FFFFFF]/10 backdrop-blur-xl px-3 py-1.5 rounded border border-[#FFFFFF]/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                {tag}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] bg-[#00E5FF]/20 text-[#00E5FF] backdrop-blur-xl px-3 py-1.5 rounded border border-[#00E5FF]/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]">
              <Zap size={10} className="fill-[#00E5FF]" /> HOT
            </span>
          </div>
          <h2 className="text-4xl font-black leading-[1.1] tracking-tighter drop-shadow-[0_5px_20px_rgba(0,0,0,1)]">
            {poll.question}
          </h2>
          <div className="text-[12px] font-mono text-[#B0B3C0] mt-6 flex items-center gap-4 uppercase tracking-widest">
            <span className="flex items-center gap-1 text-[#FFFFFF] font-black">
              {((poll.yes + poll.no) / 1000).toFixed(1)}K DATA POINTS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]/30" />
            <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded font-black", isUp ? "text-[#00E676] bg-[#00E676]/10" : "text-[#FF3B30] bg-[#FF3B30]/10")}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {poll.trend}
            </span>
          </div>
        </div>

        <motion.div
          style={{ opacity: agreeOpacity, scale: agreeScale }}
          className="absolute inset-0 bg-gradient-to-r from-transparent to-[#00E676]/40 z-20 pointer-events-none mix-blend-overlay flex items-center justify-end pr-12"
        >
          <div className="text-[80px] font-black italic text-[#00E676] drop-shadow-[0_0_30px_#00E676] tracking-tighter uppercase rotate-[-10deg]">AGREE</div>
        </motion.div>
        <motion.div
          style={{ opacity: opposeOpacity, scale: opposeScale }}
          className="absolute inset-0 bg-gradient-to-l from-transparent to-[#FF3B30]/40 z-20 pointer-events-none mix-blend-overlay flex items-center justify-start pl-12"
        >
          <div className="text-[80px] font-black italic text-[#FF3B30] drop-shadow-[0_0_30px_#FF3B30] tracking-tighter uppercase rotate-[10deg]">OPPOSE</div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function SocialFeed() {
  const [index, setIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  return (
    <div className="h-full w-full relative flex flex-col pt-14 bg-[#0B0B0F]">
      <header className="px-6 flex justify-between items-center mb-4 z-20 relative">
        <h1 className="text-2xl font-black text-[#FFFFFF] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Poll City Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] hover:-translate-y-1 transition-transform" />
          Poll City
        </h1>
        <div className="flex bg-[#141419] p-1.5 rounded-xl border border-[#FFFFFF]/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <button className="px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest bg-[#FFFFFF] text-[#0B0B0F] shadow-[0_0_15px_rgba(255,255,255,0.8)]">For You</button>
          <button className="px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#B0B3C0] hover:text-[#FFFFFF] transition-colors">Local</button>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full" style={{ perspective: "1500px" }}>
        <AnimatePresence initial={false}>
          {POLLS.slice(index, index + 2).reverse().map((poll, i) => {
            const isFront = i === POLLS.slice(index, index + 2).length - 1;
            if (!isFront) {
              return (
                <motion.div
                  key={poll.id}
                  initial={{ scale: 0.90, y: -40, opacity: 0 }}
                  animate={{ scale: 0.92, y: -20, opacity: 0.6 }}
                  className="absolute w-[calc(100%-32px)] aspect-[4/5] max-h-[640px] left-4 top-[15%] rounded-[40px] overflow-hidden shadow-sm bg-[#141419] z-0 border border-[#FFFFFF]/5"
                >
                  <div className={cn("w-full h-full opacity-40 blur-md saturate-200", poll.bg)} />
                </motion.div>
              );
            }
            return (
              <Card key={poll.id} poll={poll} setExitX={setExitX} index={index} setIndex={setIndex} />
            );
          })}
        </AnimatePresence>

        {index >= POLLS.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#B0B3C0]">
            <div className="w-24 h-24 bg-[#141419] rounded-full flex items-center justify-center mb-8 border border-[#00E5FF]/30 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
              <Zap size={40} className="text-[#00E5FF] drop-shadow-[0_0_10px_#00E5FF]" />
            </div>
            <h3 className="text-2xl font-black text-[#FFFFFF] mb-3 uppercase tracking-tight">Data Stream Clear</h3>
            <p className="text-[12px] font-mono text-[#6C6F7F] max-w-[240px] text-center uppercase tracking-widest leading-relaxed">
              Awaiting new vectors.<br />Check back or initiate signal.
            </p>
            <button
              onClick={() => setIndex(0)}
              className="mt-10 px-8 py-4 bg-[#00E5FF] text-[#0B0B0F] rounded-full font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,229,255,0.6)] hover:shadow-[0_0_40px_rgba(0,229,255,0.8)] hover:scale-105 active:scale-95 transition-all"
            >
              Refresh Stream
            </button>
          </div>
        )}
      </div>

      <div className="absolute right-6 bottom-[25%] flex flex-col gap-6 z-40">
        <button className="flex flex-col items-center gap-2 hover:scale-110 transition-transform group">
          <div className="w-14 h-14 bg-[#141419]/90 backdrop-blur-xl rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center border border-[#FFFFFF]/10 group-hover:border-[#FF3B30]/50 transition-colors">
            <Heart size={26} className="text-[#FFFFFF] group-hover:fill-[#FF3B30] group-hover:text-[#FF3B30] transition-all" />
          </div>
          <span className="text-[11px] font-black text-[#FFFFFF] drop-shadow-md">14.2K</span>
        </button>
        <button className="flex flex-col items-center gap-2 hover:scale-110 transition-transform group">
          <div className="w-14 h-14 bg-[#141419]/90 backdrop-blur-xl rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center border border-[#FFFFFF]/10 group-hover:border-[#00E5FF]/50 transition-colors">
            <MessageCircle size={26} className="text-[#FFFFFF] group-hover:text-[#00E5FF] transition-all" />
          </div>
          <span className="text-[11px] font-black text-[#FFFFFF] drop-shadow-md">2.1K</span>
        </button>
        <button className="flex flex-col items-center gap-2 hover:scale-110 transition-transform group">
          <div className="w-14 h-14 bg-[#141419]/90 backdrop-blur-xl rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center border border-[#FFFFFF]/10 group-hover:border-[#00E676]/50 transition-colors">
            <Share2 size={26} className="text-[#FFFFFF] group-hover:text-[#00E676] transition-all" />
          </div>
          <span className="text-[11px] font-black text-[#FFFFFF] drop-shadow-md">SHARE</span>
        </button>
      </div>
    </div>
  );
}
