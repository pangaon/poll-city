import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VendorsClient from "./vendors-client";

export const metadata = { title: "Vendors" };

export default async function FinanceVendorsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VendorsClient campaignId={campaignId} />;
}
