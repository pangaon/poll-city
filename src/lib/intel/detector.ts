/**
 * Candidate Intelligence Engine — Detection Engine
 *
 * Takes a raw article (title + snippet + body) and extracts candidate signals.
 * Returns structured NewsSignal data ready to be persisted.
 */

import {
  detectAnnouncementPhrase,
  detectJurisdiction,
  detectOffice,
  normalizeOffice,
  PhraseStrength,
} from "./phrases";
import { computeCandidateScore, ScoringInput } from "./scorer";

export interface ArticleInput {
  title: string;
  snippet?: string | null;
  body?: string | null;
  publishedAt?: Date | null;
  sourceAuthorityScore: number;
  sourceType: string;
}

export interface DetectedSignal {
  candidateNameRaw: string;
  officeRaw: string;
  jurisdictionRaw: string;
  wardOrRidingRaw: string | null;
  partyRaw: string | null;
  phraseMatched: string;
  phraseStrength: PhraseStrength;
  confidenceScore: number;
  signalType: "announcement" | "nomination" | "certification" | "withdrawal" | "filing" | "kickoff" | "endorsement" | "other";
}

/** Sentence splitter — crude but avoids regex catastrophic backtracking */
function toSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * Very lightweight name extraction — looks for "Name, [Title]" or "[Title] Name" patterns.
 * Not NLP-grade; designed to get the majority without false positives.
 */
function extractNameNearPhrase(sentence: string): string | null {
  // "FirstName LastName announced" or "announced by FirstName LastName"
  const afterAnnounced = /([A-Z][a-z]+ (?:[A-Z][a-z]+\.? )?[A-Z][a-z]+)(?:\s+announced|\s+declared|\s+is\s+running)/;
  const beforeAnnounced = /(?:^|[,.]\s+)([A-Z][a-z]+ (?:[A-Z][a-z]+\.? )?[A-Z][a-z]+)/;

  const m1 = afterAnnounced.exec(sentence);
  if (m1) return m1[1].trim();
  const m2 = beforeAnnounced.exec(sentence);
  if (m2) return m2[1].trim();
  return null;
}

/** Extract ward number if present — "Ward 5", "ward 12" */
function extractWard(text: string): string | null {
  const m = /Ward\s+(\d+)/i.exec(text);
  return m ? `Ward ${m[1]}` : null;
}

/** Map phrase strength to signal type */
function phraseToSignalType(strength: PhraseStrength, matched: string): DetectedSignal["signalType"] {
  const lower = matched.toLowerCase();
  if (/certified|certification|registered/.test(lower)) return "certification";
  if (/nomination|nominated/.test(lower)) return "nomination";
  if (/filed|filing/.test(lower)) return "filing";
  if (/kickoff|kick off/.test(lower)) return "kickoff";
  if (strength === "strong") return "nomination";
  return "announcement";
}

/**
 * Main detection function. Takes article text, returns array of signals.
 * Processes sentence by sentence so one article can yield multiple candidates.
 */
export function detectCandidateSignals(article: ArticleInput): DetectedSignal[] {
  const fullText = [article.title, article.snippet ?? "", article.body ?? ""].join(" ");
  const sentences = toSentences(fullText);
  const signals: DetectedSignal[] = [];

  // First quick check: does the article text contain ANY announcement phrase?
  const quickCheck = detectAnnouncementPhrase(fullText);
  if (!quickCheck) return []; // no signal anywhere in this article

  for (const sentence of sentences) {
    const phraseResult = detectAnnouncementPhrase(sentence);
    if (!phraseResult) continue;

    const office = detectOffice(sentence) ?? detectOffice(fullText) ?? "";
    const jurisdiction = detectJurisdiction(sentence) ?? detectJurisdiction(fullText) ?? "";
    const ward = extractWard(sentence) ?? extractWard(fullText);
    const nameRaw = extractNameNearPhrase(sentence) ?? extractNameNearPhrase(article.title) ?? "Unknown";

    if (nameRaw === "Unknown" && phraseResult.strength === "weak") continue;

    const scoringInput: ScoringInput = {
      sourceAuthorityScore: article.sourceAuthorityScore,
      sourceType: article.sourceType,
      phraseStrength: phraseResult.strength,
      hasCandidateName: nameRaw !== "Unknown",
      hasOffice: office.length > 0,
      hasJurisdiction: jurisdiction.length > 0,
      hasWardOrRiding: ward !== null,
      detectedAt: article.publishedAt ?? new Date(),
      corroborationCount: 0,
    };

    const { score } = computeCandidateScore(scoringInput);
    if (score < 10) continue; // below noise floor

    signals.push({
      candidateNameRaw: nameRaw,
      officeRaw: office.length > 0 ? office : "unknown",
      jurisdictionRaw: jurisdiction.length > 0 ? jurisdiction : "unknown",
      wardOrRidingRaw: ward,
      partyRaw: null,
      phraseMatched: phraseResult.matched,
      phraseStrength: phraseResult.strength,
      confidenceScore: score,
      signalType: phraseToSignalType(phraseResult.strength, phraseResult.matched),
    });
  }

  // If we found article-level phrase but no sentence-level match, create one article-level signal
  if (signals.length === 0 && quickCheck) {
    const office = detectOffice(fullText) ?? "";
    const jurisdiction = detectJurisdiction(fullText) ?? "";
    const ward = extractWard(fullText);
    const nameRaw = extractNameNearPhrase(article.title) ?? "Unknown";

    const scoringInput: ScoringInput = {
      sourceAuthorityScore: article.sourceAuthorityScore,
      sourceType: article.sourceType,
      phraseStrength: quickCheck.strength,
      hasCandidateName: nameRaw !== "Unknown",
      hasOffice: office.length > 0,
      hasJurisdiction: jurisdiction.length > 0,
      hasWardOrRiding: ward !== null,
      detectedAt: article.publishedAt ?? new Date(),
      corroborationCount: 0,
    };

    const { score } = computeCandidateScore(scoringInput);
    if (score >= 10) {
      signals.push({
        candidateNameRaw: nameRaw,
        officeRaw: office.length > 0 ? office : "unknown",
        jurisdictionRaw: jurisdiction.length > 0 ? jurisdiction : "unknown",
        wardOrRidingRaw: ward,
        partyRaw: null,
        phraseMatched: quickCheck.matched,
        phraseStrength: quickCheck.strength,
        confidenceScore: score,
        signalType: phraseToSignalType(quickCheck.strength, quickCheck.matched),
      });
    }
  }

  // Deduplicate same name+office within the article
  const seen = new Set<string>();
  return signals.filter((s) => {
    const key = `${s.candidateNameRaw.toLowerCase()}|${s.officeRaw.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Normalizes candidate name for comparison — lowercase, no extra whitespace */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|hon|the hon)\./gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize office for comparison */
export { normalizeOffice };
