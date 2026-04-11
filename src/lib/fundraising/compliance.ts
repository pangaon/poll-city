/**
 * Fundraising compliance evaluation engine.
 * Runs at donation creation time and on manual review.
 * Returns a complianceStatus and optional reason.
 */

import prisma from "@/lib/db/prisma";

const CORPORATE_KEYWORDS = [
  "inc", "corp", "ltd", "llc", "co.", "company", "limited",
  "incorporated", "holdings", "enterprises", "group",
];
const UNION_KEYWORDS = [
  "union", "local ", "ufcw", "cupe", "osstf", "opseu", "unifor",
  "seiu", "ibew", "iamaw", "usw", "amalgamated",
];

// Ontario municipal defaults
export const DEFAULT_COMPLIANCE_CONFIG = {
  annualLimitPerDonor: 1200,    // $1,200 CAD
  anonymousLimit: 25,           // $25 CAD
  allowCorporate: false,
  allowUnion: false,
  blockMode: "review" as "review" | "block",
  warningThreshold: 0.9,
};

export interface ComplianceResult {
  status: "pending" | "approved" | "flagged" | "over_limit" | "blocked";
  reason?: string;
}

export function detectEntityType(name: string): "corporate" | "union" | null {
  const lower = name.toLowerCase();
  if (CORPORATE_KEYWORDS.some((k) => lower.includes(k))) return "corporate";
  if (UNION_KEYWORDS.some((k) => lower.includes(k))) return "union";
  return null;
}

/**
 * Evaluate compliance for a new or updated donation.
 * Returns a ComplianceResult to set on the Donation record.
 */
export async function evaluateCompliance(opts: {
  campaignId: string;
  contactId: string | null;
  amount: number;
  isAnonymous: boolean;
  excludeDonationId?: string; // exclude self when re-evaluating
  config?: typeof DEFAULT_COMPLIANCE_CONFIG;
}): Promise<ComplianceResult> {
  // Load per-campaign config from DB when not passed inline
  let dbConfig: Partial<typeof DEFAULT_COMPLIANCE_CONFIG> = {};
  if (!opts.config) {
    const row = await prisma.fundraisingComplianceConfig.findUnique({
      where: { campaignId: opts.campaignId },
      select: {
        annualLimitPerDonor: true,
        anonymousLimit: true,
        allowCorporate: true,
        allowUnion: true,
        blockMode: true,
        warningThreshold: true,
      },
    });
    if (row) {
      dbConfig = {
        annualLimitPerDonor: row.annualLimitPerDonor,
        anonymousLimit: row.anonymousLimit,
        allowCorporate: row.allowCorporate,
        allowUnion: row.allowUnion,
        blockMode: row.blockMode as "review" | "block",
        warningThreshold: row.warningThreshold,
      };
    }
  }
  const cfg = { ...DEFAULT_COMPLIANCE_CONFIG, ...(opts.config ?? dbConfig) };

  // R-002 — Anonymous cap (always hard block)
  if (opts.isAnonymous && opts.amount > cfg.anonymousLimit) {
    return {
      status: "blocked",
      reason: `Anonymous donations cannot exceed $${cfg.anonymousLimit}. Received $${opts.amount}.`,
    };
  }

  // Auto-approve if no contact to aggregate
  if (!opts.contactId) {
    return { status: opts.isAnonymous ? "approved" : "pending" };
  }

  // R-003 — Corporate / union name check
  const contact = await prisma.contact.findUnique({
    where: { id: opts.contactId },
    select: { firstName: true, lastName: true },
  });
  if (contact) {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    const entityType = detectEntityType(fullName);
    if (entityType === "corporate" && !cfg.allowCorporate) {
      return { status: "flagged", reason: `Possible corporate contribution detected (${fullName}). Requires manual review.` };
    }
    if (entityType === "union" && !cfg.allowUnion) {
      return { status: "flagged", reason: `Possible union contribution detected (${fullName}). Requires manual review.` };
    }
  }

  // R-001 — Annual limit aggregation
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const aggregate = await prisma.donation.aggregate({
    where: {
      campaignId: opts.campaignId,
      contactId: opts.contactId,
      donationDate: { gte: yearStart, lt: yearEnd },
      status: { notIn: ["cancelled", "refunded"] },
      deletedAt: null,
      ...(opts.excludeDonationId ? { NOT: { id: opts.excludeDonationId } } : {}),
    },
    _sum: { amount: true },
  });

  const existingTotal = aggregate._sum.amount ?? 0;
  const newTotal = existingTotal + opts.amount;

  if (newTotal > cfg.annualLimitPerDonor) {
    if (cfg.blockMode === "block") {
      return {
        status: "blocked",
        reason: `Annual limit of $${cfg.annualLimitPerDonor} exceeded. Current total would be $${newTotal.toFixed(2)}.`,
      };
    }
    return {
      status: "over_limit",
      reason: `Donation would bring annual total to $${newTotal.toFixed(2)}, exceeding the $${cfg.annualLimitPerDonor} limit.`,
    };
  }

  if (newTotal > cfg.annualLimitPerDonor * cfg.warningThreshold) {
    return {
      status: "flagged",
      reason: `Donor is approaching annual limit. Total would be $${newTotal.toFixed(2)} of $${cfg.annualLimitPerDonor} limit.`,
    };
  }

  return { status: "approved" };
}

/**
 * Recalculate and update a DonorProfile after any donation change.
 */
export async function refreshDonorProfile(
  campaignId: string,
  contactId: string,
): Promise<void> {
  const donations = await prisma.donation.findMany({
    where: {
      campaignId,
      contactId,
      status: { notIn: ["cancelled", "failed"] },
      deletedAt: null,
    },
    select: { amount: true, refundedAmount: true, donationDate: true, isRecurring: true },
    orderBy: { donationDate: "asc" },
  });

  const lifetime = donations.reduce(
    (sum, d) => sum + d.amount - (d.refundedAmount ?? 0),
    0,
  );
  const count = donations.length;
  const first = donations[0]?.donationDate ?? null;
  const last = donations[donations.length - 1]?.donationDate ?? null;
  const largest = donations.reduce(
    (max, d) => Math.max(max, d.amount),
    0,
  );
  const hasRecurring = donations.some((d) => d.isRecurring);

  // Compute tier
  let donorTier: "general" | "silver" | "gold" | "platinum" | "major" = "general";
  if (lifetime >= 1000) donorTier = "major";
  else if (lifetime >= 500) donorTier = "platinum";
  else if (lifetime >= 250) donorTier = "gold";
  else if (lifetime >= 100) donorTier = "silver";

  // Compute status
  const daysSinceLastDonation = last
    ? (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  let donorStatus: "prospect" | "first_time" | "repeat" | "lapsed" | "major" | "recurring" | "champion" = "first_time";
  if (count === 0) donorStatus = "prospect";
  else if (count === 1) donorStatus = "first_time";
  else if (daysSinceLastDonation > 365) donorStatus = "lapsed";
  else if (donorTier === "major" && hasRecurring) donorStatus = "champion";
  else if (donorTier === "major") donorStatus = "major";
  else if (hasRecurring) donorStatus = "recurring";
  else donorStatus = "repeat";

  await prisma.donorProfile.upsert({
    where: { contactId },
    create: {
      campaignId,
      contactId,
      lifetimeGiving: lifetime,
      donationCount: count,
      firstDonationDate: first,
      lastDonationDate: last,
      largestDonation: largest || null,
      recurringDonor: hasRecurring,
      donorTier,
      donorStatus,
    },
    update: {
      lifetimeGiving: lifetime,
      donationCount: count,
      firstDonationDate: first,
      lastDonationDate: last,
      largestDonation: largest || null,
      recurringDonor: hasRecurring,
      donorTier,
      donorStatus,
    },
  });
}
