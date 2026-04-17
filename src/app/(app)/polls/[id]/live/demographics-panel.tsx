"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";

const GREEN = "#1D9E75";
const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#F97316"];

interface DemoData {
  byWard: { ward: string; count: number }[];
  byRiding: { riding: string; count: number }[];
  trend: { day: string; count: number }[];
}

function MiniBar({
  label,
  items,
  dataKey,
}: {
  label: string;
  items: { count: number }[];
  dataKey: string;
}) {
  const height = Math.min(items.length * 32 + 24, 320);
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={items} layout="vertical" margin={{ left: 4, right: 24, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey={dataKey}
            width={96}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {items.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DemographicsPanel({ pollId }: { pollId: string }) {
  const [data, setData] = useState<DemoData | null>(null);

  useEffect(() => {
    fetch(`/api/polls/${pollId}/demographics`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DemoData | null) => setData(d))
      .catch(() => {});
  }, [pollId]);

  if (!data) return null;

  const hasWard = data.byWard.length > 0;
  const hasRiding = data.byRiding.length > 0;
  const hasTrend = data.trend.length > 1;

  if (!hasWard && !hasRiding && !hasTrend) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6"
    >
      {(hasWard || hasRiding) && (
        <div className="space-y-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Geographic breakdown
          </h3>

          {hasWard && (
            <MiniBar
              label="By ward"
              items={data.byWard}
              dataKey="ward"
            />
          )}

          {hasRiding && (
            <MiniBar
              label="By riding"
              items={data.byRiding}
              dataKey="riding"
            />
          )}
        </div>
      )}

      {hasTrend && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" /> Response trend (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.trend} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={28}
              />
              <Tooltip
                labelFormatter={(v: unknown) => String(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={GREEN}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: GREEN }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
