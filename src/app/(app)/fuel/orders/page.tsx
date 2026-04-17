import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import OrdersClient from "./orders-client";

export const metadata = { title: "Orders — FuelOps" };

export default async function FuelOrdersPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <OrdersClient campaignId={campaignId} />;
}
