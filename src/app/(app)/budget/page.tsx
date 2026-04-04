import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import BudgetClient from "./budget-client";

export const metadata = { title: "Budget Tracker" };

export default async function BudgetPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <BudgetClient campaignId={campaignId} />;
}
