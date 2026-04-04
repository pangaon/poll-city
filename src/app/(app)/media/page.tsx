import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import MediaClient from "./media-client";

export const metadata = { title: "Media Tracking" };

export default async function MediaPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <MediaClient campaignId={campaignId} />;
}
