import type { FoodVendor, FoodVendorPricingTier, FoodQuote } from "@prisma/client";

export interface VendorWithTiers extends FoodVendor {
  pricingTiers: FoodVendorPricingTier[];
  quotes?: FoodQuote[];
}

export interface RankingInput {
  vendor: VendorWithTiers;
  headcount: number;
  neededByDate: Date;
  requestedAtDate: Date;
  budgetCapCad?: number | null;
  requestLocation?: string | null;
  requiredDietaryOptions?: string[];
}

export interface ScoreBreakdown {
  priceScore: number;        // 0–100
  reliabilityScore: number;  // 0–100
  leadTimeScore: number;     // 0–100
  distanceScore: number;     // 0–100
  dietaryFitScore: number;   // 0–100
  partnershipScore: number;  // 0–100
  totalScore: number;        // 0–100 weighted
}

const WEIGHTS = {
  price: 0.30,
  reliability: 0.25,
  leadTime: 0.15,
  distance: 0.10,
  dietaryFit: 0.10,
  partnership: 0.10,
} as const;

export function estimatePricePerHead(vendor: VendorWithTiers, headcount: number): number | null {
  if (!vendor.pricingTiers.length) return null;
  const active = vendor.pricingTiers.filter((t) => t.isActive);
  if (!active.length) return null;

  // Find the most applicable tier by headcount range
  const matching = active.filter((t) => {
    const minOk = t.minHeads == null || headcount >= t.minHeads;
    const maxOk = t.maxHeads == null || headcount <= t.maxHeads;
    return minOk && maxOk;
  });

  if (matching.length > 0) {
    // Prefer the tier with tightest bounds
    const best = matching.sort((a, b) => {
      const aRange = (a.maxHeads ?? 9999) - (a.minHeads ?? 0);
      const bRange = (b.maxHeads ?? 9999) - (b.minHeads ?? 0);
      return aRange - bRange;
    })[0];
    return Number(best.pricePerHead);
  }

  // Fallback: cheapest active tier
  return Number(active.sort((a, b) => Number(a.pricePerHead) - Number(b.pricePerHead))[0].pricePerHead);
}

function scorePriceComponent(
  pricePerHead: number | null,
  budgetCapCad: number | null | undefined,
  headcount: number
): number {
  if (pricePerHead == null) return 30; // neutral if no pricing info

  if (budgetCapCad != null && headcount > 0) {
    const budgetPph = budgetCapCad / headcount;
    // Full score if under 70% of budget; zero if over 130%
    if (pricePerHead <= budgetPph * 0.70) return 100;
    if (pricePerHead <= budgetPph) return 80;
    if (pricePerHead <= budgetPph * 1.10) return 60;
    if (pricePerHead <= budgetPph * 1.20) return 40;
    if (pricePerHead <= budgetPph * 1.30) return 20;
    return 0;
  }

  // No budget cap — rank by absolute price per head
  // $0–8: 100, $8–12: 80, $12–18: 60, $18–25: 40, $25+: 20
  if (pricePerHead <= 8) return 100;
  if (pricePerHead <= 12) return 80;
  if (pricePerHead <= 18) return 60;
  if (pricePerHead <= 25) return 40;
  return 20;
}

function scoreLeadTime(
  vendor: VendorWithTiers,
  neededByDate: Date,
  requestedAtDate: Date
): number {
  const hoursAvailable = (neededByDate.getTime() - requestedAtDate.getTime()) / 3_600_000;
  const daysAvailable = hoursAvailable / 24;

  // Best lead time from any active tier
  const minLead = vendor.pricingTiers.length
    ? Math.min(...vendor.pricingTiers.filter((t) => t.isActive).map((t) => t.leadTimeDays))
    : 1;

  if (vendor.sameDay && hoursAvailable < 24) return 100;

  if (daysAvailable >= minLead * 2) return 100;
  if (daysAvailable >= minLead * 1.5) return 80;
  if (daysAvailable >= minLead) return 60;
  if (daysAvailable >= minLead * 0.75) return 30;
  return 0;
}

function scoreDietaryFit(vendor: FoodVendor, required: string[]): number {
  if (!required.length) return 100;
  const available = new Set(vendor.dietaryOptions.map((d) => d.toLowerCase()));
  const matched = required.filter((r) => available.has(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function scorePartnership(vendor: FoodVendor): number {
  // partnershipTier: 0=none, 1=preferred, 2=partner
  if (vendor.partnershipTier >= 2) return 100;
  if (vendor.partnershipTier === 1) return 60;
  return 20;
}

export function rankVendor(input: RankingInput): ScoreBreakdown {
  const { vendor, headcount, neededByDate, requestedAtDate, budgetCapCad, requiredDietaryOptions = [] } = input;

  const pricePerHead = estimatePricePerHead(vendor, headcount);

  const priceScore = scorePriceComponent(pricePerHead, budgetCapCad, headcount);
  const reliabilityScore = Math.min(100, Math.max(0, vendor.reliabilityScore));
  const leadTimeScore = scoreLeadTime(vendor, neededByDate, requestedAtDate);
  const distanceScore = 50; // placeholder — geo distance not yet implemented
  const dietaryFitScore = scoreDietaryFit(vendor, requiredDietaryOptions);
  const partnershipScore = scorePartnership(vendor);

  const totalScore = Math.round(
    priceScore * WEIGHTS.price +
    reliabilityScore * WEIGHTS.reliability +
    leadTimeScore * WEIGHTS.leadTime +
    distanceScore * WEIGHTS.distance +
    dietaryFitScore * WEIGHTS.dietaryFit +
    partnershipScore * WEIGHTS.partnership
  );

  return { priceScore, reliabilityScore, leadTimeScore, distanceScore, dietaryFitScore, partnershipScore, totalScore };
}

export function rankVendors(
  vendors: VendorWithTiers[],
  params: Omit<RankingInput, "vendor">
): Array<{ vendor: VendorWithTiers; score: ScoreBreakdown; estimatedPricePerHead: number | null }> {
  return vendors
    .map((vendor) => ({
      vendor,
      score: rankVendor({ vendor, ...params }),
      estimatedPricePerHead: estimatePricePerHead(vendor, params.headcount),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}
