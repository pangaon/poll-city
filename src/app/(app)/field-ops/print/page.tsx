import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { Suspense } from "react";
import PrintWalkListClient from "@/app/(app)/canvassing/print-walk-list/print-walk-list-client";
export const metadata = { title: "Print Walk List — Field Ops — Poll City" };

export default async function FieldOpsPrintPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return (
    <Suspense>
      <PrintWalkListClient campaignId={campaignId} campaignName={campaignName} />
    </Suspense>
  );
}
