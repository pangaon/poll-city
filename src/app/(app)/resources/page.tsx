import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ResourceLibraryClient from "./resource-library-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resource Library — Poll City" };

export default async function ResourceLibraryPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  return (
    <ResourceLibraryClient
      campaignId={campaignId}
      campaignName={campaignName}
      plan="free_trial"
    />
  );
}
