import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import AnalyticsClient from "./analytics-client";

export const metadata = { title: "Analytics — Poll City" };

export default async function AnalyticsPage() {
  const { campaignId, userName } = await resolveActiveCampaign();
  let intelligenceEnabled = false;
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { intelligenceEnabled: true },
    });
    intelligenceEnabled = campaign?.intelligenceEnabled ?? false;
  } catch {
    // Column may not exist until npx prisma db push is run — default to false
  }
  return (
    <AnalyticsClient
      campaignId={campaignId}
      userName={userName ?? undefined}
      intelligenceEnabled={intelligenceEnabled}
    />
  );
}
