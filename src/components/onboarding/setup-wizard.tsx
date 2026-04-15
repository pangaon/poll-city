"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  CalendarDays,
  MapPin,
  Share2,
  Mail,
} from "lucide-react";
import {
  CANDIDATE_ROLES,
  CANADIAN_JURISDICTIONS,
  ELECTION_TYPES,
  detectElectionType,
} from "@/lib/canada/electoral-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardData {
  // Step 1 — candidate
  candidateName: string;
  candidateTitle: string;
  jurisdiction: string;
  electionType: string;
  // Step 2 — dates
  electionDate: string;
  advanceVoteStart: string;
  advanceVoteEnd: string;
  // Step 3 — HQ
  officeAddress: string;
  candidatePhone: string;
  candidateEmail: string;
  // Step 4 — socials
  websiteUrl: string;
  twitterHandle: string;
  instagramHandle: string;
  facebookUrl: string;
  // Step 5 — email voice
  fromEmailName: string;
  replyToEmail: string;
}

interface SetupWizardProps {
  campaignId: string;
  firstName: string;
  /** Pre-seeded values from existing campaign record */
  initial: Partial<WizardData>;
  onComplete: () => void;
  /** Called when user chooses "Remind me later" on step 1 — no save, just dismiss */
  onSnooze?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

const NAVY = "#0A2342";
const GREEN = "#1D9E75";


// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
    />
  );
}

const INPUT_CLS =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors";

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(item: string) {
    onChange(item);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filtered[highlighted]) {
        e.preventDefault();
        select(filtered[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={INPUT_CLS}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((item, i) => (
            <li
              key={item}
              onMouseDown={(e) => {
                e.preventDefault();
                select(item);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{
                color: i === highlighted ? "#1D9E75" : "#cbd5e1",
                backgroundColor: i === highlighted ? "rgba(29,158,117,0.1)" : "transparent",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepIcon({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}22` }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step content components
// ---------------------------------------------------------------------------

function Step1({
  data,
  onChange,
  firstName,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
  firstName: string;
}) {
  function handleRoleChange(v: string) {
    onChange("candidateTitle", v);
    // Cross-detect election type from the role
    const detected = detectElectionType(v);
    if (detected) onChange("electionType", detected);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={User} color={GREEN} />
        <div>
          <h2 className="text-white font-bold text-xl leading-tight">
            Hello {firstName}!
          </h2>
          <p className="text-slate-400 text-sm">
            Let&apos;s get your campaign ready. This takes about 2 minutes.
          </p>
        </div>
      </div>
      <div>
        <Label>Candidate name *</Label>
        <Input
          value={data.candidateName}
          onChange={(v) => onChange("candidateName", v)}
          placeholder="Full name as it appears on the ballot"
        />
      </div>
      <div>
        <Label>Running for</Label>
        <AutocompleteInput
          value={data.candidateTitle}
          onChange={handleRoleChange}
          placeholder="e.g. Ward 5 Councillor, MPP for Ottawa Centre"
          suggestions={CANDIDATE_ROLES}
        />
      </div>
      <div>
        <Label>Riding / municipality</Label>
        <AutocompleteInput
          value={data.jurisdiction}
          onChange={(v) => onChange("jurisdiction", v)}
          placeholder="e.g. City of Ottawa, Riding of Carleton"
          suggestions={CANADIAN_JURISDICTIONS}
        />
      </div>
      <div>
        <Label>Election type</Label>
        <AutocompleteInput
          value={data.electionType}
          onChange={(v) => onChange("electionType", v)}
          placeholder="Municipal, Provincial, Federal…"
          suggestions={ELECTION_TYPES}
        />
      </div>
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={CalendarDays} color={GREEN} />
        <div>
          <h2 className="text-white font-bold text-xl leading-tight">
            Election dates
          </h2>
          <p className="text-slate-400 text-sm">
            These drive your canvassing priorities and advance vote strategy.
          </p>
        </div>
      </div>
      <div>
        <Label>Election day *</Label>
        <Input
          type="date"
          value={data.electionDate}
          onChange={(v) => onChange("electionDate", v)}
        />
      </div>
      <div>
        <Label>Advance voting — first day</Label>
        <Input
          type="date"
          value={data.advanceVoteStart}
          onChange={(v) => onChange("advanceVoteStart", v)}
        />
      </div>
      <div>
        <Label>Advance voting — last day</Label>
        <Input
          type="date"
          value={data.advanceVoteEnd}
          onChange={(v) => onChange("advanceVoteEnd", v)}
        />
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={MapPin} color={GREEN} />
        <div>
          <h2 className="text-white font-bold text-xl leading-tight">
            Campaign headquarters
          </h2>
          <p className="text-slate-400 text-sm">
            Where volunteers meet and the team operates from.
          </p>
        </div>
      </div>
      <div>
        <Label>Office address</Label>
        <Input
          value={data.officeAddress}
          onChange={(v) => onChange("officeAddress", v)}
          placeholder="123 Main St, Ottawa, ON K1A 0A9"
        />
      </div>
      <div>
        <Label>Campaign phone</Label>
        <Input
          type="tel"
          value={data.candidatePhone}
          onChange={(v) => onChange("candidatePhone", v)}
          placeholder="613-555-0123"
        />
      </div>
      <div>
        <Label>Campaign email</Label>
        <Input
          type="email"
          value={data.candidateEmail}
          onChange={(v) => onChange("candidateEmail", v)}
          placeholder="info@johncampbell.ca"
        />
      </div>
    </div>
  );
}

function Step4({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={Share2} color={GREEN} />
        <div>
          <h2 className="text-white font-bold text-xl leading-tight">
            Your online presence
          </h2>
          <p className="text-slate-400 text-sm">
            Adoni uses these when drafting posts and reaching your supporters.
          </p>
        </div>
      </div>
      <div>
        <Label>Website</Label>
        <Input
          value={data.websiteUrl}
          onChange={(v) => onChange("websiteUrl", v)}
          placeholder="https://johncampbell.ca"
        />
      </div>
      <div>
        <Label>X / Twitter handle</Label>
        <Input
          value={data.twitterHandle}
          onChange={(v) => onChange("twitterHandle", v)}
          placeholder="@johnforward5"
        />
      </div>
      <div>
        <Label>Instagram handle</Label>
        <Input
          value={data.instagramHandle}
          onChange={(v) => onChange("instagramHandle", v)}
          placeholder="@johnforward5"
        />
      </div>
      <div>
        <Label>Facebook URL</Label>
        <Input
          value={data.facebookUrl}
          onChange={(v) => onChange("facebookUrl", v)}
          placeholder="https://facebook.com/johncampbell"
        />
      </div>
    </div>
  );
}

function Step5({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <StepIcon icon={Mail} color={GREEN} />
        <div>
          <h2 className="text-white font-bold text-xl leading-tight">
            Your email voice
          </h2>
          <p className="text-slate-400 text-sm">
            Supporters see this name and address on every email you send.
          </p>
        </div>
      </div>
      <div>
        <Label>From name</Label>
        <Input
          value={data.fromEmailName}
          onChange={(v) => onChange("fromEmailName", v)}
          placeholder='e.g. "John Smith for Ward 5"'
        />
        <p className="text-slate-500 text-xs mt-1">
          Shows as the sender in your supporters&apos; inboxes.
        </p>
      </div>
      <div>
        <Label>Reply-to email</Label>
        <Input
          type="email"
          value={data.replyToEmail}
          onChange={(v) => onChange("replyToEmail", v)}
          placeholder="john@johncampbell.ca"
        />
        <p className="text-slate-500 text-xs mt-1">
          Where replies land. Can be the same as your campaign email.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress dots
// ---------------------------------------------------------------------------

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current - 1 ? 20 : 6,
            height: 6,
            backgroundColor: i < current ? GREEN : "#334155",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 5;

function toDateInput(val: string | null | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return val.slice(0, 10);
  }
}

export default function SetupWizard({
  campaignId,
  firstName,
  initial,
  onComplete,
  onSnooze,
}: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<WizardData>({
    candidateName: initial.candidateName ?? "",
    candidateTitle: initial.candidateTitle ?? "",
    jurisdiction: initial.jurisdiction ?? "",
    electionType: initial.electionType
      ? initial.electionType.charAt(0).toUpperCase() + initial.electionType.slice(1)
      : "Municipal",
    electionDate: toDateInput(initial.electionDate),
    advanceVoteStart: toDateInput(initial.advanceVoteStart),
    advanceVoteEnd: toDateInput(initial.advanceVoteEnd),
    officeAddress: initial.officeAddress ?? "",
    candidatePhone: initial.candidatePhone ?? "",
    candidateEmail: initial.candidateEmail ?? "",
    websiteUrl: initial.websiteUrl ?? "",
    twitterHandle: initial.twitterHandle ?? "",
    instagramHandle: initial.instagramHandle ?? "",
    facebookUrl: initial.facebookUrl ?? "",
    fromEmailName: initial.fromEmailName ?? "",
    replyToEmail: initial.replyToEmail ?? "",
  });

  const setField = useCallback((k: keyof WizardData, v: string) => {
    setData((prev) => ({ ...prev, [k]: v }));
  }, []);

  async function saveStep(isLast: boolean) {
    setSaving(true);
    try {
      // Convert date strings to ISO datetime strings for the API
      const toISO = (d: string) => d ? new Date(d).toISOString() : null;
      // Normalize display election type → Prisma enum value (lowercase)
      const ELECTION_TYPE_MAP: Record<string, string> = {
        municipal: "municipal",
        provincial: "provincial",
        federal: "federal",
        "by-election": "by_election",
        "school board": "other",
        regional: "other",
      };
      const rawType = (data.electionType || "").toLowerCase().trim();
      const normalizedType = (ELECTION_TYPE_MAP[rawType] ?? rawType) || undefined;
      await fetch("/api/campaigns/setup", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-campaign-id": campaignId,
        },
        body: JSON.stringify({
          candidateName: data.candidateName || undefined,
          candidateTitle: data.candidateTitle || null,
          jurisdiction: data.jurisdiction || null,
          electionType: normalizedType || undefined,
          electionDate: toISO(data.electionDate),
          advanceVoteStart: toISO(data.advanceVoteStart),
          advanceVoteEnd: toISO(data.advanceVoteEnd),
          officeAddress: data.officeAddress || null,
          candidatePhone: data.candidatePhone || null,
          candidateEmail: data.candidateEmail || null,
          websiteUrl: data.websiteUrl || null,
          twitterHandle: data.twitterHandle || null,
          instagramHandle: data.instagramHandle || null,
          facebookUrl: data.facebookUrl || null,
          fromEmailName: data.fromEmailName || null,
          replyToEmail: data.replyToEmail || null,
          complete: isLast,
        }),
      });
    } catch {
      // fire-and-forget safe — wizard advances regardless
    } finally {
      setSaving(false);
    }
  }

  function canAdvance(): boolean {
    if (step === 1) return data.candidateName.trim().length > 0;
    if (step === 2) return data.electionDate.length > 0;
    return true;
  }

  async function next() {
    if (!canAdvance()) return;
    const isLast = step === TOTAL_STEPS;
    await saveStep(isLast);
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 1) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING}
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header bar */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: GREEN }}
            >
              Campaign Setup
            </div>
            <div className="text-xs text-slate-500">
              {step} of {TOTAL_STEPS}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-slate-800 mb-5">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: GREEN }}
              initial={{ width: 0 }}
              animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-2 min-h-[340px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={SPRING}
            >
              {step === 1 && (
                <Step1 data={data} onChange={setField} firstName={firstName} />
              )}
              {step === 2 && <Step2 data={data} onChange={setField} />}
              {step === 3 && <Step3 data={data} onChange={setField} />}
              {step === 4 && <Step4 data={data} onChange={setField} />}
              {step === 5 && <Step5 data={data} onChange={setField} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4">
          <ProgressDots total={TOTAL_STEPS} current={step} />

          <div className="flex items-center gap-3 mt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:border-slate-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: canAdvance() ? GREEN : "#334155" }}
            >
              {saving ? (
                "Saving…"
              ) : step === TOTAL_STEPS ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finish setup
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Dismiss link — "Remind me later" on step 1, "Skip" on subsequent steps */}
          <div className="mt-3 text-center">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => onSnooze?.()}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
              >
                Remind me later — I don&apos;t have all this info yet
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void saveStep(true);
                  onComplete();
                }}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
              >
                Skip for now — I&apos;ll finish this later
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
