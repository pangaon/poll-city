import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintJobsClient from "./jobs-client";

export const metadata = { title: "Print Jobs" };

export default async function PrintJobsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PrintJobsClient campaignId={campaignId} />;
}
