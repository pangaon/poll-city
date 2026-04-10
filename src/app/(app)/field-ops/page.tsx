import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import FieldOpsClient from "./field-ops-client";
export const metadata = { title: "Field Assignments — Poll City" };

export default async function FieldOpsPage() {
  const { campaignId } = await resolveActiveCampaign();

  const [turfs, teamMembers] = await Promise.all([
    prisma.turf.findMany({
      where: { campaignId },
      select: { id: true, name: true, ward: true },
      orderBy: { name: "asc" },
    }),
    prisma.membership.findMany({
      where: { campaignId, status: "active" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <FieldOpsClient
      campaignId={campaignId}
      turfs={turfs}
      teamMembers={teamMembers.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.id }))}
    />
  );
}
