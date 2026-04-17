import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AlertsDashboardClient from "./alerts-dashboard-client";

export const metadata = { title: "Reputation Alerts — Poll City" };

export default async function ReputationAlertsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AlertsDashboardClient campaignId={campaignId} />;
}
