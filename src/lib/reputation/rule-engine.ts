import type { RuleEngineInput, RuleEngineOutput } from "./types";
import { SEVERITY_RANK, URGENCY_RANK } from "./types";
import type { RepRecUrgency } from "@prisma/client";

function maybeUpgrade(current: RepRecUrgency, candidate: RepRecUrgency): RepRecUrgency {
  const a: number = URGENCY_RANK[candidate];
  const b: number = URGENCY_RANK[current];
  return a > b ? candidate : current;
}

/**
 * Deterministic rule engine — no AI dependency.
 * Input: issue context. Output: recommended action + urgency + channels.
 *
 * Rules are additive: each block may override urgency/action upward only.
 */
export function generateRecommendation(input: RuleEngineInput): RuleEngineOutput {
  const {
    severity,
    sentiment,
    sourceType,
    velocityScore,
    category,
    issueAgeHours,
    existingRecommendationCount,
  } = input;

  const sevRank = SEVERITY_RANK[severity];
  let actionType: RuleEngineOutput["actionType"] = "no_action";
  let urgencyLevel: RuleEngineOutput["urgencyLevel"] = "monitor";
  const channels: string[] = [];
  const reasoning: string[] = [];
  const audienceFilter: Record<string, unknown> = {};

  // ── Rule 1: Critical severity always escalates to command center ──────────
  if (sevRank >= 4) {
    actionType = "escalate";
    urgencyLevel = "immediate";
    reasoning.push("Critical severity requires immediate escalation to command center.");
  }

  // ── Rule 2: High severity + negative sentiment = rapid response ───────────
  if (sevRank >= 3 && sentiment === "negative") {
    if (actionType !== "escalate") actionType = "media_response";
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_hour");
    channels.push("email", "social_media");
    reasoning.push("High severity with negative sentiment — rapid response recommended.");
  }

  // ── Rule 3: Velocity spike ────────────────────────────────────────────────
  if (velocityScore >= 8) {
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_hour");
    reasoning.push(`High velocity score (${velocityScore.toFixed(1)}) — narrative spreading rapidly.`);
  } else if (velocityScore >= 5) {
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_day");
    reasoning.push(`Elevated velocity score (${velocityScore.toFixed(1)}) — monitor closely.`);
  }

  // ── Rule 4: Misinformation category ──────────────────────────────────────
  if (category === "misinformation") {
    actionType = "publish_response_page";
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_hour");
    channels.push("email", "social_media", "sms");
    reasoning.push("Misinformation detected — publish a factual response page and brief supporters.");
  }

  // ── Rule 5: Media inquiry always needs a media response ──────────────────
  if (category === "media_inquiry") {
    actionType = "media_response";
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_day");
    reasoning.push("Media inquiry requires a prepared, approved response statement.");
  }

  // ── Rule 6: Policy issue = supporter briefing ─────────────────────────────
  if (category === "policy") {
    if (actionType === "no_action") actionType = "send_supporter_briefing";
    channels.push("email");
    audienceFilter.tags = ["supporter", "volunteer"];
    reasoning.push("Policy issue — brief core supporters with official position.");
  }

  // ── Rule 7: Personal attack at high severity = internal approval first ────
  if (category === "personal_attack" && sevRank >= 3) {
    if (actionType === "no_action") actionType = "internal_note";
    reasoning.push("Personal attack — draft internal note for team review before any public response.");
  }

  // ── Rule 8: News source = higher priority ────────────────────────────────
  if (sourceType === "news" && sevRank >= 2) {
    urgencyLevel = maybeUpgrade(urgencyLevel, "within_day");
    reasoning.push("News source — media coverage warrants proactive monitoring.");
  }

  // ── Rule 9: Suppression during legal/financial issues ────────────────────
  if (category === "legal" || category === "financial") {
    actionType = "suppress_outbound";
    reasoning.push(`${category === "legal" ? "Legal" : "Financial"} issue — suppress non-essential outbound until approved response is ready.`);
  }

  // ── Rule 10: Stale open issue nudge ──────────────────────────────────────
  if (issueAgeHours >= 24 && existingRecommendationCount === 0) {
    reasoning.push("Issue open for 24+ hours without action — escalation recommended.");
    urgencyLevel = maybeUpgrade(urgencyLevel, "this_week");
  }

  // ── Rule 11: Supporter mobilization for controversy ──────────────────────
  if (category === "local_controversy" && sentiment === "negative" && sevRank >= 2) {
    channels.push("email", "sms");
    audienceFilter.geography = input.geography;
    audienceFilter.supportLevels = ["strong_support", "leaning_support"];
    reasoning.push("Local controversy — consider targeted supporter briefing in affected geography.");
  }

  // ── Default fallback ──────────────────────────────────────────────────────
  if (actionType === "no_action" && sevRank >= 2) {
    actionType = "internal_note";
    reasoning.push("Moderate severity — create internal note for team awareness.");
  }

  const dedupedChannels = channels.filter((v, i, a) => a.indexOf(v) === i);

  return {
    actionType,
    urgencyLevel,
    suggestedChannels: dedupedChannels.length > 0 ? dedupedChannels : ["email"],
    suggestedAudienceFilter: audienceFilter,
    reasoning: reasoning.join(" "),
  };
}

export function computeImpactScore(params: {
  severityRank: number;
  velocityScore: number;
  alertCount: number;
  isNegative: boolean;
  isNews: boolean;
}): number {
  let score = params.severityRank * 20;
  score += Math.min(params.velocityScore * 5, 25);
  score += Math.min(params.alertCount * 3, 15);
  if (params.isNegative) score += 10;
  if (params.isNews) score += 10;
  return Math.min(Math.round(score), 100);
}
