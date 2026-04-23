import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FundingSourcesClient from "./funding-sources-client";

export const metadata = { title: "Funding Sources" };

export default async function FundingSourcesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <FundingSourcesClient campaignId={campaignId} />;
}
