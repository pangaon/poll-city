import type { Metadata } from "next";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasTabsClient from "./atlas-tabs-client";

export const metadata: Metadata = { title: "Atlas — Poll City" };

export default async function AtlasPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AtlasTabsClient campaignId={campaignId} />;
}
