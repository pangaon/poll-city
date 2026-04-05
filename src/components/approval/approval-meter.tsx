"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface ApprovalData {
  score: number;
  netScore: number;
  trend: "rising" | "falling" | "flat";
  trendAmount: number;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  updatedAt: string;
  history: Array<{ score: number; netScore: number; recordedAt: string }>;
}

interface Props {
  officialId: string;
  size?: "sm" | "md" | "lg";
  showSparkline?: boolean;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

function getColour(score: number): { bg: string; ring: string; text: string } {
  if (score >= 76) return { bg: "from-emerald-400 to-emerald-600", ring: "ring-emerald-500", text: "text-emerald-700" };
  if (score >= 56) return { bg: "from-green-400 to-green-600", ring: "ring-green-500", text: "text-green-700" };
  if (score >= 36) return { bg: "from-amber-400 to-amber-600", ring: "ring-amber-500", text: "text-amber-700" };
  return { bg: "from-red-400 to-red-600", ring: "ring-red-500", text: "text-red-700" };
}

export function ApprovalMeter({
  officialId,
  size = "md",
  showSparkline = true,
  showDetails = true,
  autoRefresh = true,
}: Props) {
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/officials/${officialId}/approval`);
        if (res.ok) {
          const body = await res.json();
          setData(body.data);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();

    if (!autoRefresh) return;
    const interval = setInterval(load, 60_000); // 60s refresh
    return () => clearInterval(interval);
  }, [officialId, autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-4 text-xs text-gray-400">
        No approval data
      </div>
    );
  }

  const colours = getColour(data.score);
  const sizeConfig = {
    sm: { ring: 80, stroke: 8, font: "text-xl", labelFont: "text-[10px]" },
    md: { ring: 140, stroke: 12, font: "text-4xl", labelFont: "text-xs" },
    lg: { ring: 200, stroke: 16, font: "text-6xl", labelFont: "text-sm" },
  }[size];

  const circumference = 2 * Math.PI * (sizeConfig.ring / 2 - sizeConfig.stroke);
  const offset = circumference * (1 - data.score / 100);

  return (
    <div className="flex flex-col items-center">
      {/* Circular gauge */}
      <div className="relative" style={{ width: sizeConfig.ring, height: sizeConfig.ring }}>
        <svg width={sizeConfig.ring} height={sizeConfig.ring} className="-rotate-90">
          <circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={sizeConfig.ring / 2 - sizeConfig.stroke}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={sizeConfig.stroke}
          />
          <circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={sizeConfig.ring / 2 - sizeConfig.stroke}
            fill="none"
            strokeWidth={sizeConfig.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-700 ${
              data.score >= 76 ? "stroke-emerald-500" :
              data.score >= 56 ? "stroke-green-500" :
              data.score >= 36 ? "stroke-amber-500" : "stroke-red-500"
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${sizeConfig.font} font-extrabold ${colours.text}`}>
            {Math.round(data.score)}
          </span>
          <span className={`${sizeConfig.labelFont} text-gray-500 font-semibold -mt-1`}>
            / 100
          </span>
        </div>
        {autoRefresh && (
          <div className="absolute top-1 right-1 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-600">LIVE</span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 text-center">
          <p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1">
            Approval Rating
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="How this is calculated"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </p>
          {showTooltip && (
            <div className="absolute z-50 mt-1 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl text-left">
              <p className="font-semibold mb-1">Live weighted score:</p>
              <ul className="space-y-0.5 text-gray-300">
                <li>• Poll votes (40%)</li>
                <li>• Support signals (25%)</li>
                <li>• Question sentiment (15%)</li>
                <li>• Follow/unfollow (10%)</li>
                <li>• Canvassing data (10%)</li>
              </ul>
              <p className="text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700">
                Recalculates on every new signal.
              </p>
            </div>
          )}
          <p className={`text-xs font-semibold mt-0.5 ${
            data.netScore > 0 ? "text-emerald-600" : data.netScore < 0 ? "text-red-600" : "text-gray-500"
          }`}>
            {data.netScore > 0 ? "+" : ""}{data.netScore.toFixed(1)} net
          </p>

          {/* Trend */}
          <div className="flex items-center justify-center gap-1 mt-1.5">
            {data.trend === "rising" && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
            {data.trend === "falling" && <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
            {data.trend === "flat" && <Minus className="w-3.5 h-3.5 text-gray-400" />}
            <span className={`text-xs font-semibold ${
              data.trend === "rising" ? "text-emerald-600" :
              data.trend === "falling" ? "text-red-600" : "text-gray-500"
            }`}>
              {data.trendAmount > 0 ? "+" : ""}{data.trendAmount.toFixed(1)} pts this week
            </span>
          </div>

          <p className="text-[10px] text-gray-400 mt-1">
            Based on {data.totalSignals.toLocaleString()} signal{data.totalSignals !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Sparkline */}
      {showSparkline && data.history.length > 1 && (
        <div className="mt-3 w-full max-w-[200px] h-10">
          <Sparkline history={data.history} />
        </div>
      )}
    </div>
  );
}

function Sparkline({ history }: { history: Array<{ score: number; recordedAt: string }> }) {
  if (history.length < 2) return null;
  const width = 200;
  const height = 40;
  const min = Math.min(...history.map((h) => h.score));
  const max = Math.max(...history.map((h) => h.score));
  const range = max - min || 1;

  const points = history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((h.score - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const latest = history[history.length - 1].score;
  const first = history[0].score;
  const trending = latest >= first ? "stroke-emerald-500" : "stroke-red-500";

  return (
    <svg width={width} height={height} className="w-full h-full">
      <polyline
        points={points}
        fill="none"
        className={trending}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
