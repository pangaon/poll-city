"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ArrowLeft, BarChart3, Check, CheckCircle, ChevronLeft, ChevronRight,
  Clock, Copy, EyeOff, Globe, GripVertical, Lock, Share2,
  ThumbsDown, ThumbsUp, Users, Search, ExternalLink,
  Star, Sparkles, HelpCircle, Pencil, Archive, XCircle, Plus, X,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@/components/ui";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

/* ── Types ────────────────────────────────────────────────────── */

interface PollOption {
  id: string;
  text: string;
  order: number;
}

interface PollData {
  id: string;
  question: string;
  description: string | null;
  type: string;
  visibility: string;
  targetRegion: string | null;
  totalResponses: number;
  isActive: boolean;
  endsAt: string | null;
  startsAt: string;
  createdAt: string;
  tags: string[];
  options: PollOption[];
}

type ResultsData = {
  poll: PollData;
  results: unknown;
  type: string;
};

/* ── Constants ────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

/* ── Shimmer skeleton ─────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/* ── Status helpers ───────────────────────────────────────────── */

function getStatus(poll: PollData): "active" | "ended" | "scheduled" {
  if (poll.endsAt && new Date(poll.endsAt) < new Date()) return "ended";
  if (new Date(poll.startsAt) > new Date()) return "scheduled";
  return "active";
}

function StatusPill({ poll }: { poll: PollData }) {
  const s = getStatus(poll);
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    ended: "bg-gray-100 text-gray-500",
    scheduled: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[s]}`}>
      {s === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {s === "active" ? "Active" : s === "ended" ? "Ended" : "Scheduled"}
    </span>
  );
}

/* ── Binary Vote UI ───────────────────────────────────────────── */

function BinaryVote({ onVote, disabled }: { onVote: (v: string) => void; disabled: boolean }) {
  return (
    <div className="flex gap-4">
      {[
        { value: "yes", label: "Yes", icon: ThumbsUp, color: "bg-emerald-500 hover:bg-emerald-600" },
        { value: "no", label: "No", icon: ThumbsDown, color: "bg-red-500 hover:bg-red-600" },
      ].map((opt) => (
        <motion.button
          key={opt.value}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => onVote(opt.value)}
          className={`flex-1 py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 ${opt.color} disabled:opacity-50 min-h-[56px]`}
        >
          <opt.icon className="w-5 h-5" />
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}

/* ── Multiple Choice Vote UI ──────────────────────────────────── */

function MultipleChoiceVote({ options, onVote, disabled }: { options: PollOption[]; onVote: (optionId: string) => void; disabled: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {options.map((opt, i) => (
        <motion.button
          key={opt.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => setSelected(opt.id)}
          className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all min-h-[52px] flex items-center gap-3 ${
            selected === opt.id
              ? "border-[#1D9E75] bg-emerald-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              selected === opt.id ? "border-[#1D9E75] bg-[#1D9E75]" : "border-gray-300"
            }`}
          >
            {selected === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="font-medium text-gray-800">{opt.text}</span>
        </motion.button>
      ))}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            onClick={() => onVote(selected)}
            disabled={disabled}
            className="w-full mt-2 min-h-[44px]"
            style={{ backgroundColor: GREEN }}
          >
            <Check className="w-4 h-4" /> Submit Vote
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/* ── Ranked Vote UI (drag reorder) ────────────────────────────── */

function RankedVote({ options, onVote, disabled }: { options: PollOption[]; onVote: (ranked: { optionId: string; rank: number }[]) => void; disabled: boolean }) {
  const [items, setItems] = useState(options.map((o) => ({ ...o })));

  function submit() {
    onVote(items.map((item, i) => ({ optionId: item.id, rank: i + 1 })));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-2">Drag to reorder by preference (top = most preferred).</p>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
        {items.map((item, i) => (
          <Reorder.Item
            key={item.id}
            value={item}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200 cursor-grab active:cursor-grabbing shadow-sm min-h-[52px]"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
              {i + 1}
            </span>
            <span className="font-medium text-gray-800 flex-1">{item.text}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
        <Button onClick={submit} disabled={disabled} className="w-full mt-2 min-h-[44px]" style={{ backgroundColor: GREEN }}>
          <Check className="w-4 h-4" /> Submit Ranking
        </Button>
      </motion.div>
    </div>
  );
}

/* ── Slider Vote UI ───────────────────────────────────────────── */

function SliderVote({ onVote, disabled }: { onVote: (value: number) => void; disabled: boolean }) {
  const [value, setValue] = useState(50);
  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-5xl font-black" style={{ color: NAVY }}>{value}</span>
        <span className="text-gray-400 text-lg ml-1">/ 100</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[#1D9E75]"
        style={{ background: `linear-gradient(to right, ${GREEN} ${value}%, #e5e7eb ${value}%)` }}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
        <Button onClick={() => onVote(value)} disabled={disabled} className="w-full min-h-[44px]" style={{ backgroundColor: GREEN }}>
          <Check className="w-4 h-4" /> Submit Rating
        </Button>
      </motion.div>
    </div>
  );
}

/* ── Swipe Vote UI ────────────────────────────────────────────── */

function SwipeVote({ options, onVote, disabled }: { options: PollOption[]; onVote: (responses: { optionId: string; direction: string }[]) => void; disabled: boolean }) {
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<{ optionId: string; direction: string }[]>([]);
  const opt = options[current];

  function swipe(direction: "left" | "right") {
    if (!opt) return;
    const newResponses = [...responses, { optionId: opt.id, direction }];
    setResponses(newResponses);
    if (current + 1 >= options.length) {
      onVote(newResponses);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  if (!opt) return null;

  return (
    <div className="space-y-4">
      <div className="text-center text-xs text-gray-400 mb-2">
        {current + 1} of {options.length}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={opt.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white border-2 border-gray-200 rounded-3xl p-8 text-center min-h-[120px] flex items-center justify-center"
        >
          <p className="text-lg font-bold text-gray-900">{opt.text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => swipe("left")}
          className="flex-1 py-4 rounded-2xl bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          <ChevronLeft className="w-5 h-5" /> Nope
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => swipe("right")}
          className="flex-1 py-4 rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          Yes <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

/* ── Image Swipe Vote UI ──────────────────────────────────────── */

function ImageSwipeVote({ options, onVote, disabled }: { options: PollOption[]; onVote: (responses: { optionId: string; direction: string }[]) => void; disabled: boolean }) {
  // Same as swipe but with image-style cards
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<{ optionId: string; direction: string }[]>([]);
  const opt = options[current];

  function swipe(direction: "left" | "right") {
    if (!opt) return;
    const newResponses = [...responses, { optionId: opt.id, direction }];
    setResponses(newResponses);
    if (current + 1 >= options.length) {
      onVote(newResponses);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  if (!opt) return null;

  return (
    <div className="space-y-4">
      <div className="text-center text-xs text-gray-400 mb-2">
        {current + 1} of {options.length}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={opt.id}
          initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotate: 3 }}
          className="bg-gradient-to-br from-[#0A2342] to-[#1D9E75] rounded-3xl p-8 text-center min-h-[160px] flex items-center justify-center shadow-lg"
        >
          <p className="text-xl font-bold text-white">{opt.text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => swipe("left")}
          className="flex-1 py-4 rounded-2xl bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          <ChevronLeft className="w-5 h-5" /> Pass
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => swipe("right")}
          className="flex-1 py-4 rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2 min-h-[52px]"
        >
          Like <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

/* ── Flash Poll (binary with timer feel) ──────────────────────── */

function FlashPollVote({ onVote, disabled }: { onVote: (v: string) => void; disabled: boolean }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
          <Clock className="w-3.5 h-3.5" /> Flash Poll — Vote Now!
        </span>
      </div>
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => onVote("yes")}
          className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 min-h-[56px] shadow-lg"
        >
          <ThumbsUp className="w-5 h-5" /> Yes
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          disabled={disabled}
          onClick={() => onVote("no")}
          className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-lg flex items-center justify-center gap-2 min-h-[56px] shadow-lg"
        >
          <ThumbsDown className="w-5 h-5" /> No
        </motion.button>
      </div>
    </div>
  );
}

/* ── Results: Binary ──────────────────────────────────────────── */

function BinaryResults({ results }: { results: { value: string | null; _count: number }[] }) {
  const yes = results.find((r) => r.value === "yes")?._count ?? 0;
  const no = results.find((r) => r.value === "no")?._count ?? 0;
  const total = yes + no;
  const yPct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const nPct = total > 0 ? Math.round((no / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {[
        { label: "Yes", count: yes, pct: yPct, color: "#10B981" },
        { label: "No", count: no, pct: nPct, color: "#EF4444" },
      ].map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-800">{r.label}</span>
            <span className="font-bold" style={{ color: r.color }}>{r.pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: r.color }}
            />
          </div>
          <p className="text-xs text-gray-400">{r.count} votes</p>
        </div>
      ))}
      <p className="text-sm text-gray-500 text-center pt-2">{total} total votes</p>
    </div>
  );
}

/* ── Results: Multiple Choice ─────────────────────────────────── */

function MultipleChoiceResults({ results }: { results: { id: string; text: string; count: number }[] }) {
  const total = results.reduce((s, r) => s + r.count, 0);
  const chartData = results.map((r, i) => ({
    name: r.text.length > 20 ? r.text.slice(0, 20) + "..." : r.text,
    votes: r.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {results.map((r, i) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="flex-1 text-sm text-gray-700 truncate">{r.text}</span>
              <span className="text-sm font-bold text-gray-900">{pct}%</span>
              <span className="text-xs text-gray-400 w-12 text-right">{r.count}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-gray-500 text-center">{total} total votes</p>
    </div>
  );
}

/* ── Results: Ranked ──────────────────────────────────────────── */

function RankedResults({ results }: { results: { id: string; text: string; count: number; avgRank: number | null }[] }) {
  return (
    <div className="space-y-3">
      {results.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
            {i + 1}
          </span>
          <span className="flex-1 font-medium text-gray-800">{r.text}</span>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">Avg: {r.avgRank?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-gray-400">{r.count} votes</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Results: Slider ──────────────────────────────────────────── */

function SliderResults({ results }: { results: { average: number | null; count: number } }) {
  const avg = results.average;
  return (
    <div className="text-center space-y-4">
      <div>
        <p className="text-6xl font-black" style={{ color: NAVY }}>{avg !== null ? avg.toFixed(1) : "—"}</p>
        <p className="text-gray-400 mt-1">Average rating</p>
      </div>
      {avg !== null && (
        <div className="mx-auto max-w-xs">
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${avg}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: GREEN }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500">{results.count} responses</p>
    </div>
  );
}

/* ── Results: Swipe ───────────────────────────────────────────── */

function SwipeResults({ results }: { results: { id: string; text: string; order: number; breakdown: { value: string | null; _count: number }[] }[] }) {
  return (
    <div className="space-y-4">
      {results.map((opt) => {
        const right = opt.breakdown.find((b) => b.value === "right")?._count ?? 0;
        const left = opt.breakdown.find((b) => b.value === "left")?._count ?? 0;
        const total = right + left;
        const pct = total > 0 ? Math.round((right / total) * 100) : 0;
        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-800">{opt.text}</span>
              <span className="font-bold" style={{ color: GREEN }}>{pct}% yes</span>
            </div>
            <div className="h-3 bg-red-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
            <p className="text-xs text-gray-400">{total} swipes</p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Edit Modal ───────────────────────────────────────────────── */

interface EditFormState {
  question: string;
  description: string;
  visibility: string;
  endsAt: string;
  tags: string;
}

function EditModal({ poll, onClose, onSaved }: { poll: PollData; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditFormState>({
    question: poll.question,
    description: poll.description ?? "",
    visibility: poll.visibility,
    endsAt: poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : "",
    tags: poll.tags.join(", "),
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        question: form.question.trim(),
        description: form.description.trim() || null,
        visibility: form.visibility,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
        return;
      }
      toast.success("Poll updated");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Edit Poll</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Question</Label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              maxLength={1000}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Visibility</Label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
              >
                <option value="public">Public</option>
                <option value="campaign_only">Campaign Only</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Close Date</Label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="housing, transit, budget"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || !form.question.trim()}
            style={{ backgroundColor: GREEN }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Visibility info helper ───────────────────────────────────── */

function VisibilityInfo({ visibility }: { visibility: string }) {
  const info = {
    public: { icon: Globe, label: "Public", desc: "Anyone can vote — also appears on Poll City Social", color: "text-blue-600" },
    campaign_only: { icon: Lock, label: "Campaign only", desc: "Only your campaign team members can vote", color: "text-amber-600" },
    unlisted: { icon: EyeOff, label: "Unlisted", desc: "Anyone with the direct link can vote", color: "text-gray-500" },
  }[visibility] ?? { icon: Globe, label: visibility, desc: "", color: "text-gray-500" };

  return (
    <span className={`text-xs flex items-center gap-1 ${info.color}`} title={info.desc}>
      <info.icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

/* ── Receipt Verification ─────────────────────────────────────── */

function ReceiptVerifier() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ found: boolean; votedAt?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function verify() {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/polls/verify-receipt?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      toast.error("Failed to verify receipt");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Enter your receipt code to verify your vote was counted.</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          className="flex-1 font-mono"
        />
        <Button onClick={verify} disabled={checking || !code.trim()} size="sm">
          {checking ? "..." : "Verify"}
        </Button>
      </div>
      {result && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl text-sm ${result.found ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {result.found
            ? `Vote verified. Cast on ${new Date(result.votedAt!).toLocaleString()}.`
            : "Receipt code not found. Check your code and try again."}
        </motion.div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function PollDetailClient({ pollId, campaignId, isManager }: { pollId: string; campaignId: string; isManager: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [voted, setVoted] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptTip, setShowReceiptTip] = useState(false);

  const poll = resultsData?.poll ?? null;

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`);
      if (!res.ok) throw new Error("Failed to load poll");
      const data = await res.json();
      setResultsData(data.data);
    } catch {
      toast.error("Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  async function submitVote(body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit vote");
        return;
      }
      setVoted(true);
      if (data.data?.receipt) {
        setReceipt(data.data.receipt);
        setShowReceipt(true);
      }
      toast.success("Vote recorded!");
      // Refresh results
      loadResults();
      // Fetch AI insight if poll has enough responses
      fetchInsight();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchInsight() {
    if (loadingInsight || aiInsight) return;
    setLoadingInsight(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/insight`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.insight) setAiInsight(data.insight);
      }
    } catch { /* silent — insight is optional */ } finally {
      setLoadingInsight(false);
    }
  }

  function getShareUrl() {
    const origin = window.location.origin;
    // Public and unlisted polls: voters go to the social-facing URL (no login required)
    // Campaign-only polls: share the campaign app URL (members need to log in)
    if (poll?.visibility === "campaign_only") return `${origin}/polls/${pollId}`;
    return `${origin}/social/polls/${pollId}`;
  }

  function handleShare() {
    const url = getShareUrl();
    if (navigator.share) {
      navigator.share({ title: poll?.question ?? "Poll City", url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Poll link copied!");
    }
  }

  async function patchPoll(updates: Record<string, unknown>) {
    const res = await fetch(`/api/polls/${pollId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Update failed");
      return false;
    }
    return true;
  }

  async function handleFeature() {
    if (!poll) return;
    // isFeatured not in PollData type so we PATCH and reload
    const ok = await patchPoll({ isFeatured: true });
    if (ok) { toast.success("Poll featured on the ticker"); loadResults(); }
  }

  async function handleClose() {
    const ok = await patchPoll({ closeNow: true });
    if (ok) { toast.success("Poll closed"); loadResults(); }
  }

  async function handleArchive() {
    const ok = await patchPoll({ isActive: false });
    if (ok) { toast.success("Poll archived"); router.push("/polls"); }
  }

  function handleBinaryVote(value: string) {
    submitVote({ value });
  }

  function handleMultipleChoiceVote(optionId: string) {
    submitVote({ optionId });
  }

  function handleRankedVote(ranked: { optionId: string; rank: number }[]) {
    submitVote({ rankedResponses: ranked });
  }

  function handleSliderVote(value: number) {
    submitVote({ value });
  }

  function handleSwipeVote(responses: { optionId: string; direction: string }[]) {
    submitVote({ swipeResponses: responses });
  }

  // Type mapping: flash_poll maps to binary API type
  const effectiveType = poll?.type === "flash_poll" ? "binary" : poll?.type;
  const isEnded = poll ? getStatus(poll) === "ended" : false;
  const canVote = !voted && !isEnded && !submitting;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Shimmer className="h-10 w-48" />
        <Shimmer className="h-6 w-96" />
        <Shimmer className="h-64 w-full" />
        <Shimmer className="h-40 w-full" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Poll not found</h2>
        <p className="text-gray-500 text-sm mb-6">This poll may have been removed or you don&apos;t have access.</p>
        <Button onClick={() => router.push("/polls")} variant="outline">
          <ArrowLeft className="w-4 h-4" /> Back to Polls
        </Button>
      </div>
    );
  }

  const TYPE_LABELS: Record<string, string> = {
    binary: "Yes / No",
    multiple_choice: "Multiple Choice",
    ranked: "Ranked Choice",
    slider: "Slider",
    swipe: "Swipe Cards",
    image_swipe: "Image Swipe",
    flash_poll: "Flash Poll",
    emoji_react: "Emoji React",
    priority_rank: "Priority Rank",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Back + primary actions row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.push("/polls")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Polls
        </motion.button>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 min-h-[36px]"
          >
            <Share2 className="w-4 h-4" /> Share
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/polls/${pollId}/live`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 min-h-[36px]"
          >
            <ExternalLink className="w-4 h-4" /> Live View
          </motion.button>
          {isManager && campaignId && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/polls/new")}
              className="flex items-center gap-1.5 text-sm text-white px-3 py-2 rounded-xl min-h-[36px]"
              style={{ backgroundColor: GREEN }}
            >
              <Plus className="w-4 h-4" /> New Poll
            </motion.button>
          )}
        </div>
      </div>

      {/* Management action bar — campaign managers only */}
      {isManager && campaignId && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-2xl bg-gray-50 border border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Manage:</span>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors min-h-[32px]"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}
            onClick={handleFeature}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-amber-400 hover:text-amber-600 transition-colors min-h-[32px]"
          >
            <Star className="w-3.5 h-3.5" /> Feature
          </motion.button>
          {!isEnded && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}
              onClick={handleClose}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-amber-400 hover:text-amber-600 transition-colors min-h-[32px]"
            >
              <XCircle className="w-3.5 h-3.5" /> Close Poll
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}
            onClick={() => { navigator.clipboard.writeText(getShareUrl()); toast.success("Voter link copied!"); }}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors min-h-[32px]"
          >
            <Share2 className="w-3.5 h-3.5" /> Copy Voter Link
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}
            onClick={handleArchive}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 px-3 py-1.5 rounded-lg bg-white border border-red-100 hover:bg-red-50 transition-colors min-h-[32px]"
          >
            <Archive className="w-3.5 h-3.5" /> Archive
          </motion.button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${GREEN}20`, color: GREEN }}>
            {TYPE_LABELS[poll.type] ?? poll.type.replace(/_/g, " ")}
          </span>
          <StatusPill poll={poll} />
          <VisibilityInfo visibility={poll.visibility} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>{poll.question}</h1>
        {poll.description && <p className="text-gray-500 mt-2">{poll.description}</p>}
        {poll.targetRegion && (
          <p className="text-xs text-gray-400 mt-2">Region: {poll.targetRegion}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {poll.totalResponses} votes</span>
          {poll.endsAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {isEnded ? "Ended" : "Ends"} {new Date(poll.endsAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Vote section */}
      {canVote && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: NAVY }}>Cast Your Vote</h2>
            {effectiveType === "binary" && poll.type !== "flash_poll" && (
              <BinaryVote onVote={handleBinaryVote} disabled={submitting} />
            )}
            {poll.type === "flash_poll" && (
              <FlashPollVote onVote={handleBinaryVote} disabled={submitting} />
            )}
            {effectiveType === "multiple_choice" && (
              <MultipleChoiceVote options={poll.options} onVote={handleMultipleChoiceVote} disabled={submitting} />
            )}
            {effectiveType === "ranked" && poll.options.length > 0 && (
              <RankedVote options={poll.options} onVote={handleRankedVote} disabled={submitting} />
            )}
            {effectiveType === "slider" && (
              <SliderVote onVote={handleSliderVote} disabled={submitting} />
            )}
            {effectiveType === "swipe" && (
              <SwipeVote options={poll.options} onVote={handleSwipeVote} disabled={submitting} />
            )}
            {effectiveType === "image_swipe" && (
              <ImageSwipeVote options={poll.options} onVote={handleSwipeVote} disabled={submitting} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Voted confirmation + receipt */}
      <AnimatePresence>
        {voted && receipt && showReceipt && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-800 mb-1">Vote Recorded</h3>
                    <p className="text-sm text-emerald-600 mb-3">Your anonymous vote has been counted. Save this receipt code to verify later.</p>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-white rounded-lg font-mono text-lg font-bold text-emerald-800 border border-emerald-200">
                        {receipt}
                      </code>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          navigator.clipboard.writeText(receipt);
                          toast.success("Receipt copied!");
                        }}
                        className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results section */}
      {(voted || isEnded) && resultsData && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                  <BarChart3 className="w-5 h-5" /> Live Results
                </h2>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={loadResults}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 min-h-[44px] px-2"
                >
                  Refresh
                </motion.button>
              </div>

              {(effectiveType === "binary" || poll.type === "flash_poll") && (
                <BinaryResults results={resultsData.results as { value: string | null; _count: number }[]} />
              )}
              {effectiveType === "multiple_choice" && (
                <MultipleChoiceResults results={resultsData.results as { id: string; text: string; count: number }[]} />
              )}
              {effectiveType === "ranked" && (
                <RankedResults results={resultsData.results as { id: string; text: string; count: number; avgRank: number | null }[]} />
              )}
              {effectiveType === "slider" && (
                <SliderResults results={resultsData.results as { average: number | null; count: number }} />
              )}
              {(effectiveType === "swipe" || effectiveType === "image_swipe") && (
                <SwipeResults results={resultsData.results as { id: string; text: string; order: number; breakdown: { value: string | null; _count: number }[] }[]} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Insight — shows after voting when results have enough responses */}
      <AnimatePresence>
        {(loadingInsight || aiInsight) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}05` }}>
              <CardContent className="pt-5 pb-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: NAVY }}>
                  <Sparkles className="w-4 h-4" style={{ color: GREEN }} /> AI Analysis
                </h3>
                {loadingInsight ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-full" />
                    <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-4/5" />
                    <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-3/5" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt verification */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3 gap-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Search className="w-4 h-4" /> Verify Your Vote
            </h3>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowReceiptTip((v) => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                aria-label="What is this?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showReceiptTip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93 }}
                    transition={spring}
                    className="absolute right-0 top-7 z-50 w-72 bg-gray-900 text-white text-xs rounded-2xl p-4 shadow-xl leading-relaxed"
                  >
                    <p className="font-semibold mb-1.5">Why anonymous receipts?</p>
                    <p className="text-gray-300">Poll City never records who you are or what you voted. Your receipt code is proof your vote was counted — without linking it to your identity. It works like a paper ballot stub: confirms your participation, reveals nothing about your choice.</p>
                    <p className="text-gray-400 mt-2">Enter your code here anytime to confirm it appears in our records.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <ReceiptVerifier />
        </CardContent>
      </Card>

      {/* Tags */}
      {poll.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {poll.tags.map((tag) => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {showEditModal && poll && (
          <EditModal
            poll={poll}
            onClose={() => setShowEditModal(false)}
            onSaved={loadResults}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
