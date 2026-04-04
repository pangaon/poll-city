import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import JobDetailClient from "./job-detail-client";

export const metadata = { title: "Print Job" };

export default async function PrintJobDetailPage({ params }: { params: { id: string } }) {
  const { campaignId } = await resolveActiveCampaign();
  return <JobDetailClient jobId={params.id} campaignId={campaignId} />;
}
