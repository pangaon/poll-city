import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { generateRecommendation, computeImpactScore } from "./rule-engine";
import { SEVERITY_RANK } from "./types";
import { Prisma } from "@prisma/client";
import type { RepIssueCategory, RepAlertSeverity, RepIssueStatus } from "@prisma/client";

export interface CreateIssueInput {
  campaignId: string;
  userId: string;
  title: string;
  description?: string;
  category: RepIssueCategory;
  severity: RepAlertSeverity;
  alertIds?: string[];
  ownerUserId?: string;
  slaDeadline?: Date;
  geography?: string;
}

export async function createIssue(input: CreateIssueInput) {
  const {
    campaignId,
    userId,
    title,
    description,
    category,
    severity,
    alertIds = [],
    ownerUserId,
    slaDeadline,
    geography,
  } = input;

  const issue = await prisma.reputationIssue.create({
    data: {
      campaignId,
      title,
      description,
      category,
      severity,
      status: "open",
      ownerUserId,
      slaDeadline,
      geography,
      impactScore: 0,
      alertLinks: alertIds.length > 0
        ? { create: alertIds.map((alertId) => ({ alertId })) }
        : undefined,
    },
    include: {
      alertLinks: { include: { alert: true } },
    },
  });

  // Compute initial impact score based on linked alerts
  const velocityMax = issue.alertLinks.reduce(
    (max, link) => Math.max(max, link.alert.velocityScore),
    0,
  );
  const hasNegative = issue.alertLinks.some((l) => l.alert.sentiment === "negative");
  const hasNews = issue.alertLinks.some((l) => l.alert.sourceType === "news");
  const impactScore = computeImpactScore({
    severityRank: SEVERITY_RANK[severity],
    velocityScore: velocityMax,
    alertCount: alertIds.length,
    isNegative: hasNegative,
    isNews: hasNews,
  });

  await prisma.reputationIssue.update({
    where: { id: issue.id },
    data: { impactScore },
  });

  // Update linked alerts to linked status
  if (alertIds.length > 0) {
    await prisma.reputationAlert.updateMany({
      where: { id: { in: alertIds }, campaignId },
      data: { status: "linked" },
    });
  }

  // Auto-generate first recommendation
  await generateIssueRecommendations(issue.id, campaignId);

  await audit(prisma, "reputation.issue.created", {
    campaignId,
    userId,
    entityId: issue.id,
    entityType: "ReputationIssue",
    after: { title, severity, category, alertCount: alertIds.length },
  });

  return issue;
}

export async function generateIssueRecommendations(
  issueId: string,
  campaignId: string,
) {
  const issue = await prisma.reputationIssue.findUnique({
    where: { id: issueId },
    include: {
      alertLinks: { include: { alert: true } },
      recommendations: { where: { isDismissed: false } },
    },
  });

  if (!issue || issue.campaignId !== campaignId) return [];

  // Aggregate alert signals
  const alerts = issue.alertLinks.map((l) => l.alert);
  const dominantSentiment =
    alerts.filter((a) => a.sentiment === "negative").length > alerts.length / 2
      ? "negative"
      : alerts[0]?.sentiment ?? "unknown";
  const dominantSource = alerts[0]?.sourceType ?? "manual";
  const maxVelocity = Math.max(0, ...alerts.map((a) => a.velocityScore));
  const issueAgeHours = Math.floor(
    (Date.now() - issue.openedAt.getTime()) / (1000 * 60 * 60),
  );

  const ruleOutput = generateRecommendation({
    severity: issue.severity,
    sentiment: dominantSentiment,
    sourceType: dominantSource,
    velocityScore: maxVelocity,
    category: issue.category,
    geography: issue.geography,
    issueAgeHours,
    existingRecommendationCount: issue.recommendations.length,
  });

  const rec = await prisma.reputationRecommendation.create({
    data: {
      issueId,
      actionType: ruleOutput.actionType,
      suggestedChannels: ruleOutput.suggestedChannels,
      suggestedAudienceFilter: ruleOutput.suggestedAudienceFilter as unknown as Prisma.InputJsonValue,
      urgencyLevel: ruleOutput.urgencyLevel,
      reasoning: ruleOutput.reasoning,
    },
  });

  return [rec];
}

export async function updateIssueStatus(
  issueId: string,
  campaignId: string,
  userId: string,
  status: RepIssueStatus,
) {
  const current = await prisma.reputationIssue.findUnique({
    where: { id: issueId, campaignId },
    select: { status: true },
  });
  if (!current) throw new Error("Issue not found");

  const updated = await prisma.reputationIssue.update({
    where: { id: issueId },
    data: {
      status,
      resolvedAt: status === "resolved" ? new Date() : undefined,
    },
  });

  await audit(prisma, "reputation.issue.status_changed", {
    campaignId,
    userId,
    entityId: issueId,
    entityType: "ReputationIssue",
    before: { status: current.status },
    after: { status },
  });

  return updated;
}

export async function assignIssueOwner(
  issueId: string,
  campaignId: string,
  userId: string,
  ownerUserId: string,
) {
  const updated = await prisma.reputationIssue.update({
    where: { id: issueId, campaignId },
    data: { ownerUserId, status: "triaged" },
  });

  await audit(prisma, "reputation.issue.assigned", {
    campaignId,
    userId,
    entityId: issueId,
    entityType: "ReputationIssue",
    after: { ownerUserId },
  });

  return updated;
}

export async function mergeAlertsIntoIssue(
  issueId: string,
  campaignId: string,
  alertIds: string[],
) {
  const existing = await prisma.issueAlertLink.findMany({
    where: { issueId },
    select: { alertId: true },
  });
  const existingIds = new Set(existing.map((l) => l.alertId));
  const newIds = alertIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return;

  await prisma.issueAlertLink.createMany({
    data: newIds.map((alertId) => ({ issueId, alertId })),
    skipDuplicates: true,
  });

  await prisma.reputationAlert.updateMany({
    where: { id: { in: newIds }, campaignId },
    data: { status: "linked" },
  });
}
