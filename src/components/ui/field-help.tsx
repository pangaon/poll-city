"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

export interface FieldHelpProps {
  /** Main explanation of the field. */
  content: string;
  /** Optional example values. */
  example?: string;
  /** Optional tip or warning. */
  tip?: string;
  /** Position the tooltip relative to the icon. */
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Small grey question mark icon with a hover/focus tooltip.
 * Use next to every form field label to explain what the field does.
 *
 * @example
 *   <label>
 *     GOTV Score <FieldHelp content="Predicts likelihood of supporting you AND turning out." example="75+ = top priority" />
 *   </label>
 */
export function FieldHelp({ content, example, tip, side = "top" }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function show() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), 150);
  }

  function hide() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), 100);
  }

  const positionClasses: Record<typeof side, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-label="More information"
        className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none ${positionClasses[side]}`}
        >
          <span className="block leading-relaxed">{content}</span>
          {example && (
            <span className="block mt-1.5 text-gray-300">
              <span className="font-semibold">Example:</span> {example}
            </span>
          )}
          {tip && (
            <span className="block mt-1.5 text-amber-200">
              <span className="font-semibold">Tip:</span> {tip}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
