import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AIAssistClient from "./ai-assist-client";
export const metadata = { title: "Adoni Command Centre" };

export default async function AIAssistPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AIAssistClient campaignId={campaignId} isMock={false} />;
}
