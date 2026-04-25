import { parseTranscriptRules, toSupportLevel } from "@/lib/canvasser/service";

describe("toSupportLevel", () => {
  it("maps strong support outcomes", () => {
    expect(toSupportLevel("STRONG_SUPPORT")).toBe("strong_support");
    expect(toSupportLevel("LEAN_SUPPORT")).toBe("leaning_support");
    expect(toSupportLevel("UNDECIDED")).toBe("undecided");
  });

  it("maps opposition outcomes conservatively", () => {
    expect(toSupportLevel("LEAN_OPPOSE")).toBe("leaning_opposition");
    expect(toSupportLevel("OPPOSE")).toBe("leaning_opposition");
  });

  it("returns null for unsupported outcomes", () => {
    expect(toSupportLevel("NOT_HOME")).toBeNull();
    expect(toSupportLevel("DECEASED")).toBeNull();
  });
});

describe("parseTranscriptRules", () => {
  it("parses support + sign + volunteer + car + saturday", () => {
    const parsed = parseTranscriptRules(
      "Supporter wants a sign and can volunteer Saturday mornings. He has a car.",
    );

    const types = parsed.map((p) => p.actionType);
    expect(types).toContain("UPDATE_VOTER_STATUS");
    expect(types).toContain("CREATE_SIGN_REQUEST");
    expect(types).toContain("CREATE_VOLUNTEER_LEAD");

    const volunteer = parsed.find((p) => p.actionType === "CREATE_VOLUNTEER_LEAD");
    expect(volunteer?.payload).toMatchObject({ availability: "Saturday", hasCar: true });
  });

  it("parses hostile safety phrase into high-risk safety action", () => {
    const parsed = parseTranscriptRules("Hostile. Do not return.");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      actionType: "FLAG_SAFETY_ISSUE",
      riskLevel: "high",
      requiresConfirmation: true,
    });
  });

  it("falls back to note-only for unrecognized transcript", () => {
    const parsed = parseTranscriptRules("Met at the door. Nice weather.");
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actionType: "ADD_NOTE", label: "Save transcript as note" }),
      ]),
    );
  });

  it("marks sign creation as requiring address completion", () => {
    const parsed = parseTranscriptRules("Please put up a sign");
    const sign = parsed.find((p) => p.actionType === "CREATE_SIGN_REQUEST");
    expect(sign?.missingFields).toContain("address");
  });
});
