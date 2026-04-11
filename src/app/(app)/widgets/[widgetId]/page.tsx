"use client";

import { useParams, useSearchParams } from "next/navigation";
import DashboardStudio from "@/components/dashboard/dashboard-studio";

export default function WidgetStandalonePage() {
  const params = useParams<{ widgetId: string }>();
  const search = useSearchParams();
  const campaignId = search?.get("campaignId") ?? "";

  return (
    <div className="min-h-screen bg-slate-100 p-3">
      <DashboardStudio
        campaignId={campaignId}
        campaignName="Widget Standalone"
        popoutWidgetId={params?.widgetId}
        isPopout
      />
    </div>
  );
}
