"use client";

/* EventSource is a browser global — declare for TypeScript */
declare var EventSource: {
  new (url: string): {
    onmessage: ((e: MessageEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    close: () => void;
    readonly readyState: number;
  };
  readonly OPEN: 0;
  readonly CONNECTING: 1;
  readonly CLOSED: 2;
};

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const GREEN = "#1D9E75";
const NAVY = "#0A2342";
const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
const CLOUD_COLORS = [NAVY, GREEN, "#475569", "#1D4ED8", "#0E7490", "#15803D"];

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}
      />
      {live ? "LIVE" : "Reconnecting…"}
    </span>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const motionVal = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [value, motionVal]);

  return <span>{display.toLocaleString()}</span>;
}

// Word cloud from array of { word, count }
function WordCloud({ words }: { words: { word: string; count: number }[] }) {
  if (!words.length) return null;
  const maxCount = Math.max(...words.map((w) => w.count));
  const minCount = Math.min(...words.map((w) => w.count));
  const range = maxCount - minCount || 1;
  return (
    <div className="flex flex-wrap gap-3 justify-center py-4 px-2">
      {words.map((w, i) => {
        const ratio = (w.count - minCount) / range;
        const fontSize = Math.round(12 + ratio * 36);
        const rotation = ((i * 7) % 31) - 15;
        const color = CLOUD_COLORS[i % CLOUD_COLORS.length];
        return (
          <motion.span
            key={w.word}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            style={{ fontSize, transform: `rotate(${rotation}deg)`, color, lineHeight: 1.2 }}
            className="font-bold select-none"
          >
            {w.word}
          </motion.span>
        );
      })}
    </div>
  );
}

// ── Result renderers ──────────────────────────────────────────────

function BinaryResults({ results }: { results: { value: string; _count: number }[] }) {
  const total = results.reduce((s, r) => s + r._count, 0) || 1;
  const yesRow = results.find((r) => r.value === "yes");
  const noRow = results.find((r) => r.value === "no");
  const yesPct = Math.round(((yesRow?._count ?? 0) / total) * 100);
  const noPct = Math.round(((noRow?._count ?? 0) / total) * 100);
  return (
    <div className="space-y-3">
      {[
        { label: "Yes", pct: yesPct, color: "#10B981" },
        { label: "No", pct: noPct, color: "#EF4444" },
      ].map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
            <span>{row.label}</span>
            <span>{row.pct}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${row.pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MultiChoiceResults({ results }: { results: { id: string; text: string; _count: { responses: number } }[] }) {
  const data = results.map((r, i) => ({ name: r.text, count: r._count.responses, fill: CHART_COLORS[i % CHART_COLORS.length] }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function NpsResults({ results }: { results: { promoters: number; passives: number; detractors: number; npsScore: number; total: number } }) {
  const { promoters, passives, detractors, npsScore, total } = results;
  const t = total || 1;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">NPS Score</p>
        <motion.p
          key={npsScore}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-5xl font-black"
          style={{ color: npsScore >= 0 ? GREEN : "#EF4444" }}
        >
          {npsScore > 0 ? `+${npsScore}` : npsScore}
        </motion.p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Detractors", count: detractors, color: "#EF4444", range: "0–6" },
          { label: "Passives", count: passives, color: "#F59E0B", range: "7–8" },
          { label: "Promoters", count: promoters, color: GREEN, range: "9–10" },
        ].map((z) => (
          <div key={z.label} className="rounded-xl p-3" style={{ backgroundColor: `${z.color}15` }}>
            <p className="text-xs text-gray-500">{z.label}</p>
            <p className="text-xl font-bold" style={{ color: z.color }}>{Math.round((z.count / t) * 100)}%</p>
            <p className="text-xs text-gray-400">{z.range}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderResults({ results }: { results: { average: number | null; count: number } }) {
  const avg = results.average ?? 0;
  const pct = (avg / 100) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Average score</span>
        <span className="font-bold text-gray-900">{avg.toFixed(1)}</span>
      </div>
      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: GREEN }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

function BarResults({ results }: { results: { id?: string; text: string; count?: number; avgValue?: number | null }[] }) {
  const data = results.map((r, i) => ({
    name: r.text.length > 16 ? r.text.slice(0, 15) + "…" : r.text,
    value: r.count ?? Math.round((r.avgValue ?? 0) * 10) / 10,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RadarResults({ results }: { results: { id?: string; text: string; avgValue: number | null }[] }) {
  const data = results.map((r) => ({
    subject: r.text.length > 14 ? r.text.slice(0, 13) + "…" : r.text,
    value: r.avgValue ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: NAVY }} />
        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
        <Radar name="Average" dataKey="value" stroke={GREEN} fill={GREEN} fillOpacity={0.35} strokeWidth={2} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────

interface LiveResultsStreamProps {
  pollId: string;
  pollType: string;
  initialTotal: number;
}

interface StreamMessage {
  totalResponses: number;
  results: unknown;
  hasMinVotes: boolean;
}

export default function LiveResultsStream({ pollId, pollType, initialTotal }: LiveResultsStreamProps) {
  const [total, setTotal] = useState(initialTotal);
  const [results, setResults] = useState<unknown>(null);
  const [hasMinVotes, setHasMinVotes] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const esRef = useRef<ReturnType<typeof EventSource.prototype.close> | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function fetchFallback() {
    fetch(`/api/polls/${pollId}/results/stream`).catch(() => {});
  }

  useEffect(() => {
    let es: InstanceType<typeof EventSource> | null = null;

    function connect() {
      es = new EventSource(`/api/polls/${pollId}/results/stream`);

      es.onmessage = (e: MessageEvent) => {
        try {
          const msg: StreamMessage = JSON.parse(e.data);
          setTotal(msg.totalResponses);
          setResults(msg.results);
          setHasMinVotes(msg.hasMinVotes);
          setIsLive(true);
          setReconnecting(false);
        } catch { /* skip malformed frames */ }
      };

      es.onerror = () => {
        es?.close();
        setIsLive(false);
        setReconnecting(true);
        // Fallback: poll every 10s
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            fetchFallback();
          }, 10_000);
        }
        // Try reconnect after 5s
        setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      es?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  function renderResults() {
    if (!results) return null;

    if (pollType === "binary") {
      return <BinaryResults results={results as { value: string; _count: number }[]} />;
    }
    if (pollType === "multiple_choice") {
      return <MultiChoiceResults results={results as { id: string; text: string; _count: { responses: number } }[]} />;
    }
    if (pollType === "nps") {
      return <NpsResults results={results as { promoters: number; passives: number; detractors: number; npsScore: number; total: number }} />;
    }
    if (pollType === "word_cloud") {
      return <WordCloud words={results as { word: string; count: number }[]} />;
    }
    if (pollType === "slider") {
      return <SliderResults results={results as { average: number | null; count: number }} />;
    }
    if (pollType === "timeline_radar") {
      return <RadarResults results={results as { id?: string; text: string; avgValue: number | null }[]} />;
    }
    if (pollType === "ranked") {
      return <BarResults results={results as { text: string; count: number; avgRank: number | null }[]} />;
    }
    // fallback bar chart
    if (Array.isArray(results)) {
      return <BarResults results={results as { text: string; count: number }[]} />;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Total responses</span>
          <span className="text-xl font-bold text-gray-900">
            <AnimatedCounter value={total} />
          </span>
        </div>
        <LiveBadge live={isLive && !reconnecting} />
      </div>

      {/* Results body */}
      <AnimatePresence mode="wait">
        {!hasMinVotes ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 py-6"
          >
            <p className="text-center text-sm text-gray-400 mb-4">
              Waiting for more responses before showing results
            </p>
            <Shimmer className="h-4 w-3/4 mx-auto" />
            <Shimmer className="h-4 w-1/2 mx-auto" />
            <Shimmer className="h-4 w-2/3 mx-auto" />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderResults()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
