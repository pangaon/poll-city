import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasImportClient from "./atlas-import-client";

export const metadata = { title: "Atlas Command — Data Import Pipeline" };

export default async function AtlasImportPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <AtlasImportClient campaignId={campaignId} />;
}
