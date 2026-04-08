import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CampaignsOpsClient from "./campaigns-ops-client";

export const metadata = { title: "All Campaigns — Poll City" };

export default async function CampaignsOpsPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const campaigns = await prisma.campaign.findMany({
    include: {
      _count: { select: { contacts: true, memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  const totalContacts = campaigns.reduce((sum, c) => sum + c._count.contacts, 0);
  const totalUsers = campaigns.reduce((sum, c) => sum + c._count.memberships, 0);
  const activeCampaigns = campaigns.filter(
    (c) => c.electionDate && c.electionDate > now
  ).length;

  const rows = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    electionType: c.electionType as string,
    electionDate: c.electionDate ? c.electionDate.toISOString() : null,
    contactCount: c._count.contacts,
    teamSize: c._count.memberships,
    isActive: c.electionDate ? c.electionDate > now : false,
  }));

  return (
    <CampaignsOpsClient
      totalCampaigns={campaigns.length}
      totalContacts={totalContacts}
      totalUsers={totalUsers}
      activeCampaigns={activeCampaigns}
      campaigns={rows}
    />
  );
}
