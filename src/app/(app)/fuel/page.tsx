import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FuelDashboardClient from "./fuel-dashboard-client";

export const metadata = { title: "FuelOps" };

export default async function FuelPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <FuelDashboardClient campaignId={campaignId} />;
}
