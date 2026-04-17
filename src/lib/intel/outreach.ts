/**
 * Candidate Intelligence Engine — Outreach
 *
 * Controls whether and how to reach out to a detected candidate.
 * Never spams. Checks history, respects suppression, logs everything.
 */

import prisma from "@/lib/db/prisma";

export interface OutreachEligibility {
  eligible: boolean;
  reason: string;
}

const OUTREACH_COOLDOWN_DAYS = 30;

/**
 * Checks if we can send outreach to a candidate profile.
 * Returns false if already outreached within cooldown window.
 */
export async function checkOutreachEligibility(
  candidateProfileId: string
): Promise<OutreachEligibility> {
  // Already converted to a user?
  const profile = await prisma.candidateProfile.findUnique({
    where: { id: candidateProfileId },
    select: { officialId: true },
  });

  if (profile?.officialId) {
    return { eligible: false, reason: "Already an official — no outreach needed" };
  }

  // Check recent outreach attempts
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OUTREACH_COOLDOWN_DAYS);

  const recentAttempt = await prisma.candidateOutreachAttempt.findFirst({
    where: {
      candidateProfileId,
      createdAt: { gte: cutoff },
      status: { in: ["sent", "delivered", "pending"] },
    },
    select: { id: true, createdAt: true },
  });

  if (recentAttempt) {
    return {
      eligible: false,
      reason: `Outreach already sent on ${recentAttempt.createdAt.toISOString().slice(0, 10)}`,
    };
  }

  return { eligible: true, reason: "No recent outreach — eligible" };
}

/**
 * Records an outreach attempt. Does NOT send the message — that is
 * handled by the calling route/cron after confirming eligibility.
 */
export async function recordOutreachAttempt(params: {
  candidateProfileId?: string;
  candidateLeadId?: string;
  outreachType: string;
  channel: string;
  destination: string | null;
  messageVersion: string;
  messageTemplateKey: string | null;
  initiatedBy: string;
}): Promise<string> {
  const attempt = await prisma.candidateOutreachAttempt.create({
    data: {
      candidateProfileId: params.candidateProfileId ?? null,
      candidateLeadId: params.candidateLeadId ?? null,
      outreachType: params.outreachType,
      channel: params.channel,
      destination: params.destination,
      messageVersion: params.messageVersion,
      messageTemplateKey: params.messageTemplateKey,
      initiatedBy: params.initiatedBy,
      status: "pending",
    },
    select: { id: true },
  });
  return attempt.id;
}

/**
 * Mark an attempt as sent (call after successful delivery).
 */
export async function markOutreachSent(attemptId: string): Promise<void> {
  await prisma.candidateOutreachAttempt.update({
    where: { id: attemptId },
    data: { status: "sent", sentAt: new Date() },
  });
}

/**
 * Mark an attempt as failed.
 */
export async function markOutreachFailed(attemptId: string, errorMsg: string): Promise<void> {
  await prisma.candidateOutreachAttempt.update({
    where: { id: attemptId },
    data: {
      status: "failed",
      responseText: errorMsg.slice(0, 1000),
      retryCount: { increment: 1 },
    },
  });
}
