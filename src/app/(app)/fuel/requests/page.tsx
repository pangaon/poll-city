import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import RequestsClient from "./requests-client";

export const metadata = { title: "Food Requests — FuelOps" };

export default async function FuelRequestsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <RequestsClient campaignId={campaignId} />;
}
