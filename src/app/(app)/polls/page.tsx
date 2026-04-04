import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PollsClient from "./polls-client";
export const metadata = { title: "Polls — Poll City" };

export default async function PollsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PollsClient campaignId={campaignId} />;
}
