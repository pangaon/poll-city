"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

const GREEN = "#1D9E75";
const NAVY = "#0A2342";
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

interface Option {
  id: string;
  text: string;
}

interface TimelineRadarVoterProps {
  pollId: string;
  question: string;
  options: Option[];
  onVoted: (receipt: string) => void;
}

interface AverageResult {
  id: string;
  text: string;
  avgValue: number | null;
  count: number;
}

export default function TimelineRadarVoter({ pollId, question, options, onVoted }: TimelineRadarVoterProps) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(options.map((o) => [o.id, 5]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [avgResults, setAvgResults] = useState<AverageResult[] | null>(null);

  function setRating(id: string, value: number) {
    setRatings((prev) => ({ ...prev, [id]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ratingPayload = options.map((o) => ({ optionId: o.id, value: ratings[o.id] ?? 5 }));
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: ratingPayload }),
      });
      const data = await res.json();
      if (res.ok) {
        const code: string = data.data?.receipt ?? "";
        setReceipt(code);
        onVoted(code);
        // Fetch averages if enough votes
        try {
          const r2 = await fetch(`/api/polls/${pollId}/respond`);
          const d2 = await r2.json();
          if (r2.ok && Array.isArray(d2.data?.results)) {
            const results = d2.data.results as AverageResult[];
            if (results.some((r) => r.count >= 10)) {
              setAvgResults(results);
            }
          }
        } catch { /* non-fatal */ }
      } else {
        setSubmitError(data.error ?? "Something went wrong");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Radar data for submitted values
  const submittedChartData = options.map((o) => ({
    subject: o.text.length > 14 ? o.text.slice(0, 13) + "…" : o.text,
    You: ratings[o.id] ?? 5,
    ...(avgResults
      ? { Average: avgResults.find((r) => r.id === o.id)?.avgValue ?? 0 }
      : {}),
  }));

  if (receipt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="space-y-5"
      >
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-semibold text-emerald-800">Your vote has been recorded</p>
          <p className="font-mono text-lg font-bold tracking-widest text-emerald-700">{receipt}</p>
          <p className="text-xs text-emerald-500">Keep this code to verify your vote was counted.</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500 text-center mb-3">Your ratings</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={submittedChartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: NAVY }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Radar name="You" dataKey="You" stroke={GREEN} fill={GREEN} fillOpacity={0.3} strokeWidth={2} />
              {avgResults && (
                <Radar name="Average" dataKey="Average" stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 2" />
              )}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          {avgResults && (
            <p className="text-xs text-center text-gray-400 mt-1">Dashed = community average</p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="font-medium text-gray-800 text-base">{question}</p>

      <div className="space-y-4">
        {options.map((opt) => {
          const val = ratings[opt.id] ?? 5;
          return (
            <div key={opt.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0 truncate" title={opt.text}>
                {opt.text}
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={val}
                onChange={(e) => setRating(opt.id, Number(e.target.value))}
                className="flex-1 accent-[#1D9E75] h-2 cursor-pointer"
              />
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: "#EFF9F5", color: NAVY }}
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">Rate each dimension from 0 (none) to 10 (maximum).</p>

      <AnimatePresence>
        {submitError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2"
          >
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={spring}>
        <Button
          onClick={submit}
          disabled={submitting}
          loading={submitting}
          className="w-full min-h-[44px]"
          style={{ backgroundColor: GREEN }}
        >
          <Check className="w-4 h-4" /> Submit Ratings
        </Button>
      </motion.div>
    </div>
  );
}
