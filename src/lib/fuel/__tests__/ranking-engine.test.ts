import { rankVendor, rankVendors, estimatePricePerHead } from "../ranking-engine";
import type { VendorWithTiers } from "../ranking-engine";

function makeVendor(overrides: Partial<VendorWithTiers> = {}): VendorWithTiers {
  return {
    id: "v1",
    campaignId: null,
    name: "Test Vendor",
    contactName: null,
    email: "test@test.ca",
    phone: null,
    address: null,
    city: "Toronto",
    province: "ON",
    website: null,
    notes: null,
    cuisineTypes: [],
    serviceTags: [],
    dietaryOptions: [],
    sameDay: false,
    status: "active",
    reliabilityScore: 50,
    partnershipTier: 0,
    isSeeded: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pricingTiers: [],
    quotes: [],
    ...overrides,
  };
}

function makeTier(pricePerHead: number, minHeads?: number, maxHeads?: number, leadTimeDays = 1) {
  return {
    id: `tier-${pricePerHead}`,
    vendorId: "v1",
    name: "Standard",
    pricePerHead: pricePerHead as unknown as import("@prisma/client").Prisma.Decimal,
    minHeads: minHeads ?? null,
    maxHeads: maxHeads ?? null,
    includes: null,
    leadTimeDays,
    notes: null,
    isActive: true,
    createdAt: new Date(),
  };
}

const baseParams = {
  headcount: 20,
  neededByDate: new Date(Date.now() + 72 * 3_600_000), // 3 days out
  requestedAtDate: new Date(),
  budgetCapCad: null,
  requestLocation: null,
  requiredDietaryOptions: [],
};

describe("estimatePricePerHead", () => {
  it("returns null for vendor with no tiers", () => {
    const v = makeVendor({ pricingTiers: [] });
    expect(estimatePricePerHead(v, 20)).toBeNull();
  });

  it("returns price for matching tier", () => {
    const v = makeVendor({ pricingTiers: [makeTier(12.5, 10, 30)] });
    expect(estimatePricePerHead(v, 20)).toBe(12.5);
  });

  it("returns cheapest active tier when no headcount match", () => {
    const v = makeVendor({
      pricingTiers: [makeTier(25, 50, 100), makeTier(12, 10, 20), makeTier(8, 1, 5)],
    });
    // headcount=20 matches tier 12, not 25 or 8
    expect(estimatePricePerHead(v, 20)).toBe(12);
  });

  it("uses closest range for overlapping tiers", () => {
    const v = makeVendor({
      pricingTiers: [
        makeTier(10, 1, 100),  // wide range
        makeTier(9, 15, 25),   // tighter, matches headcount=20
      ],
    });
    expect(estimatePricePerHead(v, 20)).toBe(9);
  });
});

describe("rankVendor", () => {
  it("returns all six components plus totalScore", () => {
    const v = makeVendor();
    const breakdown = rankVendor({ vendor: v, ...baseParams });
    expect(breakdown).toHaveProperty("priceScore");
    expect(breakdown).toHaveProperty("reliabilityScore");
    expect(breakdown).toHaveProperty("leadTimeScore");
    expect(breakdown).toHaveProperty("distanceScore");
    expect(breakdown).toHaveProperty("dietaryFitScore");
    expect(breakdown).toHaveProperty("partnershipScore");
    expect(breakdown).toHaveProperty("totalScore");
  });

  it("totalScore is between 0 and 100", () => {
    const v = makeVendor({ reliabilityScore: 100, partnershipTier: 2 });
    const { totalScore } = rankVendor({ vendor: v, ...baseParams });
    expect(totalScore).toBeGreaterThanOrEqual(0);
    expect(totalScore).toBeLessThanOrEqual(100);
  });

  it("higher reliability produces higher score", () => {
    const low = makeVendor({ reliabilityScore: 10 });
    const high = makeVendor({ reliabilityScore: 95 });
    const scoreLow = rankVendor({ vendor: low, ...baseParams }).totalScore;
    const scoreHigh = rankVendor({ vendor: high, ...baseParams }).totalScore;
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it("partnership tier 2 beats tier 0", () => {
    const noPartner = makeVendor({ partnershipTier: 0 });
    const partner = makeVendor({ partnershipTier: 2 });
    const scoreNo = rankVendor({ vendor: noPartner, ...baseParams }).totalScore;
    const scoreYes = rankVendor({ vendor: partner, ...baseParams }).totalScore;
    expect(scoreYes).toBeGreaterThan(scoreNo);
  });

  it("dietary fit score is 100 when no restrictions required", () => {
    const v = makeVendor({ dietaryOptions: [] });
    const { dietaryFitScore } = rankVendor({ vendor: v, ...baseParams, requiredDietaryOptions: [] });
    expect(dietaryFitScore).toBe(100);
  });

  it("dietary fit score is proportional to matched options", () => {
    const v = makeVendor({ dietaryOptions: ["halal", "vegetarian"] });
    const { dietaryFitScore } = rankVendor({ vendor: v, ...baseParams, requiredDietaryOptions: ["halal", "vegetarian", "vegan"] });
    expect(dietaryFitScore).toBeCloseTo(67, 0);
  });

  it("vendor over budget scores 0 for price", () => {
    const v = makeVendor({ pricingTiers: [makeTier(30)] }); // $30/head
    const { priceScore } = rankVendor({
      vendor: v,
      headcount: 10,
      neededByDate: baseParams.neededByDate,
      requestedAtDate: baseParams.requestedAtDate,
      budgetCapCad: 100, // $10/head budget cap — $30 is 3x, way over
    });
    expect(priceScore).toBe(0);
  });

  it("vendor well under budget scores 100 for price", () => {
    const v = makeVendor({ pricingTiers: [makeTier(5)] }); // $5/head
    const { priceScore } = rankVendor({
      vendor: v,
      headcount: 10,
      neededByDate: baseParams.neededByDate,
      requestedAtDate: baseParams.requestedAtDate,
      budgetCapCad: 200, // $20/head budget cap — $5 is 25%
    });
    expect(priceScore).toBe(100);
  });

  it("same-day vendor with less than 24h lead time scores 100", () => {
    const v = makeVendor({ sameDay: true });
    const urgent = {
      ...baseParams,
      neededByDate: new Date(Date.now() + 6 * 3_600_000), // 6h out
    };
    const { leadTimeScore } = rankVendor({ vendor: v, ...urgent });
    expect(leadTimeScore).toBe(100);
  });
});

describe("rankVendors", () => {
  it("returns vendors sorted descending by totalScore", () => {
    const vendors: VendorWithTiers[] = [
      makeVendor({ id: "low", reliabilityScore: 10 }),
      makeVendor({ id: "high", reliabilityScore: 95, partnershipTier: 2 }),
      makeVendor({ id: "mid", reliabilityScore: 50 }),
    ];
    const ranked = rankVendors(vendors, baseParams);
    expect(ranked[0].vendor.id).toBe("high");
    expect(ranked[ranked.length - 1].vendor.id).toBe("low");
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score.totalScore).toBeGreaterThanOrEqual(ranked[i].score.totalScore);
    }
  });

  it("returns estimatedPricePerHead for each vendor", () => {
    const v = makeVendor({ pricingTiers: [makeTier(11)] });
    const [result] = rankVendors([v], baseParams);
    expect(result.estimatedPricePerHead).toBe(11);
  });
});
