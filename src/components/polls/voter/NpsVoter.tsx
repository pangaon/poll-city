"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";

const GREEN = "#1D9E75";
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

function scoreColor(n: number): { bg: string; text: string; border: string; solid: string } {
  if (n <= 6) return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", solid: "bg-red-500" };
  if (n <= 8) return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", solid: "bg-amber-500" };
  return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", solid: "bg-emerald-500" };
}

function Shimmer() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="relative overflow-hidden w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ))}
    </div>
  );
}

interface NpsVoterProps {
  pollId: string;
  question: string;
  onVoted: (receipt: string) => void;
}

export default function NpsVoter({ pollId, question, onVoted }: NpsVoterProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        const code: string = data.data?.receipt ?? "";
        setReceipt(code);
        onVoted(code);
      } else {
        setError(data.error ?? "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="font-semibold text-emerald-800">Your vote has been recorded</p>
        <p className="text-sm text-emerald-600">Receipt code</p>
        <p className="font-mono text-lg font-bold tracking-widest text-emerald-700">{receipt}</p>
        <p className="text-xs text-emerald-500">Keep this code to verify your vote was counted.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="font-medium text-gray-800 text-base">{question}</p>

      {submitting ? (
        <Shimmer />
      ) : (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => {
            const c = scoreColor(n);
            const isSelected = selected === n;
            return (
              <motion.button
                key={n}
                type="button"
                animate={{ scale: isSelected ? 1.1 : 1 }}
                whileHover={{ scale: isSelected ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={spring}
                onClick={() => setSelected(n)}
                className={`w-12 h-12 rounded-xl border-2 font-bold text-sm transition-colors flex-shrink-0 ${
                  isSelected
                    ? `${c.solid} border-transparent text-white shadow-md`
                    : `${c.bg} ${c.text} ${c.border} hover:opacity-80`
                }`}
              >
                {n}
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-400">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={spring}>
        <Button
          onClick={submit}
          disabled={selected === null || submitting}
          loading={submitting}
          className="w-full min-h-[44px]"
          style={{ backgroundColor: selected !== null ? GREEN : undefined }}
        >
          <Check className="w-4 h-4" /> Submit Score
        </Button>
      </motion.div>
    </div>
  );
}
