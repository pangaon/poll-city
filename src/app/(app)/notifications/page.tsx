import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import NotificationsClient from "./notifications-client";

export const metadata = { title: "Notifications — Poll City" };

export default async function NotificationsPage() {
  const { campaignId, userId } = await resolveActiveCampaign();

  // Check if user has admin/manager access
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });

  const canSend = membership?.role === "ADMIN" || membership?.role === "CAMPAIGN_MANAGER";

  return (
    <NotificationsClient
      campaignId={campaignId}
      currentUserId={userId}
      canSend={canSend}
    />
  );
}