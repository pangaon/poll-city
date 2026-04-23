import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CampaignSourcesClient from "./campaign-sources-client";

export const metadata = { title: "Source Activations — Poll City" };

export default async function CampaignSourcesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CampaignSourcesClient campaignId={campaignId} />;
}
