import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { SupportLevel } from "@prisma/client";
import DashboardClient from "./dashboard-client";
export const metadata = { title: "Dashboard — Poll City" };

async function getDashboardData(campaignId: string) {
  const [
    totalContacts,
    supportCounts,
    followUpsDue,
    notHomeCount,
    pendingTasks,
    recentActivity,
    recentInteractions,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId, isDeceased: false } }),
    prisma.contact.groupBy({
      by: ["supportLevel"],
      where: { campaignId, isDeceased: false },
      _count: true,
    }),
    prisma.contact.count({ where: { campaignId, followUpNeeded: true } }),
    prisma.contact.count({ where: { campaignId, notHome: true } }),
    prisma.task.count({ where: { campaignId, status: { in: ["pending", "in_progress"] } } }),
    prisma.activityLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.interaction.findMany({
      where: { contact: { campaignId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        notes: true,
        createdAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const bySupport: Record<string, number> = {};
  for (const s of supportCounts) bySupport[s.supportLevel] = s._count;

  return {
    totalContacts,
    followUpsDue,
    notHome: notHomeCount,
    pendingTasks,
    supporters:
      (bySupport[SupportLevel.strong_support] ?? 0) +
      (bySupport[SupportLevel.leaning_support] ?? 0),
    undecided: bySupport[SupportLevel.undecided] ?? 0,
    opposition:
      (bySupport[SupportLevel.leaning_opposition] ?? 0) +
      (bySupport[SupportLevel.strong_opposition] ?? 0),
    recentActivity,
    recentInteractions,
  };
}

export default async function DashboardPage() {
  // resolveActiveCampaign calls getServerSession internally — do not call it again
  const { campaignId, userId, role, userName } = await resolveActiveCampaign();

  const [campaign, data, official] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        electionType: true,
        jurisdiction: true,
        candidateName: true,
        primaryColor: true,
        electionDate: true,
        officialId: true,
      },
    }),
    getDashboardData(campaignId),
    prisma.official.findFirst({
      where: { claimedByUserId: userId, isActive: true },
      select: { id: true, name: true, title: true, district: true, level: true, isClaimed: true, photoUrl: true },
    }),
  ]);

  return (
    <DashboardClient
      data={data}
      campaign={campaign!}
      user={{ id: userId, role, name: userName }}
      official={official ?? undefined}
    />
  );
}
