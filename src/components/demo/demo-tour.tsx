"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const GREEN = "#1D9E75";
const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** data-tour-id value of the element to spotlight */
  anchor?: string;
}

interface DemoTourProps {
  steps: TourStep[];
  /** sessionStorage key — tour auto-starts if not yet seen this session */
  storageKey: string;
}

function highlightEl(anchor: string | undefined) {
  clearHighlights();
  if (!anchor) return;
  const el = document.querySelector<HTMLElement>(`[data-tour-id="${anchor}"]`);
  if (!el) return;
  el.dataset.tourHighlight = "true";
  el.style.outline = `2px solid ${GREEN}`;
  el.style.outlineOffset = "6px";
  el.style.borderRadius = "12px";
  el.style.transition = "outline 0.25s, outline-offset 0.25s";
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearHighlights() {
  document.querySelectorAll<HTMLElement>("[data-tour-highlight]").forEach((el) => {
    delete el.dataset.tourHighlight;
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.transition = "";
  });
}

export function DemoTour({ steps, storageKey }: DemoTourProps) {
  // null = not started / finished, number = active step index
  const [active, setActive] = useState<number | null>(null);

  // Auto-start on first visit this session
  useEffect(() => {
    const seen = sessionStorage.getItem(storageKey);
    if (!seen) {
      const t = setTimeout(() => setActive(0), 1400);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  // Apply / clear highlight whenever step changes
  useEffect(() => {
    if (active === null) {
      clearHighlights();
      return;
    }
    highlightEl(steps[active]?.anchor);
  }, [active, steps]);

  function dismiss() {
    sessionStorage.setItem(storageKey, "seen");
    setActive(null);
  }

  function finish() {
    dismiss();
    window.location.href = "/login";
  }

  function next() {
    if (active === null) return;
    if ((active as number) >= steps.length - 1) { finish(); return; }
    setActive((active as number) + 1);
  }

  function back() {
    if (active === null || active === 0) return;
    setActive(active - 1);
  }

  const current = active !== null ? steps[active] : null;
  const isLast = active !== null && (active as number) >= steps.length - 1;

  return (
    <>
      {/* "Take a Tour" button when tour is not active */}
      {active === null && (
        <button
          onClick={() => setActive(0)}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-lg hover:scale-105 transition-transform"
          style={{ background: GREEN }}
        >
          <Sparkles className="w-4 h-4" />
          Take a Tour
        </button>
      )}

      <AnimatePresence>
        {current && (
          <>
            {/* Light backdrop — doesn't block scrolling */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 pointer-events-none"
              style={{ background: "rgba(0,0,0,0.45)" }}
            />

            {/* Tooltip card — bottom-center, above the sticky CTA bar */}
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={SPRING}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
            >
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
                {/* Step counter + close */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{ background: GREEN }}
                    >
                      {(active as number) + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {(active as number) + 1} of {steps.length}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Close tour"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white mb-2 leading-snug">
                  {current.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{current.body}</p>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-4 mb-4">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === (active as number) ? 20 : 6,
                        height: 6,
                        backgroundColor: i <= (active as number) ? GREEN : "#334155",
                      }}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  {(active as number) > 0 && (
                    <button
                      onClick={back}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: GREEN }}
                  >
                    {isLast ? (
                      <>Start Free Trial <ArrowRight className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Next <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
