/**
 * Candidate Intelligence Engine — Confidence Scorer
 *
 * Computes a 0-100 confidence score for a candidate signal.
 * Pure function — no DB calls, easy to test.
 */

export interface ScoringInput {
  sourceAuthorityScore: number; // 0.0–1.0 from DataSource.authorityScore
  sourceType: string;           // "rss"|"news_api"|"official_list"|"social"|"manual"
  phraseStrength: "strong" | "moderate" | "weak" | "none";
  hasCandidateName: boolean;
  hasOffice: boolean;
  hasJurisdiction: boolean;
  hasWardOrRiding: boolean;
  detectedAt: Date;
  corroborationCount: number; // how many other sources detected the same person
}

export interface ScoringResult {
  score: number;        // 0–100 integer
  breakdown: Record<string, number>;
}

const PHRASE_STRENGTH_POINTS: Record<string, number> = {
  strong: 25,   // "certified candidate", "filed nomination papers", "won nomination"
  moderate: 15, // "announced candidacy", "is running for", "launched campaign"
  weak: 5,      // "considering running", "may seek", "expected to run"
  none: 0,
};

const SOURCE_TYPE_MULTIPLIER: Record<string, number> = {
  official_list: 1.3, // official election body lists — most authoritative
  news_api: 1.0,
  rss: 0.9,
  social: 0.7,        // social signals need corroboration
  manual: 1.0,
};

export function computeCandidateScore(input: ScoringInput): ScoringResult {
  const breakdown: Record<string, number> = {};

  // Authority component: 0–30 pts (source authority × type multiplier × 30)
  const typeMultiplier = SOURCE_TYPE_MULTIPLIER[input.sourceType] ?? 1.0;
  const authorityPts = Math.round(input.sourceAuthorityScore * typeMultiplier * 30);
  breakdown.authority = Math.min(30, authorityPts);

  // Phrase strength: 0–25 pts
  breakdown.phraseStrength = PHRASE_STRENGTH_POINTS[input.phraseStrength] ?? 0;

  // Entity presence
  breakdown.candidateName = input.hasCandidateName ? 15 : 0;
  breakdown.office = input.hasOffice ? 15 : 0;
  breakdown.jurisdiction = input.hasJurisdiction ? 8 : 0;
  breakdown.wardOrRiding = input.hasWardOrRiding ? 4 : 0;

  // Recency
  const ageMs = Date.now() - input.detectedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) breakdown.recency = 10;
  else if (ageDays <= 30) breakdown.recency = 5;
  else breakdown.recency = 0;

  // Corroboration bonus: +8 per additional source, max +16
  breakdown.corroboration = Math.min(16, input.corroborationCount * 8);

  const score = Math.min(
    100,
    Math.max(
      0,
      Object.values(breakdown).reduce((sum, v) => sum + v, 0)
    )
  );

  return { score: Math.round(score), breakdown };
}
