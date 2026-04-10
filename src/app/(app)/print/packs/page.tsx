import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PacksClient from "./packs-client";

export const metadata = { title: "Print Packs" };

export default async function PrintPacksPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PacksClient campaignId={campaignId} />;
}
