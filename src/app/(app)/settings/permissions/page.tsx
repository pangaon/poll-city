import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import PermissionsClient from "./permissions-client";

export const metadata = { title: "Permissions — Poll City" };
export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const { campaignId, role: currentUserRole, userId } = await resolveActiveCampaign();

  const members = await prisma.membership.findMany({
    where: { campaignId, user: { role: { not: "SUPER_ADMIN" } } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const initialMembers = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    isSelf: m.userId === userId,
  }));

  return (
    <PermissionsClient
      campaignId={campaignId}
      currentUserRole={currentUserRole}
      initialMembers={initialMembers}
    />
  );
}
