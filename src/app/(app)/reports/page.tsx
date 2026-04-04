import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ReportsClient from "./reports-client";

export const metadata = { title: "Reports - Poll City" };

export default async function ReportsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ReportsClient campaignId={campaignId} />;
}
