import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VendorsClient from "./vendors-client";

export const metadata = { title: "Vendor Network — FuelOps" };

export default async function FuelVendorsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VendorsClient campaignId={campaignId} />;
}
