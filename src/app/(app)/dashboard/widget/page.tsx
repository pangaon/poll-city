"use client";

import { useSearchParams } from "next/navigation";
import DashboardStudio from "@/components/dashboard/dashboard-studio";

export default function DashboardWidgetPopoutPage() {
  const params = useSearchParams();
  const campaignId = params?.get("campaignId") ?? "";
  const widget = params?.get("widget") ?? null;

  return (
    <div className="min-h-screen bg-slate-100 p-3">
      <DashboardStudio campaignId={campaignId} campaignName="Widget Popout" popoutWidgetId={widget} isPopout />
    </div>
  );
}
