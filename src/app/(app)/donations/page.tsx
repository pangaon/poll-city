import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import DonationsClient from "./donations-client";
export const metadata = { title: "Donations — Poll City" };

export default async function DonationsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <DonationsClient campaignId={campaignId} />;
}
