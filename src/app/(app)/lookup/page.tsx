import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AddressLookup from "@/components/canvassing/address-lookup";
export const metadata = { title: "Address Lookup" };

export default async function LookupPage() {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Address Lookup</h1>
        <p className="text-sm text-gray-500 mt-0.5">Search any voter or address instantly. Notify staff with one tap.</p>
      </div>
      <AddressLookup campaignId={campaignId} />
    </div>
  );
}
