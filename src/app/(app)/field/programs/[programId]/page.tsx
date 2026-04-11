import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ProgramDetailClient from "./program-detail-client";

export const metadata = { title: "Field Program — Poll City" };

export default async function ProgramDetailPage({
  params,
}: {
  params: { programId: string };
}) {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return (
    <ProgramDetailClient
      programId={params.programId}
      campaignId={campaignId}
      campaignName={campaignName}
    />
  );
}
