import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ContactDetailClient from "./contact-detail-client";
import { ErrorBoundary } from "@/components/error-boundary";
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

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      campaignId,
      entityId: params.id,
      entityType: "contact",
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return (
    <ErrorBoundary
      resetKeys={[campaignId, params.id]}
      fallback={
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Contact detail failed to render</p>
          <p className="text-xs text-amber-800 mt-1">Try refreshing this page or reopening the contact from the list.</p>
        </div>
      }
    >
      <ContactDetailClient
        contact={contact}
        tags={tags}
        teamMembers={teamMembers.map(m => m.user)}
        customFields={customFields}
        activityLogs={activityLogs}
        userRole={role}
        campaignId={campaignId}
      />
    </ErrorBoundary>
  );
}
