import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { loadBrandKit } from "@/lib/brand/brand-kit";
import BrandClient from "./brand-client";

export const dynamic = "force-dynamic";

export default async function BrandSettingsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  const brand = await loadBrandKit(campaignId);
  return <BrandClient campaignId={campaignId} campaignName={campaignName} initialBrand={brand} />;
}
