import type { Metadata } from "next";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import EdayTabsClient from "./eday-tabs-client";

export const metadata: Metadata = { title: "Election Day — Poll City" };
export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"];

export default async function EdayPage() {
  const { campaignId, role } = await resolveActiveCampaign();
  const isManager = MANAGER_ROLES.includes(role);
  return <EdayTabsClient campaignId={campaignId} isManager={isManager} />;
}
