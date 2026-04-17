import { computeCandidateScore, ScoringInput } from "@/lib/intel/scorer";

const baseInput: ScoringInput = {
  sourceAuthorityScore: 1.0,
  sourceType: "official_list",
  phraseStrength: "strong",
  hasCandidateName: true,
  hasOffice: true,
  hasJurisdiction: true,
  hasWardOrRiding: true,
  detectedAt: new Date(),
  corroborationCount: 0,
};

describe("computeCandidateScore", () => {
  it("returns max score for perfect official_list input", () => {
    const { score } = computeCandidateScore(baseInput);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("authority contribution scales with score", () => {
    const high = computeCandidateScore({ ...baseInput, sourceAuthorityScore: 1.0 });
    const low = computeCandidateScore({ ...baseInput, sourceAuthorityScore: 0.2 });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("phrase strength affects score", () => {
    const strong = computeCandidateScore({ ...baseInput, phraseStrength: "strong" });
    const weak = computeCandidateScore({ ...baseInput, phraseStrength: "weak" });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("missing name reduces score", () => {
    // Use a sub-max input so the cap doesn't flatten the difference
    const sub = { ...baseInput, sourceAuthorityScore: 0.3, corroborationCount: 0 };
    const withName = computeCandidateScore({ ...sub, hasCandidateName: true });
    const noName = computeCandidateScore({ ...sub, hasCandidateName: false });
    expect(withName.score).toBeGreaterThan(noName.score);
    // breakdown.candidateName should always be 15 regardless of cap
    expect(withName.breakdown.candidateName).toBe(15);
    expect(noName.breakdown.candidateName).toBe(0);
  });

  it("old content gets no recency bonus", () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    const fresh = computeCandidateScore({ ...baseInput, detectedAt: new Date() });
    const stale = computeCandidateScore({ ...baseInput, detectedAt: old });
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it("corroboration adds points up to cap", () => {
    // Use sub-max input so raw score room exists
    const sub = { ...baseInput, sourceAuthorityScore: 0.3, corroborationCount: 0 };
    const none = computeCandidateScore({ ...sub, corroborationCount: 0 });
    const two = computeCandidateScore({ ...sub, corroborationCount: 2 });
    const ten = computeCandidateScore({ ...sub, corroborationCount: 10 });
    expect(two.score).toBeGreaterThan(none.score);
    // breakdown.corroboration caps at 16 (2 × 8)
    expect(two.breakdown.corroboration).toBe(16);
    expect(ten.breakdown.corroboration).toBe(16);
    // ten and two have identical corroboration breakdown → same score
    expect(ten.score).toBe(two.score);
  });

  it("score is always 0-100", () => {
    const extremes: ScoringInput[] = [
      { ...baseInput, sourceAuthorityScore: 0, phraseStrength: "none", hasCandidateName: false, hasOffice: false, hasJurisdiction: false, hasWardOrRiding: false, corroborationCount: 0 },
      { ...baseInput, sourceAuthorityScore: 1.0, corroborationCount: 99 },
    ];
    for (const input of extremes) {
      const { score } = computeCandidateScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("social source type reduces authority vs official_list", () => {
    const official = computeCandidateScore({ ...baseInput, sourceType: "official_list" });
    const social = computeCandidateScore({ ...baseInput, sourceType: "social" });
    expect(official.score).toBeGreaterThan(social.score);
  });
});
