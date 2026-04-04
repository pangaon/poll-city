import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CanvassingClient from "./canvassing-client";
export const metadata = { title: "Canvassing — Poll City" };

export default async function CanvassingPage() {
  const { campaignId, userId } = await resolveActiveCampaign();
  const teamMembers = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return (
    <CanvassingClient
      campaignId={campaignId}
      currentUserId={userId}
      teamMembers={teamMembers.map(m => m.user)}
    />
  );
}
