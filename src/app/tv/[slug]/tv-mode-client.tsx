"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────────────────── */

type TvMode =
  | "war-room"
  | "gotv-tracker"
  | "volunteer-leaderboard"
  | "results-night"
  | "social-wall"
  | "fundraising-thermometer"
  | "election-day-ops";

const MODES: Array<{ id: TvMode; label: string }> = [
  { id: "war-room", label: "War Room" },
  { id: "gotv-tracker", label: "GOTV Tracker" },
  { id: "volunteer-leaderboard", label: "Volunteer Leaderboard" },
  { id: "results-night", label: "Results Night" },
  { id: "social-wall", label: "Social Wall" },
  { id: "fundraising-thermometer", label: "Fundraising Thermometer" },
  { id: "election-day-ops", label: "Election Day Ops" },
];

/* ─── AnimatedCounter ───────────────────────────────────────────────── */

function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    const startTime = performance.now();
    const ms = duration * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ms, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = value;
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Countdown Clock ───────────────────────────────────────────────── */

function CountdownClock({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex gap-4 text-center">
      {[
        { v: days, l: "DAYS" },
        { v: hours, l: "HRS" },
        { v: minutes, l: "MIN" },
        { v: seconds, l: "SEC" },
      ].map(({ v, l }) => (
        <div key={l} className="bg-white/5 rounded-xl px-5 py-3 min-w-[80px]">
          <div className="text-4xl font-black tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className="text-xs text-slate-400 mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Activity Ticker ───────────────────────────────────────────────── */

function ActivityTicker({ items }: { items: string[] }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setOffset((p) => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const visible = items.length > 0 ? items[offset % items.length] : "";

  return (
    <div className="overflow-hidden h-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={offset}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-blue-200"
        >
          {visible}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────────────── */

function ProgressBar({ percent, color = "bg-emerald-500" }: { percent: number; color?: string }) {
  return (
    <div className="h-8 rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, percent)}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </div>
  );
}

/* ─── Confetti (CSS-only, lightweight) ──────────────────────────────── */

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
        size: 6 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: "100vh", opacity: 0, rotate: 360 + Math.random() * 360 }}
          transition={{ duration: 3 + Math.random() * 2, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

/* ─── Thermometer SVG ───────────────────────────────────────────────── */

function ThermometerSVG({ percent }: { percent: number }) {
  const fillHeight = (percent / 100) * 380;

  return (
    <svg viewBox="0 0 120 500" className="h-[520px] w-[120px]">
      {/* Outer tube */}
      <rect x="30" y="20" width="60" height="400" rx="30" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      {/* Bulb */}
      <circle cx="60" cy="440" r="40" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      {/* Fill */}
      <motion.rect
        x="38"
        y={400 - fillHeight + 20}
        width="44"
        rx="22"
        fill="#10b981"
        initial={{ height: 0 }}
        animate={{ height: fillHeight }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      {/* Bulb fill */}
      <circle cx="60" cy="440" r="32" fill="#10b981" />
      {/* Markers */}
      {[0, 25, 50, 75, 100].map((mark) => {
        const yPos = 400 - (mark / 100) * 380 + 20;
        return (
          <g key={mark}>
            <line x1="92" y1={yPos} x2="105" y2={yPos} stroke="#64748b" strokeWidth="1.5" />
            <text x="110" y={yPos + 4} fill="#94a3b8" fontSize="11">
              {mark}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Demo Data ─────────────────────────────────────────────────────── */

const DEMO = {
  supporters: 12845,
  doorsKnocked: 8432,
  volunteerCount: 156,
  electionDate: new Date("2026-10-26T20:00:00"),
  activityItems: [
    "Sarah K. completed Turf 14 — 32 doors",
    "New donor: $250 from Anonymous",
    "Volunteer check-in: Jake M. at Ward 8 HQ",
    "Call list updated: 180 new contacts",
    "Text bank sent: 400 messages dispatched",
    "Sign request fulfilled: 12 lawn signs delivered",
    "Poll volunteer confirmed: Station 007",
    "Canvass shift complete: Team Alpha, 58 contacts",
  ],
  gotvVoted: 9214,
  gotvTotal: 14600,
  gotvGoal: 12000,
  volunteers: [
    { name: "Sarah K.", doors: 340, avatar: "SK" },
    { name: "Marcus T.", doors: 323, avatar: "MT" },
    { name: "Priya N.", doors: 306, avatar: "PN" },
    { name: "David L.", doors: 289, avatar: "DL" },
    { name: "Emily C.", doors: 272, avatar: "EC" },
    { name: "Jake M.", doors: 255, avatar: "JM" },
    { name: "Olivia P.", doors: 238, avatar: "OP" },
    { name: "Liam W.", doors: 221, avatar: "LW" },
    { name: "Zara A.", doors: 204, avatar: "ZA" },
    { name: "Chen R.", doors: 187, avatar: "CR" },
  ],
  candidate: { name: "Our Candidate", votes: 14382 },
  opponent: { name: "Opponent", votes: 13904 },
  pollsReporting: 47,
  pollsTotal: 62,
  socialPosts: [
    { source: "twitter" as const, text: "Great turnout at the doors tonight! #PollCity", author: "@voter_advocate", time: "2m ago" },
    { source: "instagram" as const, text: "Proud to volunteer for this campaign! Team energy is incredible.", author: "@sarah_knocks", time: "5m ago" },
    { source: "twitter" as const, text: "Huge momentum in Ward 8. The candidate really listens.", author: "@ward8news", time: "8m ago" },
    { source: "instagram" as const, text: "Sign-up event was packed today. Democracy in action.", author: "@civiclife", time: "12m ago" },
    { source: "twitter" as const, text: "Thanks to every volunteer making calls this evening!", author: "@team_gotv", time: "15m ago" },
    { source: "instagram" as const, text: "Just knocked my 100th door this week! Feeling motivated.", author: "@jake_canvass", time: "18m ago" },
    { source: "twitter" as const, text: "Polls look promising. Keep pushing to E-Day!", author: "@poll_tracker", time: "22m ago" },
    { source: "twitter" as const, text: "Incredible debate performance tonight. Clear winner.", author: "@debate_watch", time: "25m ago" },
    { source: "instagram" as const, text: "Our lawn sign game is unmatched on this street.", author: "@suburban_voter", time: "30m ago" },
  ],
  fundraised: 204700,
  fundraiseGoal: 300000,
  recentDonors: [
    { name: "Alex T.", amount: 250, time: "2m ago" },
    { name: "Jordan P.", amount: 100, time: "5m ago" },
    { name: "Riley S.", amount: 500, time: "8m ago" },
    { name: "Sam K.", amount: 75, time: "12m ago" },
    { name: "Morgan L.", amount: 200, time: "15m ago" },
    { name: "Casey D.", amount: 150, time: "18m ago" },
    { name: "Quinn W.", amount: 300, time: "22m ago" },
  ],
  turfs: 84,
  calls: 2903,
  texts: 4100,
  pollsOpen: true,
  pollCloseTime: new Date("2026-10-26T20:00:00"),
  volunteerCheckins: 132,
};

/* ─── Display 1: War Room ───────────────────────────────────────────── */

function WarRoomDisplay({ slug }: { slug: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">
            {slug.replace(/-/g, " ")}
          </h1>
          <p className="text-blue-400 text-sm mt-1">WAR ROOM</p>
        </div>
        <CountdownClock targetDate={DEMO.electionDate} />
      </div>

      {/* Center: Large supporter count */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <AnimatedCounter
            value={DEMO.supporters}
            className="text-[120px] leading-none font-black text-white"
          />
          <p className="text-2xl text-blue-300 mt-2 font-medium">IDENTIFIED SUPPORTERS</p>
        </motion.div>

        {/* Stat row */}
        <div className="flex gap-12 mt-8">
          <div className="text-center">
            <AnimatedCounter
              value={DEMO.doorsKnocked}
              className="text-5xl font-black text-emerald-400"
            />
            <p className="text-sm text-slate-400 mt-1">DOORS KNOCKED</p>
          </div>
          <div className="text-center">
            <AnimatedCounter
              value={DEMO.volunteerCount}
              className="text-5xl font-black text-amber-400"
            />
            <p className="text-sm text-slate-400 mt-1">VOLUNTEERS</p>
          </div>
          <div className="text-center">
            <AnimatedCounter
              value={DEMO.calls}
              className="text-5xl font-black text-cyan-400"
            />
            <p className="text-sm text-slate-400 mt-1">CALLS MADE</p>
          </div>
        </div>
      </div>

      {/* Bottom activity ticker */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Live Activity</span>
        </div>
        <div className="mt-2">
          <ActivityTicker items={DEMO.activityItems} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Display 2: GOTV Tracker ───────────────────────────────────────── */

function GOTVTrackerDisplay() {
  const percent = Math.round((DEMO.gotvVoted / DEMO.gotvTotal) * 100);
  const remaining = Math.max(0, DEMO.gotvGoal - DEMO.gotvVoted);
  const projected = Math.round(DEMO.gotvVoted * (DEMO.gotvTotal / (DEMO.pollsReporting / DEMO.pollsTotal * DEMO.gotvTotal || 1)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8 flex flex-col items-center justify-center gap-8"
    >
      <p className="text-xl text-emerald-400 font-semibold uppercase tracking-widest">
        GET OUT THE VOTE
      </p>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <AnimatedCounter
          value={DEMO.gotvVoted}
          className="text-[72px] leading-none font-black text-white"
        />
        <p className="text-xl text-slate-400 mt-2">
          of <AnimatedCounter value={DEMO.gotvTotal} className="font-bold text-slate-300" /> supporters voted
        </p>
      </motion.div>

      <div className="w-full max-w-3xl">
        <ProgressBar percent={percent} />
        <div className="flex justify-between mt-3 text-sm text-slate-400">
          <span>0%</span>
          <span className="text-lg font-bold text-emerald-400">{percent}%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="flex gap-16 mt-4">
        <div className="text-center">
          <AnimatedCounter
            value={remaining}
            className="text-4xl font-black text-amber-400"
          />
          <p className="text-sm text-slate-400 mt-1">REMAINING TO GOAL</p>
        </div>
        <div className="text-center">
          <AnimatedCounter
            value={projected}
            className="text-4xl font-black text-cyan-400"
          />
          <p className="text-sm text-slate-400 mt-1">PROJECTED TOTAL</p>
        </div>
        <div className="text-center">
          <AnimatedCounter
            value={DEMO.gotvGoal}
            className="text-4xl font-black text-slate-300"
          />
          <p className="text-sm text-slate-400 mt-1">VOTE GOAL</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Display 3: Volunteer Leaderboard ──────────────────────────────── */

function VolunteerLeaderboardDisplay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black">VOLUNTEER LEADERBOARD</h1>
        <p className="text-slate-400">Top 10 by Doors Knocked</p>
      </div>

      <LayoutGroup>
        <div className="space-y-3">
          {DEMO.volunteers.map((vol, i) => {
            const isTop3 = i < 3;
            const medalColors = ["text-amber-400", "text-slate-300", "text-amber-600"];

            return (
              <motion.div
                key={vol.name}
                layout
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`rounded-xl p-5 flex items-center justify-between ${
                  isTop3 ? "bg-white/10 border border-white/10" : "bg-white/5"
                }`}
              >
                <div className="flex items-center gap-5">
                  <span
                    className={`text-3xl font-black w-12 text-center ${
                      isTop3 ? medalColors[i] : "text-slate-500"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                    {vol.avatar}
                  </div>
                  <span className="text-xl font-semibold">{vol.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 h-3 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(vol.doors / DEMO.volunteers[0].doors) * 100}%` }}
                      transition={{ delay: i * 0.08 + 0.3, duration: 0.8 }}
                    />
                  </div>
                  <AnimatedCounter
                    value={vol.doors}
                    duration={1}
                    className="text-3xl font-black tabular-nums min-w-[80px] text-right"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </motion.div>
  );
}

/* ─── Display 4: Results Night ──────────────────────────────────────── */

function ResultsNightDisplay() {
  const total = DEMO.candidate.votes + DEMO.opponent.votes;
  const candPercent = (DEMO.candidate.votes / total) * 100;
  const oppPercent = (DEMO.opponent.votes / total) * 100;
  const isLeading = DEMO.candidate.votes > DEMO.opponent.votes;
  const margin = Math.abs(DEMO.candidate.votes - DEMO.opponent.votes);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0B1120] text-white p-8 flex flex-col"
    >
      {isLeading && <Confetti />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">ELECTION NIGHT</h1>
          <p className="text-slate-400 mt-1">
            Polls Reporting: <span className="text-white font-bold">{DEMO.pollsReporting}</span> of{" "}
            <span className="text-white font-bold">{DEMO.pollsTotal}</span>
          </p>
        </div>
        {isLeading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-6 py-3"
          >
            <p className="text-emerald-400 text-2xl font-black">LEADING +{margin.toLocaleString()}</p>
          </motion.div>
        )}
      </div>

      {/* Candidate bars */}
      <div className="flex-1 flex flex-col justify-center gap-10 max-w-5xl mx-auto w-full">
        {/* Our candidate */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm text-emerald-400 font-semibold uppercase tracking-wider">
                {isLeading ? "LEADING" : ""}
              </p>
              <p className="text-3xl font-black">{DEMO.candidate.name}</p>
            </div>
            <AnimatedCounter
              value={DEMO.candidate.votes}
              className="text-5xl font-black tabular-nums text-emerald-400"
            />
          </div>
          <div className="h-16 rounded-xl bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-xl"
              initial={{ width: 0 }}
              animate={{ width: `${candPercent}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
          <p className="text-right text-slate-400 mt-1">{candPercent.toFixed(1)}%</p>
        </div>

        {/* Opponent */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <p className="text-3xl font-black text-slate-300">{DEMO.opponent.name}</p>
            <AnimatedCounter
              value={DEMO.opponent.votes}
              className="text-5xl font-black tabular-nums text-red-400"
            />
          </div>
          <div className="h-16 rounded-xl bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-xl"
              initial={{ width: 0 }}
              animate={{ width: `${oppPercent}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
          <p className="text-right text-slate-400 mt-1">{oppPercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* Poll feed */}
      <div className="border-t border-white/10 pt-4 mt-8">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/5 rounded-lg px-4 py-2 text-sm whitespace-nowrap"
            >
              Poll {String(i + 1).padStart(3, "0")} <span className="text-emerald-400">reported</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Display 5: Social Wall ────────────────────────────────────────── */

function SocialWallDisplay() {
  const columns = [0, 1, 2] as const;
  const getColumnPosts = (col: number) =>
    DEMO.socialPosts.filter((_, i) => i % 3 === col);

  const sourceIcon = (source: "twitter" | "instagram") =>
    source === "twitter" ? "X" : "IG";

  const sourceColor = (source: "twitter" | "instagram") =>
    source === "twitter" ? "text-sky-400" : "text-pink-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black">SOCIAL WALL</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-sky-400">X / Twitter</span>
          <span className="text-pink-400">Instagram</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 items-start">
        {columns.map((col) => (
          <div key={col} className="space-y-4">
            {getColumnPosts(col).map((post, i) => (
              <motion.div
                key={`${col}-${i}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: col * 0.1 + i * 0.2 }}
                className="rounded-xl bg-white/5 border border-white/10 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      post.source === "twitter" ? "bg-sky-400/20 text-sky-400" : "bg-pink-400/20 text-pink-400"
                    }`}
                  >
                    {sourceIcon(post.source)}
                  </span>
                  <span className={`text-sm font-medium ${sourceColor(post.source)}`}>
                    {post.author}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">{post.time}</span>
                </div>
                <p className="text-lg leading-relaxed">{post.text}</p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Display 6: Fundraising Thermometer ────────────────────────────── */

function FundraisingThermometerDisplay() {
  const percent = Math.round((DEMO.fundraised / DEMO.fundraiseGoal) * 100);
  const [donorOffset, setDonorOffset] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDonorOffset((p) => p + 1), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8 grid md:grid-cols-[auto_1fr] gap-16 items-center"
    >
      {/* Thermometer */}
      <div className="flex flex-col items-center">
        <ThermometerSVG percent={percent} />
        <p className="mt-4 text-2xl font-black text-emerald-400">{percent}%</p>
      </div>

      {/* Stats + Donor ticker */}
      <div className="flex flex-col gap-10">
        <div>
          <p className="text-sm text-emerald-400 uppercase tracking-widest font-semibold">FUNDRAISING</p>
          <div className="mt-4">
            <AnimatedCounter
              value={DEMO.fundraised}
              prefix="$"
              className="text-[80px] leading-none font-black"
            />
          </div>
          <p className="text-2xl text-slate-400 mt-2">
            of <span className="text-slate-300 font-bold">${DEMO.fundraiseGoal.toLocaleString()}</span> goal
          </p>
        </div>

        {/* Donor ticker */}
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">RECENT DONORS</p>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {DEMO.recentDonors.slice(donorOffset % DEMO.recentDonors.length).concat(
                DEMO.recentDonors.slice(0, donorOffset % DEMO.recentDonors.length),
              )
                .slice(0, 5)
                .map((donor) => (
                  <motion.div
                    key={`${donor.name}-${donor.amount}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between bg-white/5 rounded-xl px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {donor.name[0]}
                      </div>
                      <span className="text-lg font-medium">{donor.name}</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-400">${donor.amount}</span>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Display 7: Election Day Ops ───────────────────────────────────── */

function ElectionDayOpsDisplay() {
  const votedPercent = Math.round((DEMO.gotvVoted / DEMO.gotvTotal) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0A1628] text-white p-8 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black">ELECTION DAY OPS</h1>
          <p className="text-blue-400 text-sm mt-1">COMMAND CENTER</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">POLLS CLOSE IN</p>
          <CountdownClock targetDate={DEMO.pollCloseTime} />
        </div>
      </div>

      {/* Hero: Voted tracker */}
      <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
        <p className="text-sm text-emerald-400 uppercase tracking-widest font-semibold mb-2">
          SUPPORTERS VOTED
        </p>
        <AnimatedCounter
          value={DEMO.gotvVoted}
          className="text-[80px] leading-none font-black"
        />
        <p className="text-xl text-slate-400 mt-2">
          of {DEMO.gotvTotal.toLocaleString()} identified supporters
        </p>
        <div className="max-w-2xl mx-auto mt-4">
          <ProgressBar percent={votedPercent} />
        </div>
        <p className="text-emerald-400 font-bold text-lg mt-2">{votedPercent}%</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
        {([
          { label: "VOLUNTEER CHECK-INS", value: DEMO.volunteerCheckins, color: "text-amber-400" },
          { label: "TURFS COVERED", value: DEMO.turfs, color: "text-cyan-400" },
          { label: "CALLS MADE", value: DEMO.calls, color: "text-blue-400" },
          { label: "TEXTS SENT", value: DEMO.texts, color: "text-purple-400" },
          { label: "DOORS KNOCKED", value: DEMO.doorsKnocked, color: "text-emerald-400" },
          { label: "ACTIVE VOLUNTEERS", value: DEMO.volunteerCount, color: "text-pink-400" },
          { label: "POLLS REPORTING", value: DEMO.pollsReporting, color: "text-orange-400" },
          { label: "TOTAL POLLS", value: DEMO.pollsTotal, color: "text-slate-300" },
        ] as const).map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 rounded-xl p-5"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <AnimatedCounter
              value={stat.value}
              className={`text-4xl font-black mt-2 block ${stat.color}`}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Main TV Mode Client ───────────────────────────────────────────── */

export default function TvModeClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const rotation = Number(searchParams?.get("rotation") || 25);
  const initialMode = searchParams?.get("mode") as TvMode | null;

  const initialIndex = initialMode
    ? MODES.findIndex((m) => m.id === initialMode)
    : 0;

  const [modeIndex, setModeIndex] = useState(Math.max(0, initialIndex));
  const [paused, setPaused] = useState(false);

  const mode = MODES[modeIndex]?.id ?? "war-room";

  // Auto-rotation
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setModeIndex((prev) => (prev + 1) % MODES.length);
    }, Math.max(10, rotation) * 1000);
    return () => window.clearInterval(timer);
  }, [paused, rotation]);

  // Keyboard shortcuts
  const handleKey = useCallback((event: KeyboardEvent) => {
    if (event.code === "Space") {
      event.preventDefault();
      setPaused((prev) => !prev);
    } else if (event.key === "ArrowRight") {
      setModeIndex((prev) => (prev + 1) % MODES.length);
    } else if (event.key === "ArrowLeft") {
      setModeIndex((prev) => (prev - 1 + MODES.length) % MODES.length);
    } else if (event.key.toLowerCase() === "f") {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen();
      } else {
        void document.exitFullscreen();
      }
    } else if (event.key === "Escape") {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
    } else if (/^[1-7]$/.test(event.key)) {
      setModeIndex(Number(event.key) - 1);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const renderDisplay = () => {
    switch (mode) {
      case "war-room":
        return <WarRoomDisplay slug={slug} />;
      case "gotv-tracker":
        return <GOTVTrackerDisplay />;
      case "volunteer-leaderboard":
        return <VolunteerLeaderboardDisplay />;
      case "results-night":
        return <ResultsNightDisplay />;
      case "social-wall":
        return <SocialWallDisplay />;
      case "fundraising-thermometer":
        return <FundraisingThermometerDisplay />;
      case "election-day-ops":
        return <ElectionDayOpsDisplay />;
      default:
        return <WarRoomDisplay slug={slug} />;
    }
  };

  return (
    <div className="bg-[#0A1628] min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div key={mode}>
          {renderDisplay()}
        </motion.div>
      </AnimatePresence>

      {/* HUD overlay */}
      <div className="fixed left-4 bottom-4 rounded-xl bg-black/80 backdrop-blur-sm px-4 py-3 text-xs text-white border border-white/10 z-40">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
          <span className="font-semibold">{MODES[modeIndex].label}</span>
          {paused && <span className="text-amber-400">(PAUSED)</span>}
        </div>
        <p className="text-slate-400">
          {modeIndex + 1}/{MODES.length} &middot; {rotation}s rotation
        </p>
        <p className="text-slate-500 mt-1">
          Space: pause &middot; 1-7: jump &middot; F: fullscreen &middot; Esc: exit
        </p>
      </div>

      {/* Mode indicator dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-40">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setModeIndex(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === modeIndex ? "bg-white scale-125" : "bg-white/30 hover:bg-white/50"
            }`}
            title={m.label}
          />
        ))}
      </div>
    </div>
  );
}
