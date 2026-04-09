// GOTV scoring engine — computes a 0-100 score for each contact.
//
// Algorithm:
//   Base:                 50
//   Support level:        +35 strong / +20 leaning / 0 undecided / -20 leaning_opposition / -35 strong_opposition
//   Voting history:       +40 max (10 pts per prior election voted, max 4)
//   Engagement:           +5 donated, +5 volunteered, +3 event, +2 sign request
//   Recency bonus:        +5 contacted in last 7 days, +3 last 30 days
//   Confirmed commitment: +20 will_vote, +30 voted, -10 refused
//   Clamp to [0, 100]
//
// Tiers (after scoring):
//   Priority 1 (80+): confirmed supporters, contact on election day
//   Priority 2 (60-79): likely supporters, day before
//   Priority 3 (40-59): persuadable, 2-3 days before
//   Priority 4 (<40): low priority

import type { Contact, SupportLevel, GotvStatus } from "@prisma/client";

type GotvContact = Pick<
  Contact,
  | "supportLevel"
  | "gotvStatus"
  | "signRequested"
  | "volunteerInterest"
  | "lastContactedAt"
  | "voted"
> & {
  /** Optional — when provided, shifts GOTV score ±5 based on interaction quality */
  confidenceScore?: number | null;
};

export type GotvTier = 1 | 2 | 3 | 4;

export interface GotvBreakdown {
  score: number;
  tier: GotvTier;
  parts: {
    base: number;
    support: number;
    engagement: number;
    recency: number;
    commitment: number;
  };
}

const SUPPORT_WEIGHT: Record<SupportLevel, number> = {
  strong_support: 35,
  leaning_support: 20,
  undecided: 0,
  leaning_opposition: -20,
  strong_opposition: -35,
  unknown: 0,
} as unknown as Record<SupportLevel, number>;

const COMMITMENT_WEIGHT: Record<string, number> = {
  voted: 30,
  will_vote: 20,
  not_home: 0,
  not_checked: 0,
  refused: -10,
};

export function computeGotvScore(c: GotvContact): GotvBreakdown {
  const base = 50;
  const support = SUPPORT_WEIGHT[c.supportLevel] ?? 0;

  let engagement = 0;
  if (c.signRequested) engagement += 2;
  if (c.volunteerInterest) engagement += 5;

  let recency = 0;
  if (c.lastContactedAt) {
    const daysAgo = Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo <= 7) recency = 5;
    else if (daysAgo <= 30) recency = 3;
  }

  const commitment = COMMITMENT_WEIGHT[c.gotvStatus as GotvStatus] ?? 0;

  // Confidence modifier: ±5 pts based on interaction quality vs. expected 50% baseline
  // A canvassed contact (score 85) gets +3; call_center only (score 30) gets −2
  const confidence = c.confidenceScore ?? 0;
  const confidenceMod = confidence > 0 ? Math.round((confidence - 50) / 10) : 0;

  const raw = base + support + engagement + recency + commitment + confidenceMod;
  const score = Math.max(0, Math.min(100, raw));
  const tier: GotvTier = score >= 80 ? 1 : score >= 60 ? 2 : score >= 40 ? 3 : 4;

  return {
    score,
    tier,
    parts: { base, support, engagement, recency, commitment },
  };
}

export function tierLabel(tier: GotvTier): string {
  switch (tier) {
    case 1: return "Priority 1 — Confirmed supporters, contact election day";
    case 2: return "Priority 2 — Likely supporters, contact day before";
    case 3: return "Priority 3 — Persuadable, contact 2-3 days before";
    case 4: return "Priority 4 — Low priority";
  }
}

export function tierColor(tier: GotvTier): string {
  switch (tier) {
    case 1: return "#eab308"; // gold
    case 2: return "#10b981"; // green
    case 3: return "#f59e0b"; // amber
    case 4: return "#94a3b8"; // slate
  }
}
