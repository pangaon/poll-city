import type { Metadata } from "next";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ReputationTabsClient from "./reputation-tabs-client";

export const metadata: Metadata = { title: "Reputation — Poll City" };

export default async function ReputationPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ReputationTabsClient campaignId={campaignId} />;
}
