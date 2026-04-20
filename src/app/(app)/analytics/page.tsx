import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import AnalyticsClient from "./analytics-client";

export const metadata = { title: "Analytics — Poll City" };

export default async function AnalyticsPage() {
  const { campaignId, userName } = await resolveActiveCampaign();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { intelligenceEnabled: true },
  });
  return (
    <AnalyticsClient
      campaignId={campaignId}
      userName={userName ?? undefined}
      intelligenceEnabled={campaign?.intelligenceEnabled ?? false}
    />
  );
}
