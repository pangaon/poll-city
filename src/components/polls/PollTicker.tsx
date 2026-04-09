"use client";

/**
 * PollTicker — horizontal scrolling strip showing live active polls.
 *
 * Usage:
 *   <PollTicker campaignId="..." />          // campaign polls
 *   <PollTicker />                            // public polls
 *
 * Rotates every 5 s. Clicking an item navigates to the poll detail.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronRight, ChevronLeft } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

interface TickerPoll {
  id: string;
  question: string;
  type: string;
  totalResponses: number;
  leadingLabel?: string;
  leadingPct?: number;
  leadingColor?: string;
}

interface PollTickerProps {
  campaignId?: string;
  autoRotateMs?: number;
  className?: string;
  onPollClick?: (pollId: string) => void;
}

const TYPE_SHORT: Record<string, string> = {
  binary: "Yes/No",
  multiple_choice: "Choice",
  ranked: "Ranked",
  slider: "Slider",
  swipe: "Swipe",
  image_swipe: "Swipe",
  flash_poll: "Flash",
  nps: "NPS",
  word_cloud: "Words",
  timeline_radar: "Radar",
  emoji_react: "React",
  priority_rank: "Priority",
};

export default function PollTicker({
  campaignId,
  autoRotateMs = 5000,
  className = "",
  onPollClick,
}: PollTickerProps) {
  const router = useRouter();
  const [polls, setPolls] = useState<TickerPoll[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "10", page: "1" });
      if (campaignId) params.set("campaignId", campaignId);
      const res = await fetch(`/api/polls?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      const rows: TickerPoll[] = await Promise.all(
        (data.data ?? []).slice(0, 10).map(async (p: { id: string; question: string; type: string; totalResponses: number }) => {
          // Fetch top result for display
          let leadingLabel: string | undefined;
          let leadingPct: number | undefined;
          let leadingColor: string | undefined;

          try {
            const rr = await fetch(`/api/polls/${p.id}/respond`);
            if (rr.ok) {
              const rd = await rr.json();
              const { results, type } = rd.data ?? {};
              if (type === "binary" && Array.isArray(results) && results.length > 0) {
                const total = results.reduce((s: number, r: { _count: number }) => s + r._count, 0) || 1;
                const best = [...results].sort((a: { _count: number }, b: { _count: number }) => b._count - a._count)[0] as { value: string; _count: number };
                leadingLabel = best.value === "yes" ? "Yes" : "No";
                leadingPct = Math.round((best._count / total) * 100);
                leadingColor = best.value === "yes" ? "#10B981" : "#EF4444";
              } else if (type === "multiple_choice" && Array.isArray(results) && results.length > 0) {
                const best = [...results].sort((a: { count: number }, b: { count: number }) => b.count - a.count)[0] as { text: string; count: number };
                const total = results.reduce((s: number, r: { count: number }) => s + r.count, 0) || 1;
                leadingLabel = best.text.length > 16 ? best.text.slice(0, 15) + "…" : best.text;
                leadingPct = Math.round((best.count / total) * 100);
                leadingColor = GREEN;
              } else if (type === "slider" && results && typeof results.average === "number") {
                leadingLabel = `Avg ${Math.round(results.average)}`;
                leadingPct = Math.round(results.average);
                leadingColor = AMBER;
              }
            }
          } catch { /* skip result fetch errors */ }

          return {
            id: p.id,
            question: p.question,
            type: p.type,
            totalResponses: p.totalResponses,
            leadingLabel,
            leadingPct,
            leadingColor,
          };
        })
      );

      setPolls(rows.filter((r) => r !== null));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Auto-rotate
  useEffect(() => {
    if (polls.length === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % polls.length);
    }, autoRotateMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polls.length, autoRotateMs]);

  function prev() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((c) => (c - 1 + polls.length) % polls.length);
  }

  function next() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((c) => (c + 1) % polls.length);
  }

  function handleClick(pollId: string) {
    if (onPollClick) onPollClick(pollId);
    else router.push(`/polls/${pollId}`);
  }

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gray-100 h-14 ${className}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    );
  }

  if (polls.length === 0) return null;

  const poll = polls[current];

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border border-gray-100 bg-white shadow-sm px-4 h-14 overflow-hidden cursor-pointer select-none ${className}`}
      style={{ borderLeft: `3px solid ${NAVY}` }}
      onClick={() => handleClick(poll.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick(poll.id)}
    >
      {/* Live badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <BarChart3 className="w-3.5 h-3.5" style={{ color: NAVY }} />
      </div>

      {/* Scrolling text */}
      <div className="flex-1 min-w-0 relative overflow-hidden h-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 w-full"
          >
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${NAVY}15`, color: NAVY }}
            >
              {TYPE_SHORT[poll.type] ?? poll.type}
            </span>
            <p className="text-sm font-medium text-gray-800 truncate flex-1">
              {poll.question}
            </p>
            {poll.leadingLabel && poll.leadingPct !== undefined && (
              <span
                className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${poll.leadingColor}20`, color: poll.leadingColor }}
              >
                {poll.leadingLabel} · {poll.leadingPct}%
              </span>
            )}
            <span className="flex-shrink-0 text-xs text-gray-400">
              {poll.totalResponses.toLocaleString()} votes
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav controls */}
      {polls.length > 1 && (
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={prev}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-300 w-6 text-center">
            {current + 1}/{polls.length}
          </span>
          <button
            onClick={next}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
