import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AlertsClient from "./alerts-client";

export const metadata = { title: "Alerts - Poll City" };

export default async function AlertsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AlertsClient campaignId={campaignId} />;
}
