import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import InventoryClient from "./inventory-client";

export const metadata = { title: "Print Inventory" };

export default async function PrintInventoryPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <InventoryClient campaignId={campaignId} />;
}
