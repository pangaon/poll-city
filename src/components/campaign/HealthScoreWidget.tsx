"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { CampaignHealthResult } from "@/lib/campaign/health-score";

const NAVY = "#0A2342";

interface Props {
  campaignId: string;
}

export default function HealthScoreWidget({ campaignId }: Props) {
  const [data, setData] = useState<CampaignHealthResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/campaign/health?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((json: { data: CampaignHealthResult }) => {
        setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-3" />
        <div className="h-3 w-48 bg-gray-200 rounded mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  const GradeIcon =
    data.grade === "excellent" || data.grade === "strong"
      ? CheckCircle
      : data.grade === "moderate"
      ? TrendingUp
      : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4" style={{ color: NAVY }} />
        <span className="text-sm font-semibold" style={{ color: NAVY }}>
          Campaign Health
        </span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
            <circle
              cx="36" cy="36" r="28"
              fill="none" stroke="#f1f5f9" strokeWidth="8"
            />
            <motion.circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke={data.gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 28}
              initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - data.overall / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black" style={{ color: NAVY }}>
              {data.overall}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-1.5"
            style={{ backgroundColor: `${data.gradeColor}20`, color: data.gradeColor }}
          >
            <GradeIcon className="w-3 h-3" />
            {data.grade.charAt(0).toUpperCase() + data.grade.slice(1)}
          </div>
          <p className="text-xs text-gray-500 leading-snug">{data.headline}</p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="mt-4 space-y-2">
        {data.dimensions.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-500 truncate">{dim.label}</span>
              <span
                className="text-xs font-semibold ml-2 flex-shrink-0"
                style={{
                  color:
                    dim.score >= 70 ? "#1D9E75" :
                    dim.score >= 40 ? "#EF9F27" : "#E24B4A",
                }}
              >
                {dim.score}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    dim.score >= 70 ? "#1D9E75" :
                    dim.score >= 40 ? "#EF9F27" : "#E24B4A",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Updated {new Date(data.computedAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </motion.div>
  );
}
