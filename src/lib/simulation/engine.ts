/**
 * Simulation Engine
 *
 * Generates realistic canvassing activity for demo campaigns.
 * NEVER runs on real campaigns. Check isDemo before calling.
 *
 * Kill switch: SIMULATION_ENABLED=false in env disables globally.
 * Per-campaign: only campaigns with isDemo=true are eligible.
 *
 * All generated records have source="simulation" so they can be
 * cleared cleanly before the first real customer onboards.
 */

import prisma from "@/lib/db/prisma";
import { InteractionType, InteractionSource, SupportLevel, FunnelStage } from "@prisma/client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function isSimulationEnabled(): boolean {
  return process.env.SIMULATION_ENABLED !== "false";
}

// Realistic campaign rate: 6–12 doors/hour, 8-hr day = 48–96 per run slot
const BATCH_SIZE_MIN = 8;
const BATCH_SIZE_MAX = 20;

// Support level distribution — mimics a healthy campaign mid-cycle
const SUPPORT_DISTRIBUTION: { level: SupportLevel; weight: number }[] = [
  { level: "strong_support", weight: 28 },
  { level: "leaning_support", weight: 24 },
  { level: "undecided", weight: 26 },
  { level: "leaning_opposition", weight: 12 },
  { level: "strong_opposition", weight: 10 },
];

const SAMPLE_ISSUES = [
  "transit",
  "housing",
  "safety",
  "environment",
  "property_tax",
  "roads",
  "parks",
  "seniors",
  "youth_programs",
  "local_business",
];

function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function pickSupport(): SupportLevel {
  return weightedRandom(
    SUPPORT_DISTRIBUTION.map((d) => ({ value: d.level, weight: d.weight })),
  );
}

function randomBool(probability: number): boolean {
  return Math.random() < probability;
}

function randomSubset<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function pickIssues(): string[] {
  const count = Math.floor(Math.random() * 3); // 0, 1, or 2 issues
  return randomSubset(SAMPLE_ISSUES, count);
}

// ---------------------------------------------------------------------------
// Funnel advancement helper (mirrors funnel-engine logic for sim data)
// ---------------------------------------------------------------------------

function funnelStageForSupport(level: SupportLevel): FunnelStage {
  if (level === "strong_support" || level === "leaning_support") return "supporter";
  return "contact";
}

// ---------------------------------------------------------------------------
// Core run function
// ---------------------------------------------------------------------------

export interface SimRunResult {
  campaignId: string;
  created: number;
  skipped: number;
  signRequests: number;
}

export async function runSimulation(campaignId: string): Promise<SimRunResult> {
  if (!isSimulationEnabled()) {
    return { campaignId, created: 0, skipped: 0, signRequests: 0 };
  }

  // Verify campaign is a demo campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, isDemo: true, isActive: true },
  });

  if (!campaign || !campaign.isDemo || !campaign.isActive) {
    return { campaignId, created: 0, skipped: 0, signRequests: 0 };
  }

  // Pick random contacts that haven't been simmed recently (> 2h ago or never)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const eligibleContacts = await prisma.contact.findMany({
    where: {
      campaignId,
      deletedAt: null,
      isDeceased: false,
      doNotContact: false,
      OR: [
        { lastContactedAt: null },
        { lastContactedAt: { lt: twoHoursAgo } },
      ],
    },
    select: { id: true, funnelStage: true, supportLevel: true },
    take: 500, // sample pool
  });

  if (eligibleContacts.length === 0) {
    return { campaignId, created: 0, skipped: 0, signRequests: 0 };
  }

  const batchSize =
    BATCH_SIZE_MIN +
    Math.floor(Math.random() * (BATCH_SIZE_MAX - BATCH_SIZE_MIN + 1));
  const batch = randomSubset(eligibleContacts, batchSize);

  let created = 0;
  let signRequests = 0;

  // Build interactions + contact updates in batch
  const now = new Date();
  type SimInteraction = {
    contactId: string;
    type: InteractionType;
    source: InteractionSource;
    supportLevel: SupportLevel;
    issues: string[];
    signRequested: boolean;
    volunteerInterest: boolean;
    followUpNeeded: boolean;
    isProxy: boolean;
    createdAt: Date;
  };
  const interactionData: SimInteraction[] = [];
  const contactUpdates: { id: string; support: SupportLevel; funnel: FunnelStage; sign: boolean }[] = [];

  for (const contact of batch) {
    const support = pickSupport();
    const issues = pickIssues();
    const isSupportive = support === "strong_support" || support === "leaning_support";
    const signRequested = isSupportive && randomBool(0.12);
    const volunteerInterest = isSupportive && randomBool(0.08);
    const followUpNeeded = randomBool(0.15);
    const type: InteractionType =
      randomBool(0.7) ? "door_knock" : "phone_call";
    const isProxy = type === "door_knock" && randomBool(0.2);

    // Slightly varied timestamps to look organic
    const offsetMs = Math.floor(Math.random() * 30 * 60 * 1000); // 0–30 min spread
    const createdAt = new Date(now.getTime() - offsetMs);

    interactionData.push({
      contactId: contact.id,
      type,
      source: InteractionSource.simulation,
      supportLevel: support,
      issues,
      signRequested,
      volunteerInterest,
      followUpNeeded,
      isProxy,
      createdAt,
    });

    const funnel = funnelStageForSupport(support);
    contactUpdates.push({ id: contact.id, support, funnel, sign: signRequested });
    if (signRequested) signRequests++;
  }

  // Write all interactions
  await prisma.interaction.createMany({ data: interactionData });
  created = interactionData.length;

  // Update contact records in parallel batches
  await Promise.all(
    contactUpdates.map(({ id, support, funnel, sign }) =>
      prisma.contact.update({
        where: { id },
        data: {
          supportLevel: support,
          funnelStage: funnel,
          lastContactedAt: now,
          ...(sign ? { signRequested: true } : {}),
        },
      }),
    ),
  );

  // Create Sign records for sign requests
  const signContacts = contactUpdates.filter((c) => c.sign);
  if (signContacts.length > 0) {
    // Fetch addresses for sign records
    const contactsWithAddr = await prisma.contact.findMany({
      where: { id: { in: signContacts.map((c) => c.id) } },
      select: { id: true, address1: true, city: true },
    });

    await prisma.sign.createMany({
      data: contactsWithAddr.map((c) => ({
        campaignId,
        contactId: c.id,
        address1: c.address1 || "Unknown",
        city: c.city ?? undefined,
        signType: randomBool(0.6) ? "standard" : randomBool(0.5) ? "large" : "window",
        status: "requested" as const,
      })),
      skipDuplicates: true,
    });
  }

  return { campaignId, created, skipped: batchSize - created, signRequests };
}

// ---------------------------------------------------------------------------
// Clear all simulation data from a campaign
// ---------------------------------------------------------------------------

export async function clearSimulation(campaignId: string): Promise<{ deleted: number }> {
  // Verify it's a demo campaign before clearing
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { isDemo: true },
  });
  if (!campaign?.isDemo) {
    throw new Error("clearSimulation: campaign is not flagged isDemo — refusing to clear");
  }

  const [deletedInteractions] = await Promise.all([
    prisma.interaction.deleteMany({
      where: { contact: { campaignId }, source: InteractionSource.simulation },
    }),
    // Reset contact states touched by simulation
    prisma.contact.updateMany({
      where: { campaignId, deletedAt: null },
      data: {
        supportLevel: "unknown",
        funnelStage: "unknown",
        lastContactedAt: null,
        signRequested: false,
      },
    }),
    // Remove simulation sign records — any still-requested sign (not yet installed/removed)
    prisma.sign.deleteMany({
      where: { campaignId, status: "requested" },
    }),
  ]);

  return { deleted: deletedInteractions.count };
}
