"use client";

/**
 * AdoniChip — inline Adoni trigger button for form field labels.
 *
 * Renders a small circular button with Adoni's avatar.
 * On click, opens the Adoni chat panel pre-filled with a contextual prompt.
 *
 * Usage:
 *   <label className="inline-flex items-center gap-1.5">
 *     Task Title
 *     <AdoniChip prefill="Suggest a task name for a campaign manager" />
 *   </label>
 */

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface Props {
  /** The message to pre-fill in Adoni's chat input. */
  prefill: string;
  /** Optional tooltip label. Defaults to "Ask Adoni". */
  label?: string;
  /** Size variant. "sm" = 28px chip, "md" = 36px chip. Default: "sm". */
  size?: "sm" | "md";
}

export function AdoniChip({ prefill, label = "Ask Adoni", size = "sm" }: Props) {
  function openAdoni(e: React.MouseEvent) {
    // Stop event from bubbling to any parent <label>, which would re-focus the input.
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("pollcity:open-adoni", { detail: { prefill } })
    );
  }

  const dim = size === "md" ? 36 : 28;
  const imgDim = size === "md" ? 24 : 18;

  return (
    // Outer tap target is always 44px for mobile accessibility
    <span
      className="inline-flex items-center justify-center"
      style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
    >
      <motion.button
        type="button"
        onClick={openAdoni}
        title={label}
        aria-label={label}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative rounded-full flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          width: dim,
          height: dim,
          backgroundColor: "#0A2342",
          boxShadow: "0 0 0 2px #1D9E75",
        }}
      >
        {/* Subtle pulse ring — always visible as Adoni is always ready */}
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: "#1D9E75",
            opacity: 0.25,
            animationDuration: "2.4s",
          }}
          aria-hidden="true"
        />
        <Image
          src="/images/adoni-bubble.png"
          alt="Ask Adoni"
          width={imgDim}
          height={imgDim}
          className="rounded-full object-cover relative z-10"
          draggable={false}
        />
      </motion.button>
    </span>
  );
}
