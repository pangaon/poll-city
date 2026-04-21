import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AlertDetailClient from "./alert-detail-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alert Detail — Poll City" };

export default async function AlertDetailPage({ params }: { params: { id: string } }) {
  const { campaignId } = await resolveActiveCampaign();
  return <AlertDetailClient campaignId={campaignId} alertId={params.id} />;
}
