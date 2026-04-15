import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import HQClient from "./hq-client";

export const metadata = { title: "Election Night HQ — Poll City" };
export const dynamic = "force-dynamic";

export default async function EdayHQPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <HQClient campaignId={campaignId} />;
}
