import prisma from "@/lib/db/prisma";

export async function resolveOfficialCampaignAccess(userId: string, officialId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      campaign: {
        officialId,
      },
    },
    select: {
      campaignId: true,
      campaign: {
        select: {
          officialId: true,
        },
      },
    },
  });

  if (!membership || membership.campaign.officialId !== officialId) {
    return null;
  }

  return {
    campaignId: membership.campaignId,
  };
}
