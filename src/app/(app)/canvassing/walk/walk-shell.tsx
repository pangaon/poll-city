"use client";

import dynamic from "next/dynamic";
import HouseholdWalkList from "@/components/canvassing/household-walk-list";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

export default function WalkShell({ campaignId }: { campaignId: string }) {
  return (
    <div className="space-y-4">
      <div className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Walk route map</p>
        <CampaignMap mode="walk" height={320} showControls />
      </div>
      <HouseholdWalkList campaignId={campaignId} />
    </div>
  );
}
