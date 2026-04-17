import { detectAnnouncementPhrase, detectJurisdiction, detectOffice, normalizeOffice } from "@/lib/intel/phrases";

describe("detectAnnouncementPhrase", () => {
  it("detects strong certification phrase", () => {
    const result = detectAnnouncementPhrase("She filed nomination papers yesterday");
    expect(result).not.toBeNull();
    expect(result!.strength).toBe("strong");
  });

  it("detects moderate announcement", () => {
    const result = detectAnnouncementPhrase("John Smith announced his candidacy for city councillor");
    expect(result).not.toBeNull();
    expect(result!.strength).toBe("moderate");
  });

  it("detects running-for phrase", () => {
    const result = detectAnnouncementPhrase("Maria Perez is running for Ward 5 councillor");
    expect(result).not.toBeNull();
    expect(result!.strength).toBe("moderate");
  });

  it("detects weak consideration phrase", () => {
    const result = detectAnnouncementPhrase("The councillor is considering a run for mayor");
    expect(result).not.toBeNull();
    expect(result!.strength).toBe("weak");
  });

  it("returns null when no phrase detected", () => {
    const result = detectAnnouncementPhrase("City announces new transit plan for 2027");
    expect(result).toBeNull();
  });

  it("prioritises strongest match when multiple exist", () => {
    const result = detectAnnouncementPhrase("She filed nomination papers and announced her candidacy");
    expect(result!.strength).toBe("strong");
  });
});

describe("detectOffice", () => {
  it("detects councillor", () => {
    expect(detectOffice("running for city councillor in Ward 5")).not.toBeNull();
  });

  it("detects mayor", () => {
    expect(detectOffice("seeking the position of mayor")).not.toBeNull();
  });

  it("detects MP", () => {
    expect(detectOffice("running for MP in Brampton East")).not.toBeNull();
  });

  it("returns null when no office", () => {
    expect(detectOffice("Nothing about any elected position here")).toBeNull();
  });
});

describe("detectJurisdiction", () => {
  it("detects Toronto", () => {
    expect(detectJurisdiction("A candidate in Toronto filed papers")).toBe("Toronto");
  });

  it("detects Brampton", () => {
    expect(detectJurisdiction("Running for Brampton city council")).toBe("Brampton");
  });

  it("returns null for unknown city", () => {
    expect(detectJurisdiction("A city in northern Canada")).toBeNull();
  });
});

describe("normalizeOffice", () => {
  it("normalizes councillor variants", () => {
    expect(normalizeOffice("City Councillor")).toBe("councillor");
    expect(normalizeOffice("Alderman")).toBe("councillor");
    expect(normalizeOffice("Council Member")).toBe("councillor");
  });

  it("normalizes mayor", () => {
    expect(normalizeOffice("Deputy Mayor")).toBe("mayor");
  });

  it("normalizes MP", () => {
    expect(normalizeOffice("Member of Parliament")).toBe("mp");
    expect(normalizeOffice("MP")).toBe("mp");
  });
});
