import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VendorDetailClient from "./vendor-detail-client";

export const metadata = { title: "Vendor Profile — FuelOps" };

export default async function VendorDetailPage({ params }: { params: { vendorId: string } }) {
  const { campaignId } = await resolveActiveCampaign();
  return <VendorDetailClient campaignId={campaignId} vendorId={params.vendorId} />;
}
