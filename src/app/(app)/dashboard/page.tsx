import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import DashboardStudio from "@/components/dashboard/dashboard-studio";

export const metadata = { title: "Dashboard Studio — Poll City" };

export default async function DashboardPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { logoUrl: true, electionType: true },
  });

  return (
    <DashboardStudio
      campaignId={campaignId}
      campaignName={campaignName}
      campaignLogoUrl={campaign?.logoUrl ?? undefined}
      campaignType={campaign?.electionType ?? "municipal"}
    />
  );
}
