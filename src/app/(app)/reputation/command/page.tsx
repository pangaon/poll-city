import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CommandCenterClient from "./command-center-client";

export const metadata = { title: "Reputation Command Center — Poll City" };

export default async function CommandCenterPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CommandCenterClient campaignId={campaignId} />;
}
