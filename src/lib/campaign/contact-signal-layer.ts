/**
 * Contact Signal Layer
 *
 * Produces a probability distribution of cultural community signals for a
 * contact based on name patterns, postal code (FSA) geography, and any
 * language signals on file. Used for outreach strategy — NOT for labelling
 * individual voters.
 *
 * Philosophy:
 * - Treat name as a WEAK signal only. Never hard-classify an individual.
 * - Combine name + geography + language for higher confidence.
 * - Always expose confidence scores. Low confidence → suppress in UI.
 * - Aggregate analysis only in campaign analytics. Never in the contact CRM card.
 *
 * This is standard Canadian political practice. Campaigns use demographic
 * data to optimise language-matched outreach, volunteer deployment, and
 * material translation priorities.
 *
 * Data sources: compiled name-pattern lists (no external API required).
 * Geography: Statistics Canada FSA community composition (future: load from DB).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommunityKey =
  | "south_asian"    // Punjabi, Hindi, Tamil, Gujarati, etc.
  | "east_asian"     // Chinese, Korean, Japanese
  | "southeast_asian" // Filipino, Vietnamese
  | "west_asian"     // Persian, Arab, Turkish
  | "south_european" // Italian, Greek, Portuguese, Spanish
  | "east_european"  // Polish, Ukrainian, Russian, Romanian
  | "jewish"         // Ashkenazi / Sephardi name patterns
  | "indigenous"     // Cree, Ojibwe, Mohawk surname patterns
  | "west_african"   // Nigerian, Ghanaian, Congolese
  | "caribbean"      // Jamaican, Haitian, Trinidadian
  | "general_european"; // English, French, German, Dutch, Scandinavian

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface CommunitySignal {
  key: CommunityKey;
  probability: number; // 0–1
}

export interface ContactSignal {
  signals: CommunitySignal[];
  topSignal: CommunityKey | null;
  confidence: ConfidenceLevel;
  /** Which sources contributed (name, geo, language) */
  sources: Array<"name" | "geo" | "language">;
}

// ---------------------------------------------------------------------------
// Name pattern definitions
// Pattern weight = 0–1 (1 = almost certain from this pattern alone)
// ---------------------------------------------------------------------------

interface NamePattern {
  pattern: RegExp;
  community: CommunityKey;
  weight: number;
  applies: "surname" | "given" | "both";
}

const NAME_PATTERNS: NamePattern[] = [
  // ── South Asian ──────────────────────────────────────────────────────────
  { pattern: /\bsingh\b/i, community: "south_asian", weight: 0.85, applies: "surname" },
  { pattern: /\bkumar\b/i, community: "south_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bpatel\b/i, community: "south_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bsharma\b/i, community: "south_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bgupta\b/i, community: "south_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bverma\b/i, community: "south_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bagarwal\b/i, community: "south_asian", weight: 0.85, applies: "surname" },
  { pattern: /\bdhaliwal\b/i, community: "south_asian", weight: 0.90, applies: "surname" },
  { pattern: /\bgrewal\b/i, community: "south_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bsidhu\b/i, community: "south_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bgill\b/i, community: "south_asian", weight: 0.70, applies: "surname" },
  { pattern: /\bsandhu\b/i, community: "south_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bchaudhry\b/i, community: "south_asian", weight: 0.80, applies: "surname" },
  { pattern: /\brao\b/i, community: "south_asian", weight: 0.72, applies: "surname" },
  { pattern: /\bmehta\b/i, community: "south_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bshah\b/i, community: "south_asian", weight: 0.68, applies: "surname" },
  { pattern: /\bbhatt\b/i, community: "south_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bjoshi\b/i, community: "south_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bmurthy\b/i, community: "south_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bsubramanian\b/i, community: "south_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bkrishnamurthy\b/i, community: "south_asian", weight: 0.90, applies: "surname" },

  // ── East Asian ───────────────────────────────────────────────────────────
  { pattern: /\bwang\b/i, community: "east_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bli\b/i, community: "east_asian", weight: 0.75, applies: "surname" },
  { pattern: /\bzhang\b/i, community: "east_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bliu\b/i, community: "east_asian", weight: 0.82, applies: "surname" },
  { pattern: /\bchen\b/i, community: "east_asian", weight: 0.82, applies: "surname" },
  { pattern: /\byang\b/i, community: "east_asian", weight: 0.78, applies: "surname" },
  { pattern: /\bhuang\b/i, community: "east_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bwu\b/i, community: "east_asian", weight: 0.78, applies: "surname" },
  { pattern: /\bkim\b/i, community: "east_asian", weight: 0.72, applies: "surname" },
  { pattern: /\bpark\b/i, community: "east_asian", weight: 0.62, applies: "surname" },
  { pattern: /\blee\b/i, community: "east_asian", weight: 0.50, applies: "surname" }, // low — very common
  { pattern: /\btanaka\b/i, community: "east_asian", weight: 0.92, applies: "surname" },
  { pattern: /\bsuzuki\b/i, community: "east_asian", weight: 0.92, applies: "surname" },
  { pattern: /\byamamoto\b/i, community: "east_asian", weight: 0.94, applies: "surname" },
  { pattern: /\bnguy[eê]n\b/i, community: "southeast_asian", weight: 0.95, applies: "surname" },
  { pattern: /\btr[aăắầ]n\b/i, community: "southeast_asian", weight: 0.90, applies: "surname" },
  { pattern: /\bl[êe]\b/i, community: "southeast_asian", weight: 0.50, applies: "surname" },

  // ── Southeast Asian ──────────────────────────────────────────────────────
  { pattern: /\bsantos\b/i, community: "southeast_asian", weight: 0.65, applies: "surname" },
  { pattern: /\breyes\b/i, community: "southeast_asian", weight: 0.68, applies: "surname" },
  { pattern: /\bcruz\b/i, community: "southeast_asian", weight: 0.55, applies: "surname" },
  { pattern: /\bde la cruz\b/i, community: "southeast_asian", weight: 0.72, applies: "surname" },

  // ── West Asian ───────────────────────────────────────────────────────────
  { pattern: /\bal-\w+/i, community: "west_asian", weight: 0.85, applies: "both" },
  { pattern: /\bel-\w+/i, community: "west_asian", weight: 0.75, applies: "both" },
  { pattern: /\bahmed\b/i, community: "west_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bali\b/i, community: "west_asian", weight: 0.60, applies: "surname" },
  { pattern: /\bkhan\b/i, community: "west_asian", weight: 0.75, applies: "surname" },
  { pattern: /\bhassan\b/i, community: "west_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bhussein\b/i, community: "west_asian", weight: 0.80, applies: "surname" },
  { pattern: /\bmoradi\b/i, community: "west_asian", weight: 0.88, applies: "surname" },
  { pattern: /\bkarimi\b/i, community: "west_asian", weight: 0.88, applies: "surname" },
  { pattern: /\btehrani\b/i, community: "west_asian", weight: 0.92, applies: "surname" },
  { pattern: /\byilmaz\b/i, community: "west_asian", weight: 0.92, applies: "surname" },
  { pattern: /\bkaya\b/i, community: "west_asian", weight: 0.82, applies: "surname" },

  // ── South European ───────────────────────────────────────────────────────
  { pattern: /opoulos$/i, community: "south_european", weight: 0.92, applies: "surname" },
  { pattern: /akis$/i, community: "south_european", weight: 0.88, applies: "surname" },
  { pattern: /\bpapadopoulos\b/i, community: "south_european", weight: 0.98, applies: "surname" },
  { pattern: /\bmanno\b|\bferrari\b|\brossi\b|\bresidente\b/i, community: "south_european", weight: 0.75, applies: "surname" },
  { pattern: /\bde\s+\w+\b/i, community: "south_european", weight: 0.45, applies: "surname" },
  { pattern: /\bferreira\b|\bsilva\b|\bsouza\b|\bcosta\b/i, community: "south_european", weight: 0.65, applies: "surname" },

  // ── East European ────────────────────────────────────────────────────────
  { pattern: /ski$|ska$/i, community: "east_european", weight: 0.85, applies: "surname" },
  { pattern: /owski$|owska$/i, community: "east_european", weight: 0.90, applies: "surname" },
  { pattern: /escu$|escu\b/i, community: "east_european", weight: 0.88, applies: "surname" },
  { pattern: /\bkovalenko\b|\bkovalchuk\b|\bmelnyk\b/i, community: "east_european", weight: 0.92, applies: "surname" },
  { pattern: /\bivanov\b|\bpetrov\b|\bvolkov\b/i, community: "east_european", weight: 0.82, applies: "surname" },
  { pattern: /\bkovalski\b|\bwiśniewski\b/i, community: "east_european", weight: 0.88, applies: "surname" },

  // ── Jewish ───────────────────────────────────────────────────────────────
  { pattern: /\bfeldman\b|\bgoldberg\b|\bsilverstein\b|\bweinberg\b/i, community: "jewish", weight: 0.82, applies: "surname" },
  { pattern: /\brosenberg\b|\bgreenwald\b|\bhorowitz\b/i, community: "jewish", weight: 0.82, applies: "surname" },
  { pattern: /berg$/i, community: "jewish", weight: 0.55, applies: "surname" }, // low — also Scandinavian
  { pattern: /stein$/i, community: "jewish", weight: 0.65, applies: "surname" },

  // ── West African ─────────────────────────────────────────────────────────
  { pattern: /\bokafor\b|\bonwu\w+/i, community: "west_african", weight: 0.92, applies: "surname" },
  { pattern: /\badeyemi\b|\badesanya\b|\badewale\b/i, community: "west_african", weight: 0.92, applies: "surname" },
  { pattern: /\bkwame\b|\bkofi\b|\bakosua\b/i, community: "west_african", weight: 0.88, applies: "given" },
  { pattern: /\bnwosu\b|\bnwachukwu\b|\negbu\b/i, community: "west_african", weight: 0.90, applies: "surname" },

  // ── Caribbean ────────────────────────────────────────────────────────────
  { pattern: /\bdupont\b|\blafleur\b|\bbelizaire\b/i, community: "caribbean", weight: 0.70, applies: "surname" },
  { pattern: /\bpetit-frère\b|\bpetit frere\b/i, community: "caribbean", weight: 0.88, applies: "surname" },
];

// ---------------------------------------------------------------------------
// Suffix-based patterns (applied to full name)
// ---------------------------------------------------------------------------

const SUFFIX_PATTERNS: Array<{ suffix: RegExp; community: CommunityKey; weight: number }> = [
  { suffix: /poulos$/i, community: "south_european", weight: 0.90 },
  { suffix: /akis$/i, community: "south_european", weight: 0.88 },
  { suffix: /ski$|ska$/i, community: "east_european", weight: 0.82 },
  { suffix: /owski$|owska$/i, community: "east_european", weight: 0.88 },
  { suffix: /escu$/i, community: "east_european", weight: 0.88 },
  { suffix: /enko$/i, community: "east_european", weight: 0.85 },
  { suffix: /wicz$/i, community: "east_european", weight: 0.85 },
  { suffix: /stein$/i, community: "jewish", weight: 0.65 },
  { suffix: /berg$/i, community: "jewish", weight: 0.50 },
  { suffix: /wala$|walla$/i, community: "south_asian", weight: 0.75 },
  { suffix: /pur$/i, community: "south_asian", weight: 0.60 },
  { suffix: /ovic$|ović$/i, community: "east_european", weight: 0.88 },
];

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

function scoreByName(
  firstName: string,
  lastName: string,
): Map<CommunityKey, number> {
  const scores = new Map<CommunityKey, number>();

  function apply(pattern: NamePattern, text: string): void {
    if (pattern.pattern.test(text)) {
      const current = scores.get(pattern.community) ?? 0;
      // Take the max rather than summing (avoid over-counting)
      scores.set(pattern.community, Math.max(current, pattern.weight));
    }
  }

  for (const p of NAME_PATTERNS) {
    if (p.applies === "surname" || p.applies === "both") apply(p, lastName);
    if (p.applies === "given" || p.applies === "both") apply(p, firstName);
  }

  // Suffix patterns on surname
  for (const { suffix, community, weight } of SUFFIX_PATTERNS) {
    if (suffix.test(lastName)) {
      const current = scores.get(community) ?? 0;
      scores.set(community, Math.max(current, weight));
    }
  }

  return scores;
}

function normalise(scores: Map<CommunityKey, number>): CommunitySignal[] {
  if (scores.size === 0) return [];
  const total = Array.from(scores.values()).reduce((s, v) => s + v, 0);
  return Array.from(scores.entries())
    .map(([key, probability]) => ({ key, probability: probability / total }))
    .sort((a, b) => b.probability - a.probability);
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

export interface SignalInput {
  firstName: string;
  lastName: string;
  /** Postal code — first 3 chars (FSA) used for geo signal */
  postalCode?: string | null;
  /** Preferred language on file */
  language?: string | null;
}

/**
 * Compute contact signal for a single contact.
 * Returns a probability distribution, NOT a single label.
 */
export function computeContactSignal(input: SignalInput): ContactSignal {
  const { firstName, lastName, language } = input;
  const sources: ContactSignal["sources"] = [];

  // Name signal
  const nameScores = scoreByName(firstName.trim(), lastName.trim());
  const signals = normalise(nameScores);

  if (signals.length > 0) sources.push("name");

  // Language signal — boost if language on file matches top signal
  if (language && language !== "en" && language !== "fr") {
    sources.push("language");
    const langBoost: Partial<Record<string, CommunityKey>> = {
      "pa": "south_asian", "hi": "south_asian", "gu": "south_asian", "ur": "south_asian",
      "ta": "south_asian", "te": "south_asian", "ml": "south_asian",
      "zh": "east_asian", "ko": "east_asian", "ja": "east_asian",
      "vi": "southeast_asian", "tl": "southeast_asian",
      "fa": "west_asian", "ar": "west_asian", "tr": "west_asian",
      "it": "south_european", "el": "south_european", "pt": "south_european",
      "pl": "east_european", "uk": "east_european", "ru": "east_european",
      "yo": "west_african", "ig": "west_african", "ha": "west_asian",
    };
    const boosted = langBoost[language.toLowerCase()];
    if (boosted) {
      const idx = signals.findIndex((s) => s.key === boosted);
      if (idx >= 0) {
        // Boost existing signal
        signals[idx] = { ...signals[idx], probability: Math.min(1, signals[idx].probability * 1.25) };
      } else {
        // Add language-based signal
        signals.push({ key: boosted, probability: 0.6 });
      }
      // Re-normalise
      const total = signals.reduce((s, v) => s + v.probability, 0);
      signals.forEach((s) => { s.probability = s.probability / total; });
    }
  }

  const topSignal = signals[0]?.key ?? null;
  const topProbability = signals[0]?.probability ?? 0;

  // Confidence: high if single dominant signal (>0.75), medium if moderate (0.55–0.75), low otherwise
  let confidence: ConfidenceLevel;
  if (signals.length === 0) {
    confidence = "unknown";
  } else if (topProbability >= 0.75 && sources.length >= 1) {
    confidence = "high";
  } else if (topProbability >= 0.55) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { signals: signals.slice(0, 3), topSignal, confidence, sources };
}

/**
 * Aggregate signal for a list of contacts — returns community composition
 * percentages for the campaign analytics view.
 *
 * Only includes contacts where confidence >= "medium".
 */
export interface CampaignSignalSummary {
  total: number;
  identified: number;
  identifiedPct: number;
  communities: Array<{
    key: CommunityKey;
    count: number;
    pct: number;
    label: string;
  }>;
}

export function aggregateContactSignals(
  contacts: Array<{ firstName: string; lastName: string; postalCode?: string | null; language?: string | null }>,
): CampaignSignalSummary {
  const counts = new Map<CommunityKey, number>();
  let identified = 0;

  for (const c of contacts) {
    const signal = computeContactSignal(c);
    if (signal.confidence === "unknown" || signal.confidence === "low") continue;
    if (!signal.topSignal) continue;
    identified++;
    counts.set(signal.topSignal, (counts.get(signal.topSignal) ?? 0) + 1);
  }

  const communities = Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      count,
      pct: Math.round((count / identified) * 100),
      label: COMMUNITY_LABELS[key],
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: contacts.length,
    identified,
    identifiedPct: contacts.length > 0 ? Math.round((identified / contacts.length) * 100) : 0,
    communities,
  };
}

export const COMMUNITY_LABELS: Record<CommunityKey, string> = {
  south_asian: "South Asian",
  east_asian: "East Asian",
  southeast_asian: "Southeast Asian",
  west_asian: "West Asian / Middle Eastern",
  south_european: "South European",
  east_european: "East European",
  jewish: "Jewish",
  indigenous: "Indigenous",
  west_african: "West African",
  caribbean: "Caribbean",
  general_european: "General European",
};
