import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import TeamsClient, { type TeamRow } from "./teams-client";

export const metadata = { title: "Field Teams — Poll City" };

export default async function FieldTeamsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const teams = await prisma.fieldTeam.findMany({
    where: { campaignId, isActive: true },
    include: {
      _count: { select: { members: true } },
      leadUser: { select: { id: true, name: true } },
      members: {
        where: { leftAt: null },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const serialized: TeamRow[] = teams.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    members: t.members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      leftAt: m.leftAt?.toISOString() ?? null,
    })),
  }));

  return (
    <TeamsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialTeams={serialized}
    />
  );
}
