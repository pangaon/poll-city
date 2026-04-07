import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import DashboardStudio from "@/components/dashboard/dashboard-studio";

export const metadata = { title: "Dashboard Studio — Poll City" };

export default async function DashboardPage() {
  const { campaignId } = await resolveActiveCampaign();

  return (
    <DashboardStudio campaignId={campaignId} campaignName="Campaign" />
  );
}
