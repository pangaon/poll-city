/**
 * RCAE Rule Engine — unit tests
 * Tests the deterministic recommendation logic without any DB dependency.
 */

import { generateRecommendation, computeImpactScore } from "../../lib/reputation/rule-engine";
import type { RuleEngineInput } from "../../lib/reputation/types";

function makeInput(overrides: Partial<RuleEngineInput> = {}): RuleEngineInput {
  return {
    severity: "medium",
    sentiment: "neutral",
    sourceType: "manual",
    velocityScore: 0,
    category: "general",
    geography: null,
    issueAgeHours: 0,
    existingRecommendationCount: 0,
    ...overrides,
  };
}

// ─── generateRecommendation ──────────────────────────────────────────────────

describe("generateRecommendation", () => {
  it("returns no_action for low severity general issue", () => {
    const result = generateRecommendation(makeInput({ severity: "low" }));
    expect(result.actionType).toBe("no_action");
    expect(result.urgencyLevel).toBe("monitor");
  });

  it("escalates critical severity immediately", () => {
    const result = generateRecommendation(makeInput({ severity: "critical" }));
    expect(result.actionType).toBe("escalate");
    expect(result.urgencyLevel).toBe("immediate");
  });

  it("suggests publish_response_page for misinformation", () => {
    const result = generateRecommendation(makeInput({ category: "misinformation", severity: "medium" }));
    expect(result.actionType).toBe("publish_response_page");
    expect(result.suggestedChannels).toContain("email");
    expect(result.suggestedChannels).toContain("sms");
  });

  it("suggests media_response for media_inquiry", () => {
    const result = generateRecommendation(makeInput({ category: "media_inquiry" }));
    expect(result.actionType).toBe("media_response");
    expect(result.urgencyLevel).not.toBe("monitor");
  });

  it("suppresses outbound for legal issues", () => {
    const result = generateRecommendation(makeInput({ category: "legal", severity: "high" }));
    expect(result.actionType).toBe("suppress_outbound");
    expect(result.reasoning).toContain("Legal");
  });

  it("suppresses outbound for financial issues", () => {
    const result = generateRecommendation(makeInput({ category: "financial", severity: "medium" }));
    expect(result.actionType).toBe("suppress_outbound");
  });

  it("escalates urgency on high velocity score", () => {
    const result = generateRecommendation(makeInput({ velocityScore: 9 }));
    expect(result.urgencyLevel).not.toBe("monitor");
    expect(result.reasoning).toMatch(/velocity/i);
  });

  it("includes geography in audience filter for local_controversy", () => {
    const result = generateRecommendation(makeInput({
      category: "local_controversy",
      sentiment: "negative",
      severity: "high",
      geography: "Ward 3",
    }));
    expect((result.suggestedAudienceFilter as Record<string, unknown>).geography).toBe("Ward 3");
  });

  it("high severity + negative = within_hour urgency at minimum", () => {
    const result = generateRecommendation(makeInput({ severity: "high", sentiment: "negative" }));
    expect(["immediate", "within_hour"]).toContain(result.urgencyLevel);
  });

  it("nudges stale issues with no existing recommendations", () => {
    const result = generateRecommendation(makeInput({ issueAgeHours: 48, existingRecommendationCount: 0 }));
    expect(result.reasoning).toMatch(/24\+ hours/);
  });

  it("policy issue gets supporter briefing with email channel", () => {
    const result = generateRecommendation(makeInput({ category: "policy" }));
    expect(result.actionType).toBe("send_supporter_briefing");
    expect(result.suggestedChannels).toContain("email");
  });

  it("does not downgrade urgency — only upgrades", () => {
    const critical = generateRecommendation(makeInput({ severity: "critical", velocityScore: 1 }));
    expect(critical.urgencyLevel).toBe("immediate");
  });

  it("returns non-empty reasoning string", () => {
    const result = generateRecommendation(makeInput({ severity: "high", sentiment: "negative" }));
    expect(result.reasoning.length).toBeGreaterThan(10);
  });
});

// ─── computeImpactScore ──────────────────────────────────────────────────────

describe("computeImpactScore", () => {
  it("critical severity produces high impact", () => {
    const score = computeImpactScore({ severityRank: 4, velocityScore: 8, alertCount: 3, isNegative: true, isNews: true });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("low severity with no signals produces low score", () => {
    const score = computeImpactScore({ severityRank: 1, velocityScore: 0, alertCount: 0, isNegative: false, isNews: false });
    expect(score).toBeLessThan(30);
  });

  it("is capped at 100", () => {
    const score = computeImpactScore({ severityRank: 4, velocityScore: 10, alertCount: 20, isNegative: true, isNews: true });
    expect(score).toBe(100);
  });

  it("negative sentiment adds to score", () => {
    const base = computeImpactScore({ severityRank: 2, velocityScore: 0, alertCount: 0, isNegative: false, isNews: false });
    const neg = computeImpactScore({ severityRank: 2, velocityScore: 0, alertCount: 0, isNegative: true, isNews: false });
    expect(neg).toBeGreaterThan(base);
  });

  it("news source adds to score", () => {
    const base = computeImpactScore({ severityRank: 2, velocityScore: 0, alertCount: 0, isNegative: false, isNews: false });
    const news = computeImpactScore({ severityRank: 2, velocityScore: 0, alertCount: 0, isNegative: false, isNews: true });
    expect(news).toBeGreaterThan(base);
  });
});
