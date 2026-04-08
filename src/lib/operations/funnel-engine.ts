/**
 * Campaign Funnel Engine
 *
 * Stages (ordered, contact can only advance — never demote):
 *   unknown → contact → supporter → volunteer → donor → voter
 *
 * Usage:
 *   await advanceFunnel(contactId, "supporter", "rsvp", systemUserId);
 *
 * Every stage change is logged as a funnel_transition interaction.
 */
import prisma from "@/lib/db/prisma";
import { FunnelStage } from "@prisma/client";

export const FUNNEL_STAGE_ORDER: FunnelStage[] = [
  FunnelStage.unknown,
  FunnelStage.contact,
  FunnelStage.supporter,
  FunnelStage.volunteer,
  FunnelStage.donor,
  FunnelStage.voter,
];

function stageRank(stage: FunnelStage): number {
  return FUNNEL_STAGE_ORDER.indexOf(stage);
}

/**
 * Advance a contact's funnel stage. Never demotes.
 * Returns the new stage, or the existing stage if no change.
 */
export async function advanceFunnel(
  contactId: string,
  toStage: FunnelStage,
  reason: string,
  actorUserId: string,
): Promise<{ changed: boolean; from: FunnelStage; to: FunnelStage }> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, funnelStage: true, campaignId: true },
  });
  if (!contact) return { changed: false, from: FunnelStage.unknown, to: FunnelStage.unknown };

  const currentRank = stageRank(contact.funnelStage);
  const targetRank = stageRank(toStage);

  if (targetRank <= currentRank) {
    // Already at this stage or higher — no change
    return { changed: false, from: contact.funnelStage, to: contact.funnelStage };
  }

  await prisma.$transaction([
    prisma.contact.update({
      where: { id: contactId },
      data: { funnelStage: toStage },
    }),
    prisma.interaction.create({
      data: {
        contactId,
        userId: actorUserId,
        type: "funnel_transition",
        notes: `Funnel: ${contact.funnelStage} → ${toStage} (${reason})`,
      },
    }),
  ]);

  return { changed: true, from: contact.funnelStage, to: toStage };
}

/**
 * Advance funnel for a list of contacts in bulk (e.g. after import).
 * Skips contacts already at or past toStage.
 */
export async function bulkAdvanceFunnel(
  contactIds: string[],
  toStage: FunnelStage,
  reason: string,
  actorUserId: string,
): Promise<number> {
  if (!contactIds.length) return 0;

  // Find contacts that need advancement
  const stagesBelow = FUNNEL_STAGE_ORDER.slice(0, stageRank(toStage));
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, funnelStage: { in: stagesBelow } },
    select: { id: true, funnelStage: true },
  });

  if (!contacts.length) return 0;

  const ids = contacts.map((c) => c.id);

  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { id: { in: ids } },
      data: { funnelStage: toStage },
    }),
    prisma.interaction.createMany({
      data: ids.map((contactId) => ({
        contactId,
        userId: actorUserId,
        type: "funnel_transition" as const,
        notes: `Funnel: → ${toStage} (${reason})`,
      })),
    }),
  ]);

  return ids.length;
}

/**
 * Get funnel metrics for a campaign: counts per stage + conversion rates.
 */
export async function getFunnelMetrics(campaignId: string) {
  const counts = await prisma.contact.groupBy({
    by: ["funnelStage"],
    where: { campaignId, isDeceased: false, doNotContact: false },
    _count: { id: true },
  });

  const stageMap: Record<FunnelStage, number> = {
    unknown: 0,
    contact: 0,
    supporter: 0,
    volunteer: 0,
    donor: 0,
    voter: 0,
  };

  for (const row of counts) {
    stageMap[row.funnelStage] = row._count.id;
  }

  const total = Object.values(stageMap).reduce((a, b) => a + b, 0);

  // Conversion rates between adjacent stages (of non-unknown base)
  const engaged = total - stageMap.unknown;
  const conversions = {
    contactToSupporter: stageMap.contact > 0
      ? Math.round(((stageMap.supporter + stageMap.volunteer + stageMap.donor + stageMap.voter) / (stageMap.contact + stageMap.supporter + stageMap.volunteer + stageMap.donor + stageMap.voter)) * 100)
      : 0,
    supporterToVolunteer: (stageMap.supporter + stageMap.volunteer + stageMap.donor + stageMap.voter) > 0
      ? Math.round(((stageMap.volunteer + stageMap.donor + stageMap.voter) / (stageMap.supporter + stageMap.volunteer + stageMap.donor + stageMap.voter)) * 100)
      : 0,
    volunteerToDonor: (stageMap.volunteer + stageMap.donor + stageMap.voter) > 0
      ? Math.round(((stageMap.donor + stageMap.voter) / (stageMap.volunteer + stageMap.donor + stageMap.voter)) * 100)
      : 0,
    donorToVoter: (stageMap.donor + stageMap.voter) > 0
      ? Math.round((stageMap.voter / (stageMap.donor + stageMap.voter)) * 100)
      : 0,
  };

  return {
    total,
    engaged,
    stages: FUNNEL_STAGE_ORDER.map((stage) => ({
      stage,
      count: stageMap[stage],
      pct: total > 0 ? Math.round((stageMap[stage] / total) * 100) : 0,
    })),
    conversions,
  };
}
