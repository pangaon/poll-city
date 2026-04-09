/**
 * Interaction Confidence Scoring
 *
 * A contact's confidence score answers: "How much do we trust that
 * their recorded support level reflects their actual intention to vote for us?"
 *
 * Base scores by source:
 *   canvass         85  — volunteer face-to-face, most reliable
 *   internal_phone  60  — campaign office call, good
 *   event           70  — in-person event, good
 *   social          50  — social media DM, moderate
 *   self            40  — self-reported, optimistic bias
 *   call_center     30  — call centres lie (George's rule)
 *   simulation       0  — excluded from real scoring
 *
 * Deductions:
 *   isProxy         −20 — spoke to someone other than the voter
 *   opponentSign    −75 — opponent's sign at the property (strong negative signal)
 *
 * For a contact with multiple interactions, the score = weighted average
 * of the last 3 interactions (most recent weighted 2x, older 1x each).
 *
 * Used by:
 *   - GOTV priority queue (sort by confidence descending)
 *   - Advance vote strategy (contacts near advance stations with low confidence = E-day priority)
 *   - Data verification audit (low-confidence contacts flagged for re-check)
 */

import { InteractionSource } from "@prisma/client";

// ---------------------------------------------------------------------------
// Source base scores
// ---------------------------------------------------------------------------

const SOURCE_SCORE: Record<InteractionSource, number> = {
  canvass: 85,
  internal_phone: 60,
  event: 70,
  social: 50,
  self: 40,
  call_center: 30,
  simulation: 0,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InteractionForScoring {
  source: InteractionSource;
  isProxy: boolean;
  opponentSign: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Score a single interaction
// ---------------------------------------------------------------------------

export function scoreInteraction(interaction: InteractionForScoring): number {
  if (interaction.source === "simulation") return 0;

  let score = SOURCE_SCORE[interaction.source] ?? 50;
  if (interaction.isProxy) score -= 20;
  if (interaction.opponentSign) score -= 75;

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Score a contact from their interaction history
// ---------------------------------------------------------------------------

export function scoreContact(interactions: InteractionForScoring[]): number {
  if (interactions.length === 0) return 0;

  // Filter out simulation interactions, sort by most recent first
  const real = interactions
    .filter((i) => i.source !== "simulation")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (real.length === 0) return 0;

  // Use up to 3 most recent interactions, most recent weighted 2x
  const recent = real.slice(0, 3);
  const weights = [2, 1, 1].slice(0, recent.length);
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const weighted = recent.reduce(
    (sum, interaction, idx) => sum + scoreInteraction(interaction) * weights[idx],
    0,
  );

  return Math.round(weighted / totalWeight);
}

// ---------------------------------------------------------------------------
// Confidence label for UI display
// ---------------------------------------------------------------------------

export type ConfidenceLabel = "high" | "medium" | "low" | "very_low" | "unverified";

export function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  if (score >= 35) return "low";
  if (score > 0) return "very_low";
  return "unverified";
}

export function confidenceColor(label: ConfidenceLabel): string {
  switch (label) {
    case "high": return "#1D9E75";      // green
    case "medium": return "#EF9F27";    // amber
    case "low": return "#E24B4A";       // red
    case "very_low": return "#94a3b8";  // muted
    case "unverified": return "#475569";
  }
}

// ---------------------------------------------------------------------------
// GOTV priority score
// Combines support level strength with confidence to rank pull-the-vote priority.
// Higher = go get them on E-day.
// ---------------------------------------------------------------------------

type SupportLevel =
  | "strong_support"
  | "leaning_support"
  | "undecided"
  | "leaning_opposition"
  | "strong_opposition"
  | "unknown";

const SUPPORT_WEIGHT: Record<SupportLevel, number> = {
  strong_support: 100,
  leaning_support: 70,
  undecided: 30,
  leaning_opposition: 0,
  strong_opposition: 0,
  unknown: 10,
};

export function gotvPriorityScore(
  supportLevel: SupportLevel,
  confidenceScore: number,
): number {
  const supportW = SUPPORT_WEIGHT[supportLevel] ?? 10;
  // Blend: 60% support weight + 40% confidence
  return Math.round(supportW * 0.6 + confidenceScore * 0.4);
}
