import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PurchaseRequestsClient from "./purchase-requests-client";

export const metadata = { title: "Purchase Requests" };

export default async function FinancePRPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PurchaseRequestsClient campaignId={campaignId} />;
}
