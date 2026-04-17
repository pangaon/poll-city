/**
 * Candidate Intelligence Engine — Entity Resolver
 *
 * Deduplication and entity resolution for CandidateLeads.
 * Compares detected candidates against existing leads to find duplicates.
 */

import prisma from "@/lib/db/prisma";
import { normalizeName, normalizeOffice } from "./detector";

export interface ResolveInput {
  detectedNameRaw: string;
  officeRaw: string;
  jurisdictionRaw: string;
  wardOrRidingRaw: string | null;
}

export interface ResolveResult {
  isDuplicate: boolean;
  duplicateLeadId: string | null;
  /** Similarity score 0–100 if a near-match was found */
  matchScore: number;
}

/**
 * Levenshtein distance — used for fuzzy name matching.
 * Kept small and focused — no library dependency.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity ratio 0–1 (1 = identical) */
function similarityRatio(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Checks if the incoming signal matches an existing CandidateLead.
 * Returns first match above the duplicate threshold (0.85 name similarity
 * + same office + same jurisdiction).
 */
export async function resolveCandidate(input: ResolveInput): Promise<ResolveResult> {
  const normalizedName = normalizeName(input.detectedNameRaw);
  const normalizedOffice = normalizeOffice(input.officeRaw);
  const normalizedJurisdiction = input.jurisdictionRaw.toLowerCase().trim();

  // Fetch existing leads with same normalized jurisdiction (cheap filter first)
  const existingLeads = await prisma.candidateLead.findMany({
    where: {
      jurisdictionNormalized: { equals: normalizedJurisdiction, mode: "insensitive" },
      verificationStatus: { not: "rejected" },
    },
    select: {
      id: true,
      detectedNameRaw: true,
      officeNormalized: true,
      jurisdictionNormalized: true,
    },
    take: 100,
  });

  let bestMatch: { id: string; score: number } | null = null;

  for (const lead of existingLeads) {
    const leadName = normalizeName(lead.detectedNameRaw);
    const leadOffice = lead.officeNormalized ?? "";

    const nameSimilarity = similarityRatio(normalizedName, leadName);
    if (nameSimilarity < 0.7) continue; // fast exit

    const officeMatch = normalizedOffice === leadOffice || normalizedOffice.includes(leadOffice) || leadOffice.includes(normalizedOffice);
    if (!officeMatch) continue;

    const combined = nameSimilarity * 100;
    if (!bestMatch || combined > bestMatch.score) {
      bestMatch = { id: lead.id, score: combined };
    }
  }

  const DUPLICATE_THRESHOLD = 85;

  if (bestMatch && bestMatch.score >= DUPLICATE_THRESHOLD) {
    return { isDuplicate: true, duplicateLeadId: bestMatch.id, matchScore: Math.round(bestMatch.score) };
  }

  return { isDuplicate: false, duplicateLeadId: null, matchScore: Math.round(bestMatch?.score ?? 0) };
}
