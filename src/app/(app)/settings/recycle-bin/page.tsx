import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { redirect } from "next/navigation";
import RecycleBinClient from "./recycle-bin-client";

export const metadata = { title: "Recycle Bin" };

export default async function RecycleBinPage() {
  const { campaignId, role } = await resolveActiveCampaign();

  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(role)) {
    redirect("/settings");
  }

  return <RecycleBinClient campaignId={campaignId} isAdmin={["ADMIN", "SUPER_ADMIN"].includes(role)} />;
}
