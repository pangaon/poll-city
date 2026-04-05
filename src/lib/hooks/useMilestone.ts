"use client";
import { useEffect, useRef } from "react";

// Fires the `pollcity:milestone` window event whenever a tracked metric
// crosses a threshold. The Adoni bubble listens and celebrates.
//
// Thresholds are stored in localStorage per campaign + metric so a milestone
// only fires once ever.
//
// Example:
//   useMilestone("signs", signsInstalled, [10, 25, 50, 100, 250], (v) => `${v} signs installed!`);
//   useMilestone("doors", doorsKnocked, [100, 500, 1000, 2500, 5000], (v) => `${v} doors knocked — unreal.`);

export function useMilestone(
  metric: string,
  currentValue: number,
  thresholds: readonly number[],
  labelFor: (value: number) => string,
  scope?: string,
) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === "undefined") return;
    if (!Number.isFinite(currentValue)) return;

    const key = `pc:milestone:${scope ?? "global"}:${metric}`;
    let history: number[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) history = JSON.parse(raw) as number[];
    } catch {
      history = [];
    }

    // Find the highest threshold we've crossed that we haven't celebrated yet.
    const crossed = thresholds.filter((t) => currentValue >= t && !history.includes(t));
    if (crossed.length === 0) return;
    const top = crossed[crossed.length - 1];

    window.dispatchEvent(
      new CustomEvent("pollcity:milestone", {
        detail: { metric, value: top, label: labelFor(top) },
      }),
    );
    fired.current = true;

    try {
      localStorage.setItem(key, JSON.stringify([...history, ...crossed]));
    } catch {
      // ignore
    }
  }, [metric, currentValue, thresholds, labelFor, scope]);
}
