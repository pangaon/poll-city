import { describe, it, expect } from "@jest/globals";
import { z } from "zod";

/* ─── Re-declare validation schemas (mirrors the route logic) ─────────────── */

const resultSchema = z.object({
  candidateId: z.string().min(1),
  votes: z.number().int().min(0),
});

const submitSchema = z.object({
  locationId: z.string().min(1),
  results: z.array(resultSchema).min(1),
  totalVotes: z.number().int().min(0).nullish(),
  rejectedBallots: z.number().int().min(0).nullish(),
  percentReporting: z.number().min(0).max(100).default(100),
  notes: z.string().max(2000).nullish(),
  isDraft: z.boolean().default(false),
});

const createEventSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  eventType: z.enum(["advance_vote", "election_day", "custom"]),
  office: z.string().min(1).max(200),
  municipality: z.string().min(1).max(200),
  province: z.string().length(2),
  requireDoubleEntry: z.boolean().default(true),
});

/* ─── Submission validation ──────────────────────────────────────────────── */

describe("submit schema", () => {
  it("accepts valid submission", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [
        { candidateId: "cand_1", votes: 142 },
        { candidateId: "cand_2", votes: 87 },
      ],
      percentReporting: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero votes (valid edge case)", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "cand_1", votes: 0 }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.results[0].votes).toBe(0);
  });

  it("rejects negative votes", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "cand_1", votes: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects decimal votes", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "cand_1", votes: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty results array", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects percentReporting > 100", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "c1", votes: 10 }],
      percentReporting: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts partial reporting (1-99%)", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "c1", votes: 10 }],
      percentReporting: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.percentReporting).toBe(50);
  });

  it("defaults isDraft to false", () => {
    const result = submitSchema.safeParse({
      locationId: "loc_abc",
      results: [{ candidateId: "c1", votes: 10 }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isDraft).toBe(false);
  });
});

/* ─── Event creation validation ──────────────────────────────────────────── */

describe("createEvent schema", () => {
  it("accepts valid event", () => {
    const result = createEventSchema.safeParse({
      campaignId: "cmp_1",
      name: "Election Day Oct 28",
      eventType: "election_day",
      office: "Mayor",
      municipality: "Toronto",
      province: "ON",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createEventSchema.safeParse({
      campaignId: "cmp_1",
      name: "",
      eventType: "election_day",
      office: "Mayor",
      municipality: "Toronto",
      province: "ON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid eventType", () => {
    const result = createEventSchema.safeParse({
      campaignId: "cmp_1",
      name: "Test",
      eventType: "general_election", // invalid
      office: "Mayor",
      municipality: "Toronto",
      province: "ON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects province longer than 2 chars", () => {
    const result = createEventSchema.safeParse({
      campaignId: "cmp_1",
      name: "Test",
      eventType: "election_day",
      office: "Mayor",
      municipality: "Toronto",
      province: "Ontario", // must be 2 chars
    });
    expect(result.success).toBe(false);
  });
});

/* ─── Aggregation logic ──────────────────────────────────────────────────── */

describe("vote aggregation", () => {
  interface SubmResult { candidateId: string; votes: number; }
  interface Submission { status: string; results: SubmResult[]; }

  function aggregateApproved(submissions: Submission[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const sub of submissions.filter((s) => s.status === "approved")) {
      for (const r of sub.results) {
        totals[r.candidateId] = (totals[r.candidateId] ?? 0) + r.votes;
      }
    }
    return totals;
  }

  it("only counts approved submissions", () => {
    const submissions: Submission[] = [
      { status: "approved", results: [{ candidateId: "c1", votes: 100 }] },
      { status: "pending_review", results: [{ candidateId: "c1", votes: 50 }] },
      { status: "flagged", results: [{ candidateId: "c1", votes: 200 }] },
    ];
    const totals = aggregateApproved(submissions);
    expect(totals["c1"]).toBe(100);
  });

  it("sums across multiple approved submissions", () => {
    const submissions: Submission[] = [
      { status: "approved", results: [{ candidateId: "c1", votes: 142 }, { candidateId: "c2", votes: 87 }] },
      { status: "approved", results: [{ candidateId: "c1", votes: 95 }, { candidateId: "c2", votes: 203 }] },
    ];
    const totals = aggregateApproved(submissions);
    expect(totals["c1"]).toBe(237);
    expect(totals["c2"]).toBe(290);
  });

  it("handles empty submissions array", () => {
    const totals = aggregateApproved([]);
    expect(Object.keys(totals)).toHaveLength(0);
  });
});

/* ─── Anomaly detection logic ────────────────────────────────────────────── */

describe("anomaly detection", () => {
  function detectAnomaly(
    results: { votes: number }[],
    totalVotes: number,
    threshold: number
  ): boolean {
    if (!totalVotes || results.length === 0) return false;
    const expectedPerCandidate = totalVotes / results.length;
    return results.some((r) => {
      const deviation = Math.abs(r.votes - expectedPerCandidate) / (expectedPerCandidate || 1);
      return deviation > threshold / 100;
    });
  }

  it("flags when one candidate has wildly more votes", () => {
    const flagged = detectAnomaly(
      [{ votes: 950 }, { votes: 50 }],
      1000,
      30 // 30% threshold
    );
    expect(flagged).toBe(true);
  });

  it("does not flag balanced results", () => {
    const flagged = detectAnomaly(
      [{ votes: 520 }, { votes: 480 }],
      1000,
      30
    );
    expect(flagged).toBe(false);
  });

  it("handles zero total votes without throwing", () => {
    const flagged = detectAnomaly([{ votes: 0 }, { votes: 0 }], 0, 30);
    expect(flagged).toBe(false);
  });
});

/* ─── Double-entry matching logic ────────────────────────────────────────── */

describe("double-entry verification", () => {
  function checkDoubleEntry(
    firstEntry: Record<string, number>,
    secondEntry: Record<string, number>
  ): "match" | "mismatch" {
    const keys = Array.from(new Set([...Object.keys(firstEntry), ...Object.keys(secondEntry)]));
    for (const key of keys) {
      if ((firstEntry[key] ?? 0) !== (secondEntry[key] ?? 0)) return "mismatch";
    }
    return "match";
  }

  it("returns match when all votes identical", () => {
    expect(checkDoubleEntry({ c1: 100, c2: 50 }, { c1: 100, c2: 50 })).toBe("match");
  });

  it("returns mismatch when any vote differs", () => {
    expect(checkDoubleEntry({ c1: 100, c2: 50 }, { c1: 100, c2: 51 })).toBe("mismatch");
  });

  it("returns mismatch when a candidate appears in one but not the other", () => {
    expect(checkDoubleEntry({ c1: 100 }, { c1: 100, c2: 0 })).toBe("match"); // 0 default
    expect(checkDoubleEntry({ c1: 100 }, { c1: 100, c2: 5 })).toBe("mismatch");
  });

  it("handles zero votes on both sides as match", () => {
    expect(checkDoubleEntry({ c1: 0 }, { c1: 0 })).toBe("match");
  });
});
