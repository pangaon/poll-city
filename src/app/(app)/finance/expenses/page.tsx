import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ExpensesClient from "./expenses-client";

export const metadata = { title: "Expenses" };

export default async function FinanceExpensesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ExpensesClient campaignId={campaignId} />;
}
