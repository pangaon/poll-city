import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import RequestDetailClient from "./request-detail-client";

export const metadata = { title: "Food Request — FuelOps" };

export default async function RequestDetailPage({ params }: { params: { requestId: string } }) {
  const { campaignId } = await resolveActiveCampaign();
  return <RequestDetailClient campaignId={campaignId} requestId={params.requestId} />;
}
