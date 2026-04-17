import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import type {
  RepAlertSeverity,
  RepAlertSentiment,
  RepAlertSourceType,
} from "@prisma/client";

export interface IngestAlertInput {
  campaignId: string;
  userId: string;
  title: string;
  description?: string;
  sourceType?: RepAlertSourceType;
  sourceName?: string;
  sourceUrl?: string;
  sentiment?: RepAlertSentiment;
  severity?: RepAlertSeverity;
  velocityScore?: number;
  geography?: string;
  metadata?: Record<string, unknown>;
}

export async function ingestAlert(input: IngestAlertInput) {
  const {
    campaignId,
    userId,
    title,
    description,
    sourceType = "manual",
    sourceName,
    sourceUrl,
    sentiment = "unknown",
    severity = "medium",
    velocityScore = 0,
    geography,
    metadata,
  } = input;

  const alert = await prisma.reputationAlert.create({
    data: {
      campaignId,
      title,
      description,
      sourceType,
      sourceName,
      sourceUrl,
      sentiment,
      severity,
      velocityScore,
      geography,
      metadata: (metadata ?? {}) as unknown as Prisma.InputJsonValue,
      status: "new",
    },
  });

  await audit(prisma, "reputation.alert.created", {
    campaignId,
    userId,
    entityId: alert.id,
    entityType: "ReputationAlert",
    after: {
      title,
      severity,
      sentiment,
      sourceType,
      velocityScore,
    },
  });

  return alert;
}

/** Mock spike detection: returns severity based on velocity heuristic */
export function detectVelocitySeverity(velocityScore: number): RepAlertSeverity {
  if (velocityScore >= 9) return "critical";
  if (velocityScore >= 7) return "high";
  if (velocityScore >= 4) return "medium";
  return "low";
}

/**
 * Mock ingestion pipeline — simulates incoming alerts from keyword monitoring.
 * In production, replace with real connector calls.
 */
export async function runMockIngestion(campaignId: string, userId: string) {
  const mockSignals: IngestAlertInput[] = [
    {
      campaignId,
      userId,
      title: "Candidate name spike on social media",
      description: "Unusual volume of mentions detected in the last 2 hours.",
      sourceType: "social_media",
      sourceName: "Twitter/X",
      sentiment: "negative",
      severity: "high",
      velocityScore: 7.5,
      geography: "Ward 3",
      metadata: { keywordMatched: "candidate name", mentionCount: 142 },
    },
    {
      campaignId,
      userId,
      title: "Local news article published about policy position",
      description: "Article appears to misrepresent campaign's housing policy stance.",
      sourceType: "news",
      sourceName: "Local Tribune",
      sentiment: "negative",
      severity: "medium",
      velocityScore: 4.2,
      geography: undefined,
      metadata: { keywordMatched: "housing policy", articleId: "mock-001" },
    },
  ];

  const created = await Promise.all(mockSignals.map(ingestAlert));
  return created;
}
