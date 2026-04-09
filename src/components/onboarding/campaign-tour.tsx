"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourState {
  step: number;
  dismissed: boolean;
  completedAt?: string;
  painPoints?: string[];
}

type StepKind =
  | "adoni-intro"
  | "pain-points"
  | "did-you-know"
  | "nav-link"
  | "completion";

interface BaseStep {
  number: number;
  kind: StepKind;
  title: string;
}

interface AdoniIntroStep extends BaseStep {
  kind: "adoni-intro";
  description: string;
  ctaLabel: string;
  adoniPrefill: string;
}

interface PainPointsStep extends BaseStep {
  kind: "pain-points";
  description: string;
}

interface DidYouKnowStep extends BaseStep {
  kind: "did-you-know";
  cards: string[];
}

interface NavLinkStep extends BaseStep {
  kind: "nav-link";
  description: string;
  ctaLabel: string;
  href: string;
  /** pathname prefix(es) that auto-advance this step */
  triggerPaths: string[];
}

interface CompletionStep extends BaseStep {
  kind: "completion";
  description: string;
  note: string;
}

type TourStep =
  | AdoniIntroStep
  | PainPointsStep
  | DidYouKnowStep
  | NavLinkStep
  | CompletionStep;

// ---------------------------------------------------------------------------
// Tour steps definition
// ---------------------------------------------------------------------------

const STEPS: TourStep[] = [
  {
    number: 1,
    kind: "adoni-intro",
    title: "Meet Adoni, your campaign AI",
    description:
      "Adoni answers questions, surfaces insights, and drafts communications — like a senior campaign manager on call 24/7. He learns your campaign as you go.",
    ctaLabel: "Ask Adoni something",
    adoniPrefill: "What can you help me with?",
  },
  {
    number: 2,
    kind: "pain-points",
    title: "What are your biggest challenges?",
    description:
      "Tell us the 3 challenges you're facing most right now. Adoni uses this to give you more relevant help.",
  },
  {
    number: 3,
    kind: "did-you-know",
    title: "What Poll City does for you",
    cards: [
      "Your contacts, canvassers, and GOTV — all connected automatically",
      "Every door knock updates the map in real time",
      "Donation receipts send automatically (Ontario MEA compliant)",
    ],
  },
  {
    number: 4,
    kind: "nav-link",
    title: "Add your first contact",
    description:
      "Build your supporter list by adding contacts manually or searching existing records.",
    ctaLabel: "Go to Contacts",
    href: "/contacts",
    triggerPaths: ["/contacts"],
  },
  {
    number: 5,
    kind: "nav-link",
    title: "Import your voter list",
    description:
      "Upload a CSV of voters from your riding to get your full contact universe in one shot.",
    ctaLabel: "Go to Import / Export",
    href: "/import-export",
    triggerPaths: ["/import-export"],
  },
  {
    number: 6,
    kind: "nav-link",
    title: "Create a walk list",
    description:
      "Assign turf to your canvassers so your team can start knocking doors today.",
    ctaLabel: "Go to Canvassing",
    href: "/canvassing",
    triggerPaths: ["/canvassing"],
  },
  {
    number: 7,
    kind: "nav-link",
    title: "Send your first communication",
    description:
      "Send an email or SMS blast to introduce yourself to your supporters.",
    ctaLabel: "Go to Communications",
    href: "/communications",
    triggerPaths: ["/communications"],
  },
  {
    number: 8,
    kind: "completion",
    title: "You're home now",
    description:
      "Keep looking around — don't be shy. This is your platform and I'm not going anywhere. You won't bother me. I never get tired.",
    note: "The more you use it, the better I get. Go explore. Ask me anything.",
  },
];

const TOTAL_STEPS = STEPS.length;

// Nav-link steps that trigger auto-advance on path visit
const NAV_STEPS = STEPS.filter(
  (s): s is NavLinkStep => s.kind === "nav-link",
);

// ---------------------------------------------------------------------------
// Demo framing copy
// ---------------------------------------------------------------------------

const DEMO_BANNER =
  "This is what Poll City looks like for a real campaign.";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function storageKey(campaignId: string): string {
  return `pollcity:tour:${campaignId}`;
}

function readState(campaignId: string): TourState {
  if (typeof window === "undefined") return { step: 1, dismissed: false };
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return { step: 1, dismissed: false };
    return JSON.parse(raw) as TourState;
  } catch {
    return { step: 1, dismissed: false };
  }
}

function writeState(campaignId: string, state: TourState): void {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify(state));
  } catch {
    // storage full or private-mode — silent
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

function StepAdoniIntro({
  step,
  onCta,
  onNext,
}: {
  step: AdoniIntroStep;
  onCta: (prefill: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "#1D9E75" }}
        />
        <p className="text-slate-300 text-[13px] leading-relaxed">
          {step.description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCta(step.adoniPrefill)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 mb-2"
        style={{ backgroundColor: "#1D9E75" }}
      >
        {step.ctaLabel}
        <Sparkles className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:border-slate-500 transition-colors"
      >
        Next
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
}

function StepPainPoints({
  onSave,
}: {
  onSave: (answers: string[]) => void;
}) {
  const [vals, setVals] = useState<[string, string, string]>(["", "", ""]);

  function update(idx: 0 | 1 | 2, value: string) {
    setVals((prev) => {
      const next = [...prev] as [string, string, string];
      next[idx] = value;
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2 mb-3">
        {(["0", "1", "2"] as const).map((i) => (
          <input
            key={i}
            type="text"
            placeholder={`Challenge ${Number(i) + 1}`}
            value={vals[Number(i) as 0 | 1 | 2]}
            onChange={(e) => update(Number(i) as 0 | 1 | 2, e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSave(vals.filter((v) => v.trim() !== ""))}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#1D9E75" }}
      >
        Save &amp; continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
}

function StepDidYouKnow({
  step,
  onNext,
}: {
  step: DidYouKnowStep;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2 mb-3">
        {step.cards.map((text, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
          >
            <p className="text-slate-300 text-[12px] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0A2342" }}
      >
        Let&apos;s get started
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
}

function StepNavLink({
  step,
  onCta,
}: {
  step: NavLinkStep;
  onCta: (href: string) => void;
}) {
  return (
    <>
      <p className="text-slate-400 text-[13px] leading-relaxed mb-4">
        {step.description}
      </p>
      <button
        type="button"
        onClick={() => onCta(step.href)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#1D9E75" }}
      >
        {step.ctaLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
}

function StepCompletion({ step }: { step: CompletionStep }) {
  return (
    <>
      <p className="text-slate-400 text-[13px] leading-relaxed mb-3">
        {step.description}
      </p>
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
        <p className="text-slate-400 text-[11px] leading-relaxed italic">
          {step.note}
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CampaignTourProps {
  /** When true the tour runs in demo/conversion mode */
  demo?: boolean;
}

export default function CampaignTour({ demo = false }: CampaignTourProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const campaignId =
    demo
      ? "demo"
      : ((session?.user as { activeCampaignId?: string | null } | undefined)
          ?.activeCampaignId ?? null);

  const [tourState, setTourState] = useState<TourState | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  // Ref to avoid stale closure in the auto-advance effect
  const tourStateRef = useRef<TourState | null>(null);
  tourStateRef.current = tourState;

  // ── Bootstrap: load from localStorage once campaignId is known ──────────
  useEffect(() => {
    if (!campaignId) return;
    const saved = readState(campaignId);
    setTourState(saved);
  }, [campaignId]);

  // ── Persist state on every change ───────────────────────────────────────
  useEffect(() => {
    if (!campaignId || !tourState) return;
    writeState(campaignId, tourState);
  }, [campaignId, tourState]);

  // ── Auto-advance when user visits the trigger path for a nav-link step ───
  useEffect(() => {
    const current = tourStateRef.current;
    if (!current || current.dismissed || !campaignId) return;

    const currentDef = STEPS[current.step - 1];
    if (!currentDef || currentDef.kind !== "nav-link") return;

    const isOnTrigger = currentDef.triggerPaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (!isOnTrigger) return;

    const nextStep = current.step + 1;

    if (nextStep > TOTAL_STEPS) {
      // All nav steps visited — fire completion
      const done: TourState = {
        step: TOTAL_STEPS,
        dismissed: false,
        completedAt: new Date().toISOString(),
        painPoints: current.painPoints,
      };
      setTourState(done);
      setShowCelebration(true);
      setTimeout(() => {
        setTourState((prev) =>
          prev ? { ...prev, dismissed: true } : prev,
        );
        setShowCelebration(false);
      }, 3500);
      return;
    }

    setTourState((prev) =>
      prev ? { ...prev, step: nextStep } : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, campaignId]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const dismiss = useCallback(() => {
    if (!campaignId) return;
    setTourState((prev) =>
      prev ? { ...prev, dismissed: true } : prev,
    );
  }, [campaignId]);

  const advance = useCallback(() => {
    setTourState((prev) => {
      if (!prev) return prev;
      const next = prev.step + 1;
      if (next > TOTAL_STEPS) return { ...prev, dismissed: true };
      return { ...prev, step: next };
    });
  }, []);

  const handleAdoniCta = useCallback((prefill: string) => {
    window.dispatchEvent(
      new CustomEvent("pollcity:open-adoni", { detail: { prefill } }),
    );
    advance();
  }, [advance]);

  const handlePainPoints = useCallback(
    (answers: string[]) => {
      setTourState((prev) => {
        if (!prev) return prev;
        return { ...prev, step: prev.step + 1, painPoints: answers };
      });
    },
    [],
  );

  const handleNavCta = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!campaignId || !tourState) return null;
  if (tourState.dismissed) return null;

  const currentStep = STEPS[tourState.step - 1] ?? STEPS[TOTAL_STEPS - 1];

  // For completion step: auto-show celebration inline (no separate toast)
  const isCompletion = currentStep.kind === "completion";

  // Progress: count nav-link steps completed (steps 4-7) + intro steps done
  const progressPercent = Math.round(
    ((tourState.step - 1) / TOTAL_STEPS) * 100,
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {showCelebration ? (
        <motion.div
          key="celebration"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={SPRING}
          className="fixed bottom-[76px] md:bottom-6 right-2 md:right-6 z-40 w-[calc(100vw-16px)] md:w-80 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl px-5 py-5 text-center"
          style={{ maxWidth: 320 }}
        >
          <CheckCircle2
            className="w-10 h-10 mx-auto mb-2"
            style={{ color: "#1D9E75" }}
          />
          <p className="text-white font-bold text-lg leading-tight">
            You&apos;re set up!
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Your campaign is ready to win.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="tour-card"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={SPRING}
          className="fixed bottom-[76px] md:bottom-6 right-2 md:right-6 z-40 w-[calc(100vw-16px)] md:w-80 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          style={{ maxWidth: 320 }}
        >
          {/* Demo banner */}
          {demo && (
            <div
              className="px-4 py-1.5 text-center text-[11px] font-semibold text-white"
              style={{ backgroundColor: "#EF9F27" }}
            >
              {DEMO_BANNER}
            </div>
          )}

          {/* Progress bar */}
          <div className="h-1 w-full bg-slate-800">
            <motion.div
              className="h-full"
              style={{ backgroundColor: "#1D9E75" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>

          <div className="px-4 pt-4 pb-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#0A2342" }}
                >
                  {currentStep.number}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Step {currentStep.number} of {TOTAL_STEPS}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 p-0.5 rounded"
                aria-label="Close tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.number}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={SPRING}
              >
                <h3 className="text-white font-semibold text-[15px] leading-snug mb-3">
                  {currentStep.title}
                </h3>

                {currentStep.kind === "adoni-intro" && (
                  <StepAdoniIntro
                    step={currentStep}
                    onCta={handleAdoniCta}
                    onNext={advance}
                  />
                )}

                {currentStep.kind === "pain-points" && (
                  <StepPainPoints onSave={handlePainPoints} />
                )}

                {currentStep.kind === "did-you-know" && (
                  <StepDidYouKnow step={currentStep} onNext={advance} />
                )}

                {currentStep.kind === "nav-link" && (
                  <StepNavLink step={currentStep} onCta={handleNavCta} />
                )}

                {currentStep.kind === "completion" && (
                  <>
                    <StepCompletion step={currentStep} />
                    <button
                      type="button"
                      onClick={dismiss}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#1D9E75" }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Let&apos;s go
                    </button>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Skip link — hidden on completion */}
            {!isCompletion && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-[12px] text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                >
                  Skip tour
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
