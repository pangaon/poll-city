/**
 * Poll City — Fuzzy Match Engine
 *
 * Solves two problems:
 * 1. Match voter list records to phone list records (merge two files)
 * 2. Detect duplicates when importing against existing DB contacts
 *
 * Uses weighted scoring across multiple fields.
 * AI is used for uncertain cases where score falls in the grey zone (40-75%).
 */

import { aiAssist } from "@/lib/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactRecord {
  id?: string;               // DB id if existing contact
  firstName?: string;
  lastName?: string;
  address1?: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  [key: string]: string | undefined;
}

export interface MatchResult {
  recordA: ContactRecord;
  recordB: ContactRecord;
  score: number;             // 0-100
  confidence: "high" | "medium" | "low" | "no_match";
  matchedOn: string[];       // which fields matched
  action: "auto_merge" | "review" | "skip" | "new_record";
  mergedRecord?: ContactRecord;
}

export interface MatchConfig {
  autoMergeThreshold: number;    // default 85 — auto merge above this
  reviewThreshold: number;       // default 50 — present for review above this
  useAI: boolean;                // use AI for grey-zone matches
  preferExisting: boolean;       // keep existing data when merging
}

export const DEFAULT_CONFIG: MatchConfig = {
  autoMergeThreshold: 85,
  reviewThreshold: 50,
  useAI: true,
  preferExisting: true,
};

// ─── Main Matcher ─────────────────────────────────────────────────────────────

/**
 * Match two lists of contacts (voter list + phone list, or new import + existing DB)
 * Returns match results for each record in listA
 */
export async function matchLists(
  listA: ContactRecord[],
  listB: ContactRecord[],
  config: MatchConfig = DEFAULT_CONFIG
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  const greyZone: { idx: number; recordA: ContactRecord; candidates: { record: ContactRecord; score: number; matchedOn: string[] }[] }[] = [];

  for (const recordA of listA) {
    // Score against all records in listB
    const candidates = listB.map(recordB => ({
      record: recordB,
      ...scoreMatch(recordA, recordB),
    })).sort((a, b) => b.score - a.score);

    const best = candidates[0];

    if (!best || best.score < config.reviewThreshold) {
      // No match
      results.push({
        recordA,
        recordB: best?.record ?? {},
        score: best?.score ?? 0,
        confidence: "no_match",
        matchedOn: [],
        action: "new_record",
      });
    } else if (best.score >= config.autoMergeThreshold) {
      // High confidence match — auto merge
      results.push({
        recordA,
        recordB: best.record,
        score: best.score,
        confidence: "high",
        matchedOn: best.matchedOn,
        action: "auto_merge",
        mergedRecord: mergeRecords(recordA, best.record, config.preferExisting),
      });
    } else {
      // Grey zone — needs review or AI
      greyZone.push({ idx: results.length, recordA, candidates: candidates.slice(0, 3) });
      results.push({
        recordA,
        recordB: best.record,
        score: best.score,
        confidence: best.score >= 70 ? "medium" : "low",
        matchedOn: best.matchedOn,
        action: "review",
      });
    }
  }

  // AI assist for grey zone matches
  if (config.useAI && greyZone.length > 0 && greyZone.length <= 50) {
    const aiResults = await aiAssistMatches(greyZone.map(g => ({ recordA: g.recordA, candidates: g.candidates })));
    for (let i = 0; i < greyZone.length; i++) {
      const aiResult = aiResults[i];
      const { idx, candidates } = greyZone[i];
      if (aiResult && aiResult.matchIndex >= 0 && aiResult.confidence >= 70) {
        const bestCandidate = candidates[aiResult.matchIndex];
        results[idx] = {
          ...results[idx],
          recordB: bestCandidate.record,
          score: aiResult.confidence,
          confidence: aiResult.confidence >= 85 ? "high" : "medium",
          matchedOn: [...results[idx].matchedOn, "ai"],
          action: aiResult.confidence >= DEFAULT_CONFIG.autoMergeThreshold ? "auto_merge" : "review",
          mergedRecord: aiResult.confidence >= DEFAULT_CONFIG.autoMergeThreshold
            ? mergeRecords(greyZone[i].recordA, bestCandidate.record, config.preferExisting)
            : undefined,
        };
      }
    }
  }

  return results;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreMatch(a: ContactRecord, b: ContactRecord): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = [];

  // External ID — if both have it and it matches, very high confidence
  if (a.externalId && b.externalId) {
    if (normalizeId(a.externalId) === normalizeId(b.externalId)) {
      return { score: 99, matchedOn: ["externalId"] };
    } else {
      // Different IDs — likely not the same person
      return { score: 0, matchedOn: [] };
    }
  }

  // Last name (most discriminating)
  if (a.lastName && b.lastName) {
    const lastScore = fuzzyStringScore(normalizeName(a.lastName), normalizeName(b.lastName));
    if (lastScore >= 90) { score += 35; matchedOn.push("lastName"); }
    else if (lastScore >= 70) { score += 15; matchedOn.push("lastName~"); }
    else if (lastScore < 50) { score -= 20; } // Penalty for very different last names
  }

  // First name
  if (a.firstName && b.firstName) {
    const firstScore = nameVariantScore(normalizeName(a.firstName), normalizeName(b.firstName));
    if (firstScore >= 90) { score += 25; matchedOn.push("firstName"); }
    else if (firstScore >= 70) { score += 12; matchedOn.push("firstName~"); }
  }

  // Street number (very specific)
  const streetNumA = a.streetNumber ?? extractStreetNumber(a.address1 ?? "");
  const streetNumB = b.streetNumber ?? extractStreetNumber(b.address1 ?? "");
  if (streetNumA && streetNumB) {
    if (streetNumA === streetNumB) { score += 20; matchedOn.push("streetNumber"); }
    else { score -= 15; } // Different street numbers = very unlikely match
  }

  // Street name
  const streetNameA = a.streetName ?? extractStreetName(a.address1 ?? "");
  const streetNameB = b.streetName ?? extractStreetName(b.address1 ?? "");
  if (streetNameA && streetNameB) {
    const streetScore = fuzzyStringScore(normalizeStreet(streetNameA), normalizeStreet(streetNameB));
    if (streetScore >= 85) { score += 15; matchedOn.push("streetName"); }
  }

  // Postal code
  if (a.postalCode && b.postalCode) {
    const pcA = normalizePostal(a.postalCode);
    const pcB = normalizePostal(b.postalCode);
    if (pcA === pcB) { score += 10; matchedOn.push("postalCode"); }
    else if (pcA.slice(0, 3) === pcB.slice(0, 3)) { score += 3; } // Same FSA
  }

  // Phone (strong signal when it matches)
  if (a.phone && b.phone) {
    const phoneA = normalizePhone(a.phone);
    const phoneB = normalizePhone(b.phone);
    if (phoneA === phoneB && phoneA.length >= 10) {
      score += 30; matchedOn.push("phone");
    }
  }

  // Email
  if (a.email && b.email) {
    if (a.email.toLowerCase() === b.email.toLowerCase()) {
      score += 30; matchedOn.push("email");
    }
  }

  // City (minor signal)
  if (a.city && b.city) {
    if (normalizeName(a.city) === normalizeName(b.city)) {
      score += 5; matchedOn.push("city");
    }
  }

  return { score: Math.max(0, Math.min(100, score)), matchedOn };
}

// ─── Name Variant Matching ────────────────────────────────────────────────────

const NAME_VARIANTS: Record<string, string[]> = {
  "robert": ["rob", "bob", "bobby", "bert"],
  "william": ["will", "bill", "billy", "willy"],
  "james": ["jim", "jimmy", "jamie"],
  "john": ["jon", "johnny", "jack"],
  "thomas": ["tom", "tommy"],
  "michael": ["mike", "mick", "mickey"],
  "richard": ["rick", "dick", "rich"],
  "charles": ["charlie", "chuck", "chas"],
  "joseph": ["joe", "joey"],
  "patricia": ["pat", "patty", "trish"],
  "elizabeth": ["liz", "beth", "eliza", "lisa", "betty"],
  "margaret": ["maggie", "peg", "peggy", "meg"],
  "katherine": ["kate", "kathy", "katie", "kath"],
  "jennifer": ["jen", "jenny"],
  "christopher": ["chris"],
  "matthew": ["matt"],
  "anthony": ["tony"],
  "barbara": ["barb", "barbie"],
  "dorothy": ["dot", "dottie"],
  "steven": ["steve"],
  "david": ["dave"],
  "daniel": ["dan", "danny"],
  "donald": ["don", "donny"],
  "george": ["georgie"],
  "kenneth": ["ken", "kenny"],
  "edward": ["ed", "eddie", "ted"],
  "alexander": ["alex", "alex"],
  "nicholas": ["nick", "nicky"],
  "andrew": ["andy"],
  "timothy": ["tim", "timmy"],
  "raymond": ["ray"],
  "gregory": ["greg"],
  "joshua": ["josh"],
  "lawrence": ["larry"],
  "samuel": ["sam"],
  "benjamin": ["ben"],
  "stephen": ["steve"],
  "raymond": ["ray"],
  "peter": ["pete"],
  "harold": ["harry"],
  "arthur": ["art"],
  "catherine": ["cathy", "cat", "kate"],
  "carol": ["carole"],
  "sarah": ["sara"],
  "helen": ["helena"],
  "maria": ["marie"],
  "ann": ["anne", "anna"],
  "sue": ["susan", "susie"],
};

function nameVariantScore(nameA: string, nameB: string): number {
  if (nameA === nameB) return 100;

  // Check if one is a known variant of the other
  for (const [canonical, variants] of Object.entries(NAME_VARIANTS)) {
    const allForms = [canonical, ...variants];
    if (allForms.includes(nameA) && allForms.includes(nameB)) return 92;
  }

  // Standard fuzzy match
  return fuzzyStringScore(nameA, nameB);
}

// ─── Fuzzy String Scoring (Levenshtein-based) ─────────────────────────────────

function fuzzyStringScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round((1 - dist / maxLen) * 100);
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]);
    }
  }
  return matrix[b.length][a.length];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z]/g, "");
}

function normalizeStreet(s: string): string {
  return s.toLowerCase().trim()
    .replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd").replace(/\bdrive\b/g, "dr")
    .replace(/\broad\b/g, "rd").replace(/\bcourt\b/g, "ct")
    .replace(/\bcircle\b/g, "cir").replace(/\blane\b/g, "ln")
    .replace(/[^a-z0-9]/g, "");
}

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "").slice(-10);
}

function normalizePostal(s: string): string {
  return s.replace(/\s/g, "").toUpperCase();
}

function normalizeId(s: string): string {
  return s.trim().toLowerCase();
}

function extractStreetNumber(address: string): string {
  return address.match(/^\d+/)?.[0] ?? "";
}

function extractStreetName(address: string): string {
  return address.replace(/^\d+\s*/, "").replace(/,.*$/, "").trim();
}

// ─── Merge Records ────────────────────────────────────────────────────────────

export function mergeRecords(
  recordA: ContactRecord,
  recordB: ContactRecord,
  preferExisting: boolean
): ContactRecord {
  const merged: ContactRecord = { ...recordA };

  for (const [key, value] of Object.entries(recordB)) {
    if (!value) continue;

    if (!merged[key]) {
      // recordA doesn't have this field, take from B
      merged[key] = value;
    } else if (!preferExisting) {
      // Overwrite with recordB's value
      merged[key] = value;
    }
    // If preferExisting, keep recordA's value
  }

  return merged;
}

// ─── AI Assist for Grey Zone ──────────────────────────────────────────────────

async function aiAssistMatches(
  items: { recordA: ContactRecord; candidates: { record: ContactRecord; score: number }[] }[]
): Promise<{ matchIndex: number; confidence: number }[]> {
  const prompt = `You are matching voter records. For each case, determine if recordA matches one of the candidates.

${items.map((item, i) => `
Case ${i + 1}:
Record A: ${JSON.stringify(item.recordA)}
Candidates:
${item.candidates.map((c, j) => `  ${j}: ${JSON.stringify(c.record)} (rule score: ${c.score})`).join("\n")}
`).join("\n")}

Respond ONLY with JSON array: [{"matchIndex": 0, "confidence": 85}, ...]
matchIndex is the best candidate index (0-based), or -1 if no match.
confidence is 0-100.`;

  try {
    const result = await aiAssist.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: "You are a data matching expert. Respond only with the JSON array.",
      maxTokens: 500,
    });

    const text = result.text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return items.map(() => ({ matchIndex: -1, confidence: 0 }));
  }
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

export interface MatchSummary {
  total: number;
  autoMerged: number;
  needsReview: number;
  noMatch: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

export function summarizeMatches(results: MatchResult[]): MatchSummary {
  return {
    total: results.length,
    autoMerged: results.filter(r => r.action === "auto_merge").length,
    needsReview: results.filter(r => r.action === "review").length,
    noMatch: results.filter(r => r.action === "new_record").length,
    highConfidence: results.filter(r => r.confidence === "high").length,
    mediumConfidence: results.filter(r => r.confidence === "medium").length,
    lowConfidence: results.filter(r => r.confidence === "low").length,
  };
}
