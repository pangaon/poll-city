import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AuditClient from "./audit-client";

export const metadata = { title: "Finance Audit Trail" };

export default async function FinanceAuditPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AuditClient campaignId={campaignId} />;
}
