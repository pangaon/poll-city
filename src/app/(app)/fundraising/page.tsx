import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FundraisingClient from "./fundraising-client";
export const metadata = { title: "Fundraising — Poll City" };

export default async function FundraisingPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <FundraisingClient campaignId={campaignId} />;
}
