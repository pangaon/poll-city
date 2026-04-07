import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import ResourceLibraryClient from "./resource-library-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resource Library — Poll City" };

export default async function ResourceLibraryPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  // Fetch the user's subscription plan
  let plan = "free_trial";
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { plan: true, status: true },
    });
    if (subscription && subscription.status === "active") {
      plan = subscription.plan;
    }
  }

  return (
    <ResourceLibraryClient
      campaignId={campaignId}
      campaignName={campaignName}
      plan={plan}
    />
  );
}
