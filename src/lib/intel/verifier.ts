/**
 * Candidate Intelligence Engine — Verifier
 *
 * Determines verification outcome for a CandidateLead based on its score.
 * Auto-verifies high-confidence leads, queues borderline for manual review,
 * rejects noise.
 */

import type { CandidateVerificationStatus } from "@prisma/client";

export interface VerificationInput {
  confidenceScore: number;
  hasCandidateName: boolean;
  hasOffice: boolean;
  hasJurisdiction: boolean;
}

export interface VerificationDecision {
  status: CandidateVerificationStatus;
  reason: string;
}

// Thresholds — tunable without touching pipeline code
export const VERIFICATION_THRESHOLDS = {
  AUTO_VERIFY: 70,    // score >= 70 + required fields → auto_verified
  MANUAL_REVIEW: 40,  // score 40-69 → pending (manual review)
  // score < 40 → rejected
};

export function decideVerification(input: VerificationInput): VerificationDecision {
  const { confidenceScore, hasCandidateName, hasOffice, hasJurisdiction } = input;

  if (confidenceScore < VERIFICATION_THRESHOLDS.MANUAL_REVIEW) {
    return { status: "rejected", reason: `Score ${confidenceScore} below minimum threshold` };
  }

  if (confidenceScore >= VERIFICATION_THRESHOLDS.AUTO_VERIFY) {
    if (hasCandidateName && hasOffice && hasJurisdiction) {
      return { status: "auto_verified", reason: `Score ${confidenceScore} with all required fields` };
    }
    // High score but missing fields — still needs review
    const missing = [
      !hasCandidateName && "name",
      !hasOffice && "office",
      !hasJurisdiction && "jurisdiction",
    ]
      .filter(Boolean)
      .join(", ");
    return { status: "pending", reason: `Score ${confidenceScore} but missing: ${missing}` };
  }

  // 40–69 range
  return { status: "pending", reason: `Score ${confidenceScore} requires manual review` };
}
