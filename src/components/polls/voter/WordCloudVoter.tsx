"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { Button, Input } from "@/components/ui";

const GREEN = "#1D9E75";
const NAVY = "#0A2342";
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };
const MAX_WORDS = 3;
const CLOUD_COLORS = [NAVY, GREEN, "#475569", "#1D4ED8", "#0E7490", "#15803D"];

interface WordResult {
  word: string;
  count: number;
}

function WordCloud({ words }: { words: WordResult[] }) {
  if (words.length === 0) return null;
  const maxCount = Math.max(...words.map((w) => w.count));
  const minCount = Math.min(...words.map((w) => w.count));
  const range = maxCount - minCount || 1;

  return (
    <div className="flex flex-wrap gap-3 justify-center py-4 px-2">
      {words.map((w, i) => {
        const ratio = (w.count - minCount) / range;
        const fontSize = Math.round(12 + ratio * 36); // 12px–48px
        const rotation = ((i * 7) % 31) - 15; // deterministic -15 to +15
        const color = CLOUD_COLORS[i % CLOUD_COLORS.length];
        return (
          <motion.span
            key={w.word}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            style={{ fontSize: `${fontSize}px`, transform: `rotate(${rotation}deg)`, color, lineHeight: 1.2 }}
            className="font-bold select-none"
          >
            {w.word}
          </motion.span>
        );
      })}
    </div>
  );
}

interface WordCloudVoterProps {
  pollId: string;
  question: string;
  onVoted: (receipt: string) => void;
}

export default function WordCloudVoter({ pollId, question, onVoted }: WordCloudVoterProps) {
  const [words, setWords] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [cloudWords, setCloudWords] = useState<WordResult[]>([]);

  function validateWord(raw: string): string | null {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
    if (cleaned.length < 2) return "Word must be at least 2 characters (letters and numbers only).";
    if (cleaned.length > 30) return "Word must be 30 characters or fewer.";
    return null;
  }

  function addWord() {
    const cleaned = input.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const err = validateWord(cleaned);
    if (err) { setInputError(err); return; }
    if (words.includes(cleaned)) { setInputError("You already added that word."); return; }
    if (words.length >= MAX_WORDS) { setInputError(`Maximum ${MAX_WORDS} words allowed.`); return; }
    setWords((prev) => [...prev, cleaned]);
    setInput("");
    setInputError(null);
  }

  function removeWord(w: string) {
    setWords((prev) => prev.filter((x) => x !== w));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addWord(); }
  }

  async function submit() {
    if (words.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (res.ok) {
        const code: string = data.data?.receipt ?? "";
        setReceipt(code);
        onVoted(code);
        // Fetch word cloud results to display
        try {
          const r2 = await fetch(`/api/polls/${pollId}/respond`);
          const d2 = await r2.json();
          if (r2.ok && Array.isArray(d2.data?.results)) {
            setCloudWords(d2.data.results.slice(0, 20) as WordResult[]);
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

        {cloudWords.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-400 text-center mb-3">Top responses so far</p>
            <WordCloud words={cloudWords} />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="font-medium text-gray-800 text-base">{question}</p>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setInputError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a word..."
          disabled={words.length >= MAX_WORDS || submitting}
          error={inputError ?? undefined}
          className="flex-1"
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          onClick={addWord}
          disabled={words.length >= MAX_WORDS || submitting}
          className="px-4 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
          style={{ backgroundColor: GREEN }}
        >
          <Plus className="w-4 h-4" /> Add
        </motion.button>
      </div>

      <AnimatePresence>
        {words.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap gap-2"
          >
            {words.map((w) => (
              <motion.span
                key={w}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{ backgroundColor: "#EFF9F5", color: NAVY, borderColor: "#A7F3D0" }}
              >
                {w}
                <button
                  type="button"
                  onClick={() => removeWord(w)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-400">
        {words.length}/{MAX_WORDS} words added. Separate words individually for best results.
      </p>

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
          disabled={words.length === 0 || submitting}
          loading={submitting}
          className="w-full min-h-[44px]"
          style={{ backgroundColor: words.length > 0 ? GREEN : undefined }}
        >
          <Check className="w-4 h-4" /> Submit Words
        </Button>
      </motion.div>
    </div>
  );
}
