import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import SignsFieldClient from "./signs-field-client";

export const metadata = { title: "Sign Ops — Field Operations — Poll City" };

export default async function FieldSignsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const teamMembers = await prisma.membership.findMany({
    where: { campaignId, status: "active" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <SignsFieldClient
      campaignId={campaignId}
      campaignName={campaignName}
      teamMembers={teamMembers.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? m.user.id,
      }))}
    />
  );
}
