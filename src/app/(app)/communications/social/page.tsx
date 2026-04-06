import SocialManagerClient from "./social-manager-client";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";

export const metadata = { title: "Social Manager — Poll City" };
export const dynamic = "force-dynamic";

export default async function SocialManagerPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <SocialManagerClient campaignId={campaignId} />;
}
