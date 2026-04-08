"use client";

/**
 * AdoniPageAssist — contextual AI prompt strip for key pages.
 *
 * Appears as a compact row of suggested Adoni queries.
 * Clicking any prompt opens Adoni with that message pre-filled.
 * Fully dismissable (persisted per page in localStorage).
 */

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

interface Props {
  /** Unique storage key for this page's dismiss state */
  pageKey: string;
  /** 2-4 suggested prompts — keep them action-oriented */
  prompts: string[];
  /** Optional custom label */
  label?: string;
}

function openAdoni(prefill: string) {
  window.dispatchEvent(
    new CustomEvent("pollcity:open-adoni", { detail: { prefill } })
  );
}

export function AdoniPageAssist({ pageKey, prompts, label = "Ask Adoni" }: Props) {
  const storageKey = `poll-city:adoni-assist-dismissed-${pageKey}`;
  const [dismissed, setDismissed] = useState(true); // start hidden, check storage

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm">
      <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
      <span className="text-blue-700 font-semibold text-xs mr-1 flex-shrink-0">{label}:</span>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => openAdoni(p)}
            className="inline-flex items-center rounded-full bg-white border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 px-2.5 py-1 text-xs text-blue-700 font-medium transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="ml-auto flex-shrink-0 rounded p-0.5 text-blue-400 hover:text-blue-700"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
