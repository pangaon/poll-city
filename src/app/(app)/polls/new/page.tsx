"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Check, BarChart3,
  Eye, EyeOff, Calendar, Bell, RefreshCw, Lock, Globe, Zap,
  GripVertical, Sliders, Image, ThumbsUp, List, SortAsc,
  Star, Cloud, Activity, Hash, MessageSquare,
} from "lucide-react";
import { Button, Card, CardContent, FormField, Input, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";

/* ── Constants ────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

/* ── Types ────────────────────────────────────────────────────── */
interface PollOption {
  id: string;
  text: string;
  color: string;
}

interface FormState {
  question: string;
  description: string;
  type: string;
  options: PollOption[];
  visibility: string;
  endsAt: string;
  targetRegion: string;
  allowMultipleVotes: boolean;
  showResultsBeforeEnd: boolean;
  notifySubscribers: boolean;
  tags: string;
}

/* ── Option colors ────────────────────────────────────────────── */
const OPTION_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

/* ── Poll types (11 total) ────────────────────────────────────── */
const POLL_TYPES = [
  { value: "binary",          label: "Yes / No",         desc: "Simple binary choice",          icon: ThumbsUp },
  { value: "multiple_choice", label: "Multiple Choice",  desc: "Pick one from several",          icon: List },
  { value: "ranked",          label: "Ranked Choice",    desc: "Drag to rank by preference",     icon: SortAsc },
  { value: "slider",          label: "Slider (0-100)",   desc: "Rate on a numeric scale",        icon: Sliders },
  { value: "swipe",           label: "Swipe Cards",      desc: "Swipe left/right to vote",       icon: ChevronRight },
  { value: "image_swipe",     label: "Image Swipe",      desc: "Swipe on visual cards",          icon: Image },
  { value: "flash_poll",      label: "Flash Poll",       desc: "Quick yes/no with urgency",      icon: Zap },
  { value: "nps",             label: "NPS Score",        desc: "0–10 likelihood rating",         icon: Star },
  { value: "word_cloud",      label: "Word Cloud",       desc: "Voters contribute words",        icon: Cloud },
  { value: "timeline_radar",  label: "Radar / Timeline", desc: "Rate multiple dimensions",       icon: Activity },
  { value: "emoji_react",     label: "Emoji React",      desc: "Emoji reaction voting",          icon: MessageSquare },
  { value: "priority_rank",   label: "Priority Rank",    desc: "Prioritise from a list",         icon: Hash },
];

const NEEDS_OPTIONS = new Set(["multiple_choice", "ranked", "swipe", "image_swipe", "timeline_radar", "priority_rank"]);

/* ── Step indicator ───────────────────────────────────────────── */
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        animate={{
          scale: active ? 1.1 : 1,
          backgroundColor: done || active ? GREEN : "#f3f4f6",
        }}
        transition={spring}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ color: done || active ? "#fff" : "#9ca3af" }}
      >
        {done ? <Check className="w-4 h-4" /> : step}
      </motion.div>
      <span className={`text-xs font-medium hidden sm:block ${active ? "text-[#1D9E75]" : done ? "text-gray-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Step 1: Type Selection + Question ────────────────────────── */
function Step1({ form, onChange }: { form: FormState; onChange: (k: keyof FormState, v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>Choose poll type</h2>
        <p className="text-gray-500 text-sm">Select the type that best fits your question.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {POLL_TYPES.map((t) => (
          <motion.button
            key={t.value}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => onChange("type", t.value)}
            className={`text-left p-3 rounded-2xl border-2 transition-all min-h-[88px] ${
              form.type === t.value
                ? "border-[#1D9E75] bg-emerald-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <t.icon className={`w-5 h-5 mb-1.5 ${form.type === t.value ? "text-[#1D9E75]" : "text-gray-400"}`} />
            <p className={`text-sm font-semibold ${form.type === t.value ? "text-[#0A2342]" : "text-gray-800"}`}>{t.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
          </motion.button>
        ))}
      </div>

      <FormField
        label="Question"
        required
        help={{
          content: "The main question voters will answer. Write it neutrally — leading questions skew your data.",
          example: "Do you support adding protected bike lanes on Main Street?",
          tip: "Keep it to one clear question. Compound questions confuse voters and produce unreliable results.",
        }}
        hint="5–500 characters. Be specific about your ward or community."
      >
        <Textarea
          value={form.question}
          onChange={(e) => onChange("question", e.target.value)}
          placeholder="e.g. Do you support expanding protected bike lanes on Main Street?"
          className="text-base resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{form.question.length}/500</p>
      </FormField>

      <FormField
        label="Description (optional)"
        help={{
          content: "Extra context voters see below the question. Use this to explain why you're asking or provide relevant background.",
          example: "The city is reviewing its cycling infrastructure plan this fall. Your input will be shared with the ward councillor.",
        }}
        hint="Keep it brief. 1–2 sentences is enough."
      >
        <Textarea
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="e.g. The city is reviewing its 2026 cycling plan. Your answer helps shape our position."
          rows={2}
        />
      </FormField>
    </motion.div>
  );
}

/* ── Step 2: Options ──────────────────────────────────────────── */
function Step2({ form, setOptions }: { form: FormState; setOptions: (opts: PollOption[]) => void }) {
  function addOption() {
    const idx = form.options.length;
    setOptions([...form.options, { id: crypto.randomUUID(), text: "", color: OPTION_COLORS[idx % OPTION_COLORS.length] }]);
  }
  function removeOption(id: string) {
    setOptions(form.options.filter((o) => o.id !== id));
  }
  function updateText(id: string, text: string) {
    setOptions(form.options.map((o) => (o.id === id ? { ...o, text } : o)));
  }
  function updateColor(id: string, color: string) {
    setOptions(form.options.map((o) => (o.id === id ? { ...o, color } : o)));
  }
  // Drag reorder
  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (fromIndex === toIndex) return;
    const items = [...form.options];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    setOptions(items);
  }

  if (!NEEDS_OPTIONS.has(form.type)) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-12">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">No options needed</p>
        <p className="text-gray-400 text-sm mt-1">
          <strong className="capitalize">{form.type.replace(/_/g, " ")}</strong> polls don&apos;t require custom options.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>Add your options</h2>
        <p className="text-gray-500 text-sm">Add choices voters can select. Drag to reorder.</p>
      </div>

      <div className="space-y-3">
        {form.options.map((opt, i) => (
          <motion.div
            key={opt.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            draggable
            onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, i)}
            onDragOver={(e) => (e as unknown as React.DragEvent).preventDefault()}
            onDrop={(e) => handleDrop(e as unknown as React.DragEvent, i)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm overflow-hidden">
                <input
                  type="color"
                  value={opt.color}
                  onChange={(e) => updateColor(opt.id, e.target.value)}
                  className="w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer opacity-0 absolute"
                />
                <div className="w-full h-full rounded-full" style={{ backgroundColor: opt.color }} />
              </div>
            </div>
            <span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
              {i + 1}
            </span>
            <Input
              value={opt.text}
              onChange={(e) => updateText(opt.id, e.target.value)}
              placeholder={i === 0 ? "e.g. Strongly support" : i === 1 ? "e.g. Strongly oppose" : `Option ${i + 1}`}
              className="flex-1"
            />
            <button
              onClick={() => removeOption(opt.id)}
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        onClick={addOption}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all flex items-center justify-center gap-2 min-h-[48px]"
      >
        <Plus className="w-4 h-4" /> Add option
      </motion.button>

      {form.options.length < 2 && (
        <p className="text-sm text-amber-600 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Add at least 2 options to proceed.
        </p>
      )}
    </motion.div>
  );
}

/* ── Step 3: Settings ─────────────────────────────────────────── */
function Step3({ form, onChange, onToggle }: {
  form: FormState;
  onChange: (k: keyof FormState, v: string) => void;
  onToggle: (k: "allowMultipleVotes" | "showResultsBeforeEnd" | "notifySubscribers") => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>Poll settings</h2>
        <p className="text-gray-500 text-sm">Configure visibility, schedule, and behaviour.</p>
      </div>

      {/* Visibility */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Visibility</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "public", label: "Public", icon: Globe, desc: "Anyone can vote" },
            { value: "campaign_only", label: "Campaign", icon: Lock, desc: "Members only" },
            { value: "unlisted", label: "Unlisted", icon: EyeOff, desc: "Link access only" },
          ].map((v) => (
            <motion.button
              key={v.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={() => onChange("visibility", v.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-h-[100px] ${
                form.visibility === v.value
                  ? "border-[#1D9E75] bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <v.icon className={`w-5 h-5 ${form.visibility === v.value ? "text-[#1D9E75]" : "text-gray-400"}`} />
              <div className="text-center">
                <p className={`text-sm font-semibold ${form.visibility === v.value ? "text-[#0A2342]" : "text-gray-700"}`}>{v.label}</p>
                <p className="text-xs text-gray-400">{v.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* End date */}
      <FormField
        label="End date (optional)"
        help={{
          content: "When the poll stops accepting votes. Leave blank to keep it open indefinitely.",
          tip: "Closing a poll creates urgency. A 3–7 day window works well for most campaign polls.",
        }}
        hint="Voters will see a countdown once a closing date is set."
      >
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => onChange("endsAt", e.target.value)}
            className="pl-10"
          />
        </div>
      </FormField>

      {/* Target region */}
      <FormField
        label="Target region (optional)"
        help={{
          content: "Limit this poll to voters in a specific area. Useful if the issue only affects part of your ward.",
          example: "Toronto Ward 12, Ottawa East, Scarborough North",
        }}
        hint="Free text — enter the area name as you want it displayed."
      >
        <Input
          value={form.targetRegion}
          onChange={(e) => onChange("targetRegion", e.target.value)}
          placeholder="e.g. Toronto Ward 12"
        />
      </FormField>

      {/* Tags */}
      <FormField
        label="Tags (optional)"
        help={{
          content: "Keywords that describe what this poll is about. Used to filter and group polls on your dashboard.",
          example: "municipal, transit, infrastructure, housing",
          tip: "Use consistent tags across polls so you can compare results on related topics.",
        }}
        hint="Separate tags with commas."
      >
        <Input
          value={form.tags}
          onChange={(e) => onChange("tags", e.target.value)}
          placeholder="e.g. transit, infrastructure, ward-12 (comma separated)"
        />
      </FormField>

      {/* Toggles */}
      <div className="space-y-3">
        {[
          { key: "showResultsBeforeEnd" as const, label: "Show results before poll closes", desc: "Voters can see results after voting", icon: Eye },
          { key: "allowMultipleVotes" as const, label: "Allow multiple votes", desc: "Voters can change their vote", icon: RefreshCw },
          { key: "notifySubscribers" as const, label: "Notify subscribers", desc: "Send notification to campaign subscribers", icon: Bell },
        ].map((toggle) => (
          <motion.div
            key={toggle.key}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors min-h-[60px]"
            onClick={() => onToggle(toggle.key)}
          >
            <div className="flex items-center gap-3">
              <toggle.icon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{toggle.label}</p>
                <p className="text-xs text-gray-400">{toggle.desc}</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form[toggle.key] ? "bg-[#1D9E75]" : "bg-gray-200"}`}>
              <motion.div
                animate={{ left: form[toggle.key] ? 22 : 2 }}
                transition={spring}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Step 4: Preview ──────────────────────────────────────────── */
function Step4({ form }: { form: FormState }) {
  const typeDef = POLL_TYPES.find((t) => t.value === form.type);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>Preview your poll</h2>
        <p className="text-gray-500 text-sm">Here&apos;s how your poll will look to voters.</p>
      </div>

      {/* Card preview */}
      <div className="rounded-3xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, ${GREEN})` }}>
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full capitalize">
            {typeDef?.label ?? form.type}
          </span>
          <span className="text-white/60 text-xs capitalize">{form.visibility.replace("_", " ")}</span>
        </div>
        <h3 className="font-black text-xl leading-snug mb-2">
          {form.question || <span className="opacity-50 italic">Your question will appear here</span>}
        </h3>
        {form.description && <p className="text-white/70 text-sm mb-4">{form.description}</p>}
        {form.options.length > 0 && (
          <div className="space-y-2 mt-4">
            {form.options.slice(0, 4).map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                <span className="text-sm font-medium">{opt.text || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
        {(form.type === "binary" || form.type === "flash_poll") && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1 py-3 bg-emerald-500/80 rounded-2xl text-center font-bold text-sm">Yes</div>
            <div className="flex-1 py-3 bg-red-500/80 rounded-2xl text-center font-bold text-sm">No</div>
          </div>
        )}
        {form.type === "slider" && (
          <div className="mt-4">
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-1/2" />
            </div>
            <div className="flex justify-between text-white/60 text-xs mt-1">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        )}
        {form.type === "nps" && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">{i}</div>
            ))}
          </div>
        )}
        {form.type === "word_cloud" && (
          <div className="mt-4 flex flex-wrap gap-2 opacity-70">
            {["policy", "economy", "housing", "transit", "tax"].map((w) => (
              <span key={w} className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">{w}</span>
            ))}
          </div>
        )}
        {form.type === "timeline_radar" && form.options.length > 0 && (
          <div className="mt-4 space-y-2">
            {form.options.slice(0, 3).map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-xs text-white/70 w-20 truncate">{opt.text || "Dimension"}</span>
                <div className="flex-1 h-2 bg-white/20 rounded-full">
                  <div className="h-full bg-white/60 rounded-full w-1/2" />
                </div>
                <span className="text-xs text-white/70">5</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
        <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Type</p>
            <p className="font-medium text-gray-800 capitalize">{form.type.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Visibility</p>
            <p className="font-medium text-gray-800 capitalize">{form.visibility.replace(/_/g, " ")}</p>
          </div>
          {form.options.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs">Options</p>
              <p className="font-medium text-gray-800">{form.options.length} choices</p>
            </div>
          )}
          {form.endsAt && (
            <div>
              <p className="text-gray-400 text-xs">Closes</p>
              <p className="font-medium text-gray-800">{new Date(form.endsAt).toLocaleDateString()}</p>
            </div>
          )}
          {form.targetRegion && (
            <div>
              <p className="text-gray-400 text-xs">Region</p>
              <p className="font-medium text-gray-800">{form.targetRegion}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main wizard ──────────────────────────────────────────────── */
function NewPollInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string>("");

  // Pre-fill from AI suggestion query params
  const aiQuestion = searchParams?.get("question") ?? "";
  const aiDescription = searchParams?.get("description") ?? "";
  const aiType = searchParams?.get("type") ?? "binary";
  const aiTags = searchParams?.get("tags") ?? "";
  const aiOptionsRaw = searchParams?.get("options") ?? "";
  const isAIPrefill = searchParams?.get("ai") === "1";

  const [form, setForm] = useState<FormState>({
    question: isAIPrefill ? aiQuestion : "",
    description: isAIPrefill ? aiDescription : "",
    type: isAIPrefill && POLL_TYPES.some((t) => t.value === aiType) ? aiType : "binary",
    options: isAIPrefill && aiOptionsRaw
      ? aiOptionsRaw.split("||").filter(Boolean).map((text, i) => ({
          id: crypto.randomUUID(),
          text,
          color: OPTION_COLORS[i % OPTION_COLORS.length],
        }))
      : [],
    visibility: "campaign_only",
    endsAt: "",
    targetRegion: "",
    allowMultipleVotes: false,
    showResultsBeforeEnd: true,
    notifySubscribers: false,
    tags: isAIPrefill ? aiTags : "",
  });

  // Fetch active campaign
  useEffect(() => {
    fetch("/api/campaigns/switch")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.id) setCampaignId(d.data.id);
      })
      .catch(() => {});
  }, []);

  function onChange(k: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onToggle(k: "allowMultipleVotes" | "showResultsBeforeEnd" | "notifySubscribers") {
    setForm((f) => ({ ...f, [k]: !f[k] }));
  }

  function setOptions(options: PollOption[]) {
    setForm((f) => ({ ...f, options }));
  }

  function canProceed() {
    if (step === 1) return form.question.trim().length >= 5;
    if (step === 2) {
      if (!NEEDS_OPTIONS.has(form.type)) return true;
      return form.options.length >= 2 && form.options.every((o) => o.text.trim().length > 0);
    }
    return true;
  }

  async function submit() {
    setSaving(true);
    try {
      // flash_poll maps to binary API type
      const apiType = form.type === "flash_poll" ? "binary" : form.type;

      const payload = {
        question: form.question.trim(),
        description: form.description.trim() || undefined,
        type: apiType,
        visibility: form.visibility,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        targetRegion: form.targetRegion || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        options: NEEDS_OPTIONS.has(form.type) && form.options.length > 0
          ? form.options.map((o) => o.text)
          : undefined,
        campaignId: campaignId || undefined,
      };

      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        const newId = data.data?.id ?? data.id;
        toast.success("Poll created!");
        router.push(newId ? `/polls/${newId}/live` : "/polls");
      } else {
        if (data.errors) {
          const msgs = Object.values(data.errors as Record<string, string[]>).flat();
          toast.error(msgs[0] ?? "Validation failed");
        } else {
          toast.error(data.error ?? "Failed to create poll");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const STEPS = ["Type & Question", "Options", "Settings", "Preview"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: NAVY }}>Create Poll</h1>
        <p className="text-gray-500 mt-1">Build a poll to collect voter insights.</p>
        {isAIPrefill && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
            <span className="text-violet-600 text-sm">✨</span>
            <p className="text-sm text-violet-700 font-medium">Pre-filled from AI suggestion — review and adjust before publishing.</p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-gray-100 -z-0" />
        {STEPS.map((label, i) => (
          <StepDot key={i} step={i + 1} current={step} label={label} />
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1 key="s1" form={form} onChange={onChange} />}
            {step === 2 && <Step2 key="s2" form={form} setOptions={setOptions} />}
            {step === 3 && <Step3 key="s3" form={form} onChange={onChange} onToggle={onToggle} />}
            {step === 4 && <Step4 key="s4" form={form} />}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 ? (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring} className="flex-1">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="w-full min-h-[44px]">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring} className="flex-1">
            <Button variant="outline" onClick={() => router.back()} className="w-full min-h-[44px]">
              Cancel
            </Button>
          </motion.div>
        )}

        {step < 4 ? (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring} className="flex-1">
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="w-full min-h-[44px]"
              style={{ backgroundColor: canProceed() ? GREEN : undefined }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring} className="flex-1">
            <Button
              onClick={submit}
              loading={saving}
              className="w-full min-h-[44px]"
              style={{ backgroundColor: GREEN }}
            >
              <Check className="w-4 h-4" /> Publish Poll
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function NewPollPage() {
  return (
    <Suspense>
      <NewPollInner />
    </Suspense>
  );
}
