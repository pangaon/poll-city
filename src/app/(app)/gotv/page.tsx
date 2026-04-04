import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import GotvEngine from "@/components/gotv/gotv-engine";
export const metadata = { title: "GOTV — Election Day" };

export default async function GotvPage() {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">GOTV — Election Day</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload voted lists, track pull rate, manage priority calls.</p>
      </div>
      <GotvEngine campaignId={campaignId} />
    </div>
  );
}
