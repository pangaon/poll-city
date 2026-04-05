import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AiCreatorClient from "./ai-creator-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Creator — Poll City" };

export default async function AiCreatorPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return <AiCreatorClient campaignId={campaignId} campaignName={campaignName} />;
}
