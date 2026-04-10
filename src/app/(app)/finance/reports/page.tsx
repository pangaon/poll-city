import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ReportsClient from "./reports-client";

export const metadata = { title: "Finance Reports" };

export default async function FinanceReportsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ReportsClient campaignId={campaignId} />;
}
