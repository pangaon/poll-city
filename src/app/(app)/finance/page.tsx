import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FinanceOverviewClient from "./finance-overview-client";

export const metadata = { title: "Finance Overview" };

export default async function FinancePage() {
  const { campaignId } = await resolveActiveCampaign();
  return <FinanceOverviewClient campaignId={campaignId} />;
}
