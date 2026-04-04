import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import ContactsClient from "./contacts-client";
export const metadata = { title: "Contacts — Poll City" };

export default async function ContactsPage() {
  const { campaignId, role } = await resolveActiveCampaign();
  const [tags, teamMembers] = await Promise.all([
    prisma.tag.findMany({ where: { campaignId }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  return (
    <ContactsClient
      campaignId={campaignId}
      campaignName=""
      tags={tags}
      teamMembers={teamMembers.map(m => m.user)}
      userRole={role}
    />
  );
}
