import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import OutreachClient from "./outreach-client";

export const metadata = { title: "Vendor Outreach — FuelOps" };

export default async function FuelOutreachPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <OutreachClient campaignId={campaignId} />;
}
