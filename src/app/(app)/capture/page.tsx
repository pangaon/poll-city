"use client";
import { useSearchParams } from "next/navigation";
import QuickCapture from "@/components/canvassing/quick-capture";
import { useSession } from "next-auth/react";

export default function CapturePage() {
  const params = useSearchParams();
  const address = params?.get("address") ?? undefined;
  const contactId = params?.get("contactId") ?? undefined;
  // campaignId comes from session via activeCampaignId
  const { data: session } = useSession();
  const campaignId = (session?.user as any)?.activeCampaignId ?? "";

  if (!campaignId) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-lg">
      <QuickCapture
        campaignId={campaignId}
        prefillAddress={address}
        prefillContactId={contactId}
      />
    </div>
  );
}
