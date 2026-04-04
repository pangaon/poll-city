import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CoalitionsClient from "./coalitions-client";

export const metadata = { title: "Coalitions" };

export default async function CoalitionsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CoalitionsClient campaignId={campaignId} />;
}
