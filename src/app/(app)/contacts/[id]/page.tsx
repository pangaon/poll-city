import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ContactDetailClient from "./contact-detail-client";
export const metadata = { title: "Contact — Poll City" };

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const { campaignId, role } = await resolveActiveCampaign();

  // Verify the contact belongs to the resolved campaign (not just any campaign)
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, campaignId },
    include: {
      tags: { include: { tag: true } },
      interactions: { orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { id: true, name: true } } } },
      tasks: { orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } } },
    },
  });

  if (!contact) return notFound();

  const [tags, teamMembers, customFields] = await Promise.all([
    prisma.tag.findMany({ where: { campaignId }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({ where: { campaignId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.customFieldValue.findMany({
      where: { contactId: params.id },
      include: { field: true },
    }),
  ]);

  return (
    <ContactDetailClient
      contact={contact}
      tags={tags}
      teamMembers={teamMembers.map(m => m.user)}
      customFields={customFields}
      userRole={role}
      campaignId={campaignId}
    />
  );
}
