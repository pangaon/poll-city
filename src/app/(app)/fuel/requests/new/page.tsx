import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import NewRequestClient from "./new-request-client";

export const metadata = { title: "New Food Request — FuelOps" };

export default async function NewRequestPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <NewRequestClient campaignId={campaignId} />;
}
