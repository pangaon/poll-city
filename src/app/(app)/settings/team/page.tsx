import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import TeamClient from "./team-client";

export default async function TeamPage() {
  const { campaignId, role: currentUserRole, userId } = await resolveActiveCampaign();

  const members = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const initialMembers = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    lastLoginAt: m.user.lastLoginAt ? m.user.lastLoginAt.toISOString() : null,
    isSelf: m.userId === userId,
  }));

  return (
    <TeamClient
      campaignId={campaignId}
      currentUserRole={currentUserRole}
      initialMembers={initialMembers}
    />
  );
}
