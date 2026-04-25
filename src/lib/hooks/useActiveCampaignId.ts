import { useSession } from "next-auth/react";

type ActiveCampaignStatus = "loading" | "ready" | "no-campaign";

export interface ActiveCampaignResult {
  campaignId: string;
  status: ActiveCampaignStatus;
}

/**
 * Canonical hook for reading the active campaign ID from the NextAuth session.
 *
 * Never read activeCampaignId from document.cookie — it lives in the encrypted
 * JWT and is not accessible from JavaScript. Always use this hook instead.
 *
 * Usage:
 *   const { campaignId, status } = useActiveCampaignId();
 *   if (status === "loading") return <Skeleton />;
 *   if (status === "no-campaign") return <NoCampaignState />;
 *   // status === "ready", campaignId is guaranteed non-empty
 */
export function useActiveCampaignId(): ActiveCampaignResult {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return { campaignId: "", status: "loading" };
  }

  const campaignId =
    (session?.user as { activeCampaignId?: string | null } | undefined)
      ?.activeCampaignId ?? "";

  if (!campaignId) {
    return { campaignId: "", status: "no-campaign" };
  }

  return { campaignId, status: "ready" };
}
