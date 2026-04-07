import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PollDetailClient from "./poll-detail-client";

export const metadata = { title: "Poll — Poll City" };

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  let campaignId = "";
  try {
    const resolved = await resolveActiveCampaign();
    campaignId = resolved.campaignId;
  } catch {
    // Public poll — no campaign context needed
  }
  return <PollDetailClient pollId={params.id} campaignId={campaignId} />;
}
