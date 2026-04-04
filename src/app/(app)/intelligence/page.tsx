import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import IntelligenceClient from "./intelligence-client";

export const metadata = { title: "Opponent Intelligence" };

export default async function IntelligencePage() {
  const { campaignId } = await resolveActiveCampaign();
  return <IntelligenceClient campaignId={campaignId} />;
}
