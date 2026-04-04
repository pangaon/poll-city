"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Check, BarChart3,
  Eye, EyeOff, Calendar, Bell, RefreshCw, Lock, Globe,
} from "lucide-react";
import { Button, Card, CardContent, FormField, Input, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";
import { Suspense } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */
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

/* ── Option colors ───────────────────────────────────────────────────────── */
const OPTION_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F97316"];

/* ── Poll types ─────────────────────────────────────────────────────────── */
const POLL_TYPES = [
  { value: "binary",         label: "Yes / No",          desc: "Simple binary choice" },
  { value: "multiple_choice",label: "Multiple Choice",    desc: "Pick one from several" },
  { value: "ranked",         label: "Ranked Choice",      desc: "Order by preference" },
  { value: "slider",         label: "Slider (0–100)",     desc: "Rate on a numeric scale" },
  { value: "swipe",          label: "Swipe Cards",        desc: "Tinder-style swipe voting" },
  { value: "image_swipe",    label: "Image Swipe",        desc: "Swipe on image cards" },
  { value: "emoji_react",    label: "Emoji React",        desc: "React with an emoji" },
  { value: "priority_rank",  label: "Priority Rank",      desc: "Rank priorities" },
];

const NEEDS_OPTIONS = new Set(["multiple_choice","ranked","swipe","image_swipe","priority_rank"]);

/* ── Step indicator ──────────────────────────────────────────────────────── */
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
        done ? "bg-blue-600 text-white" : active ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-gray-100 text-gray-400"
      }`}>
        {done ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={`text-xs font-medium hidden sm:block ${active ? "text-blue-600" : done ? "text-gray-600" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

/* ── Step 1: Question ────────────────────────────────────────────────────── */
function Step1({ form, onChange }: { form: FormState; onChange: (k: keyof FormState, v: string) => void }) {
  const selectedType = POLL_TYPES.find(t => t.value === form.type);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">What do you want to ask?</h2>
        <p className="text-gray-500 text-sm">Write a clear, concise question for your voters.</p>
      </div>

      <FormField label="Question" required>
        <Textarea
          value={form.question}
          onChange={e => onChange("question", e.target.value)}
          placeholder="e.g. Do you support expanding public transit in our city?"
          className="text-base resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{form.question.length}/500</p>
      </FormField>

      <FormField label="Description (optional)">
        <Textarea
          value={form.description}
          onChange={e => onChange("description", e.target.value)}
          placeholder="Provide additional context…"
          rows={2}
        />
      </FormField>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Poll Type</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POLL_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange("type", t.value)}
              className={`text-left p-3 rounded-2xl border-2 transition-all ${
                form.type === t.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <p className={`text-sm font-semibold ${form.type === t.value ? "text-blue-700" : "text-gray-800"}`}>{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-100">
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span><strong>{selectedType.label}:</strong> {selectedType.desc}</span>
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Options ─────────────────────────────────────────────────────── */
function Step2({ form, setOptions }: { form: FormState; setOptions: (opts: PollOption[]) => void }) {
  function addOption() {
    const idx = form.options.length;
    setOptions([...form.options, { id: crypto.randomUUID(), text: "", color: OPTION_COLORS[idx % OPTION_COLORS.length] }]);
  }
  function removeOption(id: string) {
    setOptions(form.options.filter(o => o.id !== id));
  }
  function updateText(id: string, text: string) {
    setOptions(form.options.map(o => o.id === id ? { ...o, text } : o));
  }
  function updateColor(id: string, color: string) {
    setOptions(form.options.map(o => o.id === id ? { ...o, color } : o));
  }

  if (!NEEDS_OPTIONS.has(form.type)) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">No options needed</p>
        <p className="text-gray-400 text-sm mt-1">
          <strong className="capitalize">{form.type.replace(/_/g," ")}</strong> polls don&apos;t require custom options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Add your options</h2>
        <p className="text-gray-500 text-sm">Add the choices voters can select. Drag to reorder.</p>
      </div>

      <div className="space-y-3">
        {form.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
            {/* Color picker */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm overflow-hidden">
                <input
                  type="color"
                  value={opt.color}
                  onChange={e => updateColor(opt.id, e.target.value)}
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
              onChange={e => updateText(opt.id, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1"
            />
            <button
              onClick={() => removeOption(opt.id)}
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addOption}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add option
      </button>

      {form.options.length < 2 && (
        <p className="text-sm text-amber-600 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Add at least 2 options to proceed.
        </p>
      )}
    </div>
  );
}

/* ── Step 3: Settings ────────────────────────────────────────────────────── */
function Step3({ form, onChange, onToggle }: {
  form: FormState;
  onChange: (k: keyof FormState, v: string) => void;
  onToggle: (k: "allowMultipleVotes" | "showResultsBeforeEnd" | "notifySubscribers") => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Poll settings</h2>
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
          ].map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => onChange("visibility", v.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                form.visibility === v.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <v.icon className={`w-5 h-5 ${form.visibility === v.value ? "text-blue-600" : "text-gray-400"}`} />
              <div className="text-center">
                <p className={`text-sm font-semibold ${form.visibility === v.value ? "text-blue-700" : "text-gray-700"}`}>{v.label}</p>
                <p className="text-xs text-gray-400">{v.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* End date */}
      <FormField label="End date (optional)">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={e => onChange("endsAt", e.target.value)}
            className="pl-10"
          />
        </div>
      </FormField>

      {/* Target region */}
      <FormField label="Target region (optional)">
        <Input
          value={form.targetRegion}
          onChange={e => onChange("targetRegion", e.target.value)}
          placeholder="e.g. Toronto Ward 12, Ottawa East"
        />
      </FormField>

      {/* Tags */}
      <FormField label="Tags (optional)">
        <Input
          value={form.tags}
          onChange={e => onChange("tags", e.target.value)}
          placeholder="municipal, transit, infrastructure (comma separated)"
        />
      </FormField>

      {/* Toggles */}
      <div className="space-y-3">
        {[
          {
            key: "showResultsBeforeEnd" as const,
            label: "Show results before poll closes",
            desc: "Voters can see results after voting, even while poll is open",
            icon: Eye,
          },
          {
            key: "allowMultipleVotes" as const,
            label: "Allow multiple votes",
            desc: "Voters can change or re-submit their vote",
            icon: RefreshCw,
          },
          {
            key: "notifySubscribers" as const,
            label: "Notify subscribers",
            desc: "Send push notification to campaign subscribers",
            icon: Bell,
          },
        ].map(toggle => (
          <div
            key={toggle.key}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onToggle(toggle.key)}
          >
            <div className="flex items-center gap-3">
              <toggle.icon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{toggle.label}</p>
                <p className="text-xs text-gray-400">{toggle.desc}</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form[toggle.key] ? "bg-blue-600" : "bg-gray-200"}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${form[toggle.key] ? "left-6" : "left-1"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 4: Preview ─────────────────────────────────────────────────────── */
function Step4({ form }: { form: FormState }) {
  const GRADIENTS = [
    "from-blue-600 via-blue-700 to-purple-700",
    "from-emerald-500 via-emerald-600 to-teal-600",
  ];
  const gradient = GRADIENTS[form.type.length % 2];
  const typeDef = POLL_TYPES.find(t => t.value === form.type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Preview your poll</h2>
        <p className="text-gray-500 text-sm">Here&apos;s how your poll will look to voters.</p>
      </div>

      {/* Card preview */}
      <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full capitalize">
            {typeDef?.label ?? form.type}
          </span>
          <span className="text-white/60 text-xs capitalize">{form.visibility.replace("_"," ")}</span>
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
        {form.type === "binary" && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1 py-3 bg-emerald-500/80 rounded-2xl text-center font-bold text-sm">Yes</div>
            <div className="flex-1 py-3 bg-red-500/80 rounded-2xl text-center font-bold text-sm">No</div>
          </div>
        )}
        {form.type === "slider" && (
          <div className="mt-4">
            <div className="h-3 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full w-1/2" /></div>
            <div className="flex justify-between text-white/60 text-xs mt-1"><span>0</span><span>100</span></div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
        <h4 className="font-semibold text-gray-900 text-sm">Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Type</p>
            <p className="font-medium text-gray-800 capitalize">{form.type.replace(/_/g," ")}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Visibility</p>
            <p className="font-medium text-gray-800 capitalize">{form.visibility.replace(/_/g," ")}</p>
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
    </div>
  );
}

/* ── Main wizard ─────────────────────────────────────────────────────────── */
function NewPollInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    question: "",
    description: "",
    type: "binary",
    options: [],
    visibility: "campaign_only",
    endsAt: "",
    targetRegion: "",
    allowMultipleVotes: false,
    showResultsBeforeEnd: true,
    notifySubscribers: false,
    tags: "",
  });

  // Fetch active campaign
  useEffect(() => {
    fetch("/api/campaigns/switch").then(r => r.json()).then(d => {
      if (d.data?.id) setCampaignId(d.data.id);
    }).catch(() => {});
  }, []);

  function onChange(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function onToggle(k: "allowMultipleVotes" | "showResultsBeforeEnd" | "notifySubscribers") {
    setForm(f => ({ ...f, [k]: !f[k] }));
  }

  function setOptions(options: PollOption[]) {
    setForm(f => ({ ...f, options }));
  }

  function canProceed() {
    if (step === 1) return form.question.trim().length >= 5;
    if (step === 2) {
      if (!NEEDS_OPTIONS.has(form.type)) return true;
      return form.options.length >= 2 && form.options.every(o => o.text.trim().length > 0);
    }
    return true;
  }

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        visibility: form.visibility,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        targetRegion: form.targetRegion || undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        options: NEEDS_OPTIONS.has(form.type) ? form.options.map(o => o.text) : undefined,
        campaignId: campaignId || undefined,
      };

      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Poll created!");
        router.push("/polls");
      } else {
        // Show specific field errors if available
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

  const STEPS = ["Question", "Options", "Settings", "Preview"];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Poll</h1>
        <p className="text-gray-500 mt-1">Build a poll to collect voter insights.</p>
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
          {step === 1 && <Step1 form={form} onChange={onChange} />}
          {step === 2 && <Step2 form={form} setOptions={setOptions} />}
          {step === 3 && <Step3 form={form} onChange={onChange} onToggle={onToggle} />}
          {step === 4 && <Step4 form={form} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
        )}

        {step < 4 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} loading={saving} className="flex-1">
            <Check className="w-4 h-4" /> Publish Poll
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NewPollPage() {
  return (
    <Suspense>
      <NewPollInner />
    </Suspense>
  );
}
