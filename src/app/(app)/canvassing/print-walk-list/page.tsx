import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintWalkListClient from "./print-walk-list-client";

export const metadata = { title: "Print Walk List — Poll City" };

export default async function PrintWalkListPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return <PrintWalkListClient campaignId={campaignId} campaignName={campaignName} />;
}
