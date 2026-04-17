import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import EdayClient from "./eday-client";

export const metadata = { title: "Election Day — Poll City" };
export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"];

export default async function EdayPage() {
  const { campaignId, role } = await resolveActiveCampaign();
  const isManager = MANAGER_ROLES.includes(role);
  return <EdayClient campaignId={campaignId} isManager={isManager} />;
}
