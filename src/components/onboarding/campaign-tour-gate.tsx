"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Loaded client-side only — reads localStorage and useSession; no SSR needed.
const CampaignTour = dynamic(() => import("./campaign-tour"), { ssr: false });

export default function CampaignTourGate() {
  const searchParams = useSearchParams();
  const demo = searchParams.get("demo") === "true";
  return <CampaignTour demo={demo} />;
}
