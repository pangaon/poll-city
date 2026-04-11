import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import RouteDetailClient from "./route-detail-client";

export const metadata = { title: "Route Detail — Poll City" };

export default async function RouteDetailPage({
  params,
}: {
  params: { routeId: string };
}) {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return (
    <RouteDetailClient
      routeId={params.routeId}
      campaignId={campaignId}
      campaignName={campaignName}
    />
  );
}
