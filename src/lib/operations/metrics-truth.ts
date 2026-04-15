import prisma from "@/lib/db/prisma";
import { computeGotvScore } from "@/lib/gotv/score";
import { buildGotvDrillThroughMap, type GotvDrillThroughMap } from "./drill-through";

export interface GotvSummaryMetrics {
  confirmedSupporters: number;
  supportersVoted: number;
  gap: number;
  winThreshold: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p4Count: number;
  votedToday: number;
  percentComplete: number;
  totalContacts: number;
  totalVoted: number;
  drillThrough: GotvDrillThroughMap;
}

export interface PriorityListContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address1: string | null;
  city: string | null;
  supportLevel: string;
  gotvStatus: string | null;
  voted: boolean;
  lastContactedAt: Date | null;
  tier: number;
  gotvScore: number;
}

export interface PriorityListResult {
  tier: "P1" | "P2" | "P3" | "P4";
  contacts: PriorityListContact[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

import { WIN_THRESHOLD_RATIO } from "@/lib/gotv/constants";
export const MAX_CONTACT_SCAN = 10_000;

export function calculateWinThreshold(totalContacts: number): number {
  return Math.ceil(totalContacts * WIN_THRESHOLD_RATIO);
}

export async function getGotvSummaryMetrics(campaignId: string): Promise<GotvSummaryMetrics> {
  const contacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null, isDeceased: false },
    select: {
      supportLevel: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      voted: true,
      votedAt: true,
      confidenceScore: true,
    },
    take: MAX_CONTACT_SCAN,
  });

  const scored = contacts.map((contact) => ({ ...contact, ...computeGotvScore(contact) }));
  const totalContacts = scored.length;

  const confirmedSupporters = scored.filter((contact) =>
    contact.supportLevel === "strong_support" || contact.supportLevel === "leaning_support",
  ).length;

  const supportersVoted = scored.filter((contact) =>
    (contact.supportLevel === "strong_support" || contact.supportLevel === "leaning_support") && contact.voted,
  ).length;

  const totalVoted = scored.filter((contact) => contact.voted).length;
  const votedTodayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const votedToday = scored.filter((contact) => contact.votedAt && contact.votedAt >= votedTodayStart).length;

  const p1Count = scored.filter((contact) => contact.tier === 1 && !contact.voted).length;
  const p2Count = scored.filter((contact) => contact.tier === 2 && !contact.voted).length;
  const p3Count = scored.filter((contact) => contact.tier === 3 && !contact.voted).length;
  const p4Count = scored.filter((contact) => contact.tier === 4 && !contact.voted).length;

  const winThreshold = calculateWinThreshold(totalContacts);
  const gap = Math.max(0, winThreshold - supportersVoted);
  const percentComplete = confirmedSupporters > 0
    ? Math.round((supportersVoted / confirmedSupporters) * 100)
    : 0;

  return {
    confirmedSupporters,
    supportersVoted,
    gap,
    winThreshold,
    p1Count,
    p2Count,
    p3Count,
    p4Count,
    votedToday,
    percentComplete,
    totalContacts,
    totalVoted,
    drillThrough: buildGotvDrillThroughMap(campaignId),
  };
}

const TIER_MAP: Record<"P1" | "P2" | "P3" | "P4", number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export async function getGotvPriorityList(
  campaignId: string,
  tier: "P1" | "P2" | "P3" | "P4",
  page: number,
  limit: number,
): Promise<PriorityListResult> {
  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      deletedAt: null,
      isDeceased: false,
      doNotContact: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      address1: true,
      city: true,
      supportLevel: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      voted: true,
      votedAt: true,
      confidenceScore: true,
    },
    take: MAX_CONTACT_SCAN,
  });

  const targetTier = TIER_MAP[tier];
  const scored = contacts.map((contact) => {
    const score = computeGotvScore(contact);
    return {
      ...contact,
      tier: score.tier,
      gotvScore: score.score,
    };
  });

  const filtered = scored
    .filter((contact) => contact.tier === targetTier && !contact.voted)
    .sort((a, b) => {
      if (a.lastContactedAt && b.lastContactedAt) {
        return a.lastContactedAt.getTime() - b.lastContactedAt.getTime();
      }
      if (a.lastContactedAt) return -1;
      if (b.lastContactedAt) return 1;
      return b.gotvScore - a.gotvScore;
    });

  const skip = Math.max(0, (page - 1) * limit);
  const paged = filtered.slice(skip, skip + limit);
  const pages = Math.max(1, Math.ceil(filtered.length / limit));

  return {
    tier,
    contacts: paged,
    total: filtered.length,
    page,
    limit,
    pages,
  };
}

