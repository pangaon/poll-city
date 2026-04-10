import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintTemplatesClient from "./templates-client";

export const dynamic = "force-dynamic";

export default async function PrintTemplatesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <PrintTemplatesClient campaignId={campaignId} />;
}
