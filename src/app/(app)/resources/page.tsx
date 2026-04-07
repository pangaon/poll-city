import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import ResourceLibraryClient from "./resource-library-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resource Library — Poll City" };

export default async function ResourceLibraryPage() {
  const { campaignId, campaignName, userId } = await resolveActiveCampaign();

  // Resolve user plan for feature gating
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    select: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ResourceLibraryClient
      campaignId={campaignId}
      campaignName={campaignName}
      plan={subscription?.plan ?? "free_trial"}
    />
  );
}
