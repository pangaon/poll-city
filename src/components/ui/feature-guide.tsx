"use client";

import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FeatureGuideProps {
  /** Unique key — used to remember dismissal in localStorage. */
  featureKey: string;
  title: string;
  description: string;
  /** Up to 3 bullets explaining what the user will do here. */
  bullets?: string[];
  /** Optional compliance/legal note shown in amber. */
  caution?: string;
}

/**
 * Dismissible intro banner for complex or jargon-heavy feature pages.
 * Remembers dismissal in localStorage under `fg:<featureKey>`.
 * Place at the top of the page content, below the page header.
 */
export function FeatureGuide({ featureKey, title, description, bullets, caution }: FeatureGuideProps) {
  const storageKey = `fg:${featureKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 rounded-full bg-blue-100 p-1.5">
              <Info className="h-4 w-4 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 mb-1">{title}</p>
              <p className="text-sm text-blue-800 leading-relaxed">{description}</p>

              {bullets && bullets.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {caution && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  {caution}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 rounded-full p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Got it, don&apos;t show again
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
