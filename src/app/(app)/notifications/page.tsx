import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import NotificationsClient from "./notifications-client";

export const metadata = { title: "Notifications — Poll City" };

export default async function NotificationsPage() {
  const { campaignId, userId } = await resolveActiveCampaign();

  const [membership, voterOptInCount] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    }),
    prisma.consentLog.count({
      where: { campaignId, signalType: "notification_opt_in", revokedAt: null },
    }),
  ]);

  const canSend = membership?.role === "ADMIN" || membership?.role === "CAMPAIGN_MANAGER";

  return (
    <NotificationsClient
      campaignId={campaignId}
      currentUserId={userId}
      canSend={canSend}
      voterOptInCount={voterOptInCount}
    />
  );
}
