import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ApprovalsClient from "./approvals-client";

export const metadata = { title: "Approvals" };

export default async function FinanceApprovalsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ApprovalsClient campaignId={campaignId} />;
}
