import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import TurfBuilderClient from "./turf-builder-client";

export const metadata = { title: "Turf Builder" };

export default async function TurfBuilderPage() {
  const { campaignId, userId } = await resolveActiveCampaign();

  const teamMembers = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <TurfBuilderClient
      campaignId={campaignId}
      currentUserId={userId}
      teamMembers={teamMembers.map((m) => m.user)}
    />
  );
}
