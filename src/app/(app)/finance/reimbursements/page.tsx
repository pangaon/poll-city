import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ReimbursementsClient from "./reimbursements-client";

export const metadata = { title: "Reimbursements" };

export default async function FinanceReimbursementsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ReimbursementsClient campaignId={campaignId} />;
}
