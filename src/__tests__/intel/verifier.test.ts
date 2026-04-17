import { decideVerification, VERIFICATION_THRESHOLDS } from "@/lib/intel/verifier";

describe("decideVerification", () => {
  it("auto-verifies when score >= threshold and all fields present", () => {
    const result = decideVerification({
      confidenceScore: VERIFICATION_THRESHOLDS.AUTO_VERIFY,
      hasCandidateName: true,
      hasOffice: true,
      hasJurisdiction: true,
    });
    expect(result.status).toBe("auto_verified");
  });

  it("sets pending when high score but missing name", () => {
    const result = decideVerification({
      confidenceScore: 80,
      hasCandidateName: false,
      hasOffice: true,
      hasJurisdiction: true,
    });
    expect(result.status).toBe("pending");
    expect(result.reason).toContain("missing");
  });

  it("sets pending for borderline score", () => {
    const result = decideVerification({
      confidenceScore: VERIFICATION_THRESHOLDS.MANUAL_REVIEW,
      hasCandidateName: true,
      hasOffice: true,
      hasJurisdiction: true,
    });
    expect(result.status).toBe("pending");
  });

  it("rejects below minimum threshold", () => {
    const result = decideVerification({
      confidenceScore: VERIFICATION_THRESHOLDS.MANUAL_REVIEW - 1,
      hasCandidateName: true,
      hasOffice: true,
      hasJurisdiction: true,
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects score of 0", () => {
    const result = decideVerification({
      confidenceScore: 0,
      hasCandidateName: false,
      hasOffice: false,
      hasJurisdiction: false,
    });
    expect(result.status).toBe("rejected");
  });
});
