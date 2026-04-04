import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ScriptsClient from "./scripts-client";

export const metadata = { title: "Canvassing Scripts" };

export default async function ScriptsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ScriptsClient campaignId={campaignId} />;
}
