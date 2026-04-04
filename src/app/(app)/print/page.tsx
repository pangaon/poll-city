import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintClient from "./print-client";

export const metadata = { title: "Print" };

export default async function PrintPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PrintClient campaignId={campaignId} />;
}
