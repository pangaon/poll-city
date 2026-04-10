import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import BudgetCommandClient from "./budget-command-client";

export const metadata = { title: "Budget" };

export default async function FinanceBudgetPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <BudgetCommandClient campaignId={campaignId} />;
}
