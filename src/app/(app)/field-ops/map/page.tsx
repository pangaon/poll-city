import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CanvassingClient from "@/app/(app)/canvassing/canvassing-client";
export const metadata = { title: "Live Map — Field Ops — Poll City" };

export default async function FieldOpsMapPage() {
  const { campaignId, userId } = await resolveActiveCampaign();
  const teamMembers = await prisma.membership.findMany({
    where: { campaignId, status: "active" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return (
    <CanvassingClient
      campaignId={campaignId}
      currentUserId={userId}
      teamMembers={teamMembers.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email ?? null,
      }))}
    />
  );
}
