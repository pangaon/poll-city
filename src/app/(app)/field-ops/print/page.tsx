import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { Suspense } from "react";
import PrintWalkListClient from "@/app/(app)/canvassing/print-walk-list/print-walk-list-client";
export const metadata = { title: "Print Preview — Field Ops — Poll City" };

interface Props {
  searchParams: { assignmentId?: string; ward?: string; support?: string; standalone?: string };
}

export default async function FieldOpsPrintPage({ searchParams }: Props) {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  return (
    <Suspense>
      <PrintWalkListClient
        campaignId={campaignId}
        campaignName={campaignName}
        mode="canvass"
        defaultAssignmentId={searchParams.assignmentId}
      />
    </Suspense>
  );
}
