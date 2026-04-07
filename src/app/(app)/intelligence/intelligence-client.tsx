"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, TrendingDown, Activity, ShieldCheck,
  BarChart3, Eye, Minus,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";

/* ── palette ────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const POSITIVE = GREEN;
const NEUTRAL = AMBER;
const NEGATIVE = RED;

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ──────────────────────────────────────────────────── */
interface ApprovalEntry {
  date: string;
  rating: number;
}

interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

interface SignalPoint {
  date: string;
  count: number;
}

interface IntelligenceData {
  officialName: string;
  currentRating: number;
  velocity: "up" | "down" | "flat";
  trend30: ApprovalEntry[];
  trend60: ApprovalEntry[];
  trend90: ApprovalEntry[];
  sentiment: SentimentBreakdown;
  signalVolume: SignalPoint[];
  totalSignals: number;
}

/* ── shimmer ────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

/* ── main ───────────────────────────────────────────────────── */
export default function IntelligenceClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<"30" | "60" | "90">("30");

  useEffect(() => {
    // Simulate fetching ATLAS data — use real endpoint when available
    const timer = setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [campaignId]);

  const trendData = useMemo(() => {
    if (!data) return [];
    if (trendRange === "60") return data.trend60;
    if (trendRange === "90") return data.trend90;
    return data.trend30;
  }, [data, trendRange]);

  const sentimentPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Positive", value: data.sentiment.positive, color: POSITIVE },
      { name: "Neutral", value: data.sentiment.neutral, color: NEUTRAL },
      { name: "Negative", value: data.sentiment.negative, color: NEGATIVE },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 max-w-5xl mx-auto">
        <Shimmer className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
        </div>
        <Shimmer className="h-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Shimmer className="h-64" />
          <Shimmer className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const VelocityIcon = data.velocity === "up" ? TrendingUp : data.velocity === "down" ? TrendingDown : Minus;
  const velocityColor = data.velocity === "up" ? GREEN : data.velocity === "down" ? RED : AMBER;
  const velocityLabel = data.velocity === "up" ? "Trending Up" : data.velocity === "down" ? "Trending Down" : "Flat";

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>ATLAS Intelligence</h1>
          <p className="text-sm text-gray-500">Public sentiment analysis for {data.officialName}</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Approval Rating</p>
            <Eye className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-3xl font-bold" style={{ color: NAVY }}>{data.currentRating}%</p>
          <p className="text-xs text-gray-500 mt-1">Current public approval</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Signal Volume</p>
            <Activity className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-3xl font-bold" style={{ color: NAVY }}>{data.totalSignals.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Signals collected</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Velocity</p>
            <VelocityIcon className="w-4 h-4" style={{ color: velocityColor }} />
          </div>
          <div className="flex items-center gap-2">
            <VelocityIcon className="w-7 h-7" style={{ color: velocityColor }} />
            <p className="text-xl font-bold" style={{ color: velocityColor }}>{velocityLabel}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">30-day momentum</p>
        </motion.div>
      </div>

      {/* Approval Trend */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Approval Trend</h2>
            <p className="text-xs text-gray-500">Rating over time</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(["30", "60", "90"] as const).map(range => (
              <button
                key={range}
                onClick={() => setTrendRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[34px]",
                  trendRange === range ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(value) => [`${value}%`, "Rating"]}
              />
              <Line type="monotone" dataKey="rating" stroke={NAVY} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Signal Volume + Sentiment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Signal Volume</h2>
          <p className="text-xs text-gray-500 mb-4">Signals collected over time</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.signalVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke={GREEN} fill={GREEN} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.25 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Sentiment Breakdown</h2>
          <p className="text-xs text-gray-500 mb-4">Positive / Neutral / Negative</p>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sentimentPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(value) => [`${value}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {sentimentPieData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-gray-600">{s.name} {s.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
      >
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Privacy Notice</p>
          <p className="text-xs text-gray-500 mt-0.5">
            All data anonymized. Minimum 100 actors per published aggregate. Individual responses are never stored or attributable.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── mock data generator ────────────────────────────────────── */
function generateMockData(): IntelligenceData {
  const today = new Date();
  function daysAgo(n: number) {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  function trendLine(days: number, base: number) {
    const points: ApprovalEntry[] = [];
    let val = base;
    for (let i = days; i >= 0; i--) {
      val = Math.max(20, Math.min(80, val + (Math.random() - 0.48) * 3));
      points.push({ date: daysAgo(i), rating: Math.round(val) });
    }
    return points;
  }

  function signalLine(days: number) {
    const points: SignalPoint[] = [];
    for (let i = days; i >= 0; i--) {
      points.push({ date: daysAgo(i), count: Math.floor(Math.random() * 150 + 50) });
    }
    return points;
  }

  const trend30 = trendLine(30, 55);
  const trend60 = trendLine(60, 52);
  const trend90 = trendLine(90, 50);
  const current = trend30[trend30.length - 1].rating;
  const prev = trend30[trend30.length - 8]?.rating ?? current;

  return {
    officialName: "Mayor Olivia Chow",
    currentRating: current,
    velocity: current > prev + 2 ? "up" : current < prev - 2 ? "down" : "flat",
    trend30,
    trend60,
    trend90,
    sentiment: { positive: 42, neutral: 31, negative: 27 },
    signalVolume: signalLine(30),
    totalSignals: 8421,
  };
}
