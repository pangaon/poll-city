import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import AssignmentDetailClient from "./assignment-detail-client";
export const metadata = { title: "Assignment — Poll City" };

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
  const { campaignId } = await resolveActiveCampaign();

  const assignment = await prisma.fieldAssignment.findUnique({
    where: { id: params.id, campaignId, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      assignedGroup: { select: { id: true, name: true } },
      fieldUnit: { select: { id: true, name: true, ward: true } },
      resourcePackage: true,
      stops: {
        orderBy: { order: "asc" },
        include: {
          contact: {
            select: {
              id: true, firstName: true, lastName: true,
              address1: true, city: true, postalCode: true,
              phone: true, supportLevel: true, doNotContact: true,
            },
          },
          household: {
            select: {
              id: true, address1: true, city: true,
              postalCode: true, lat: true, lng: true,
            },
          },
          sign: {
            select: {
              id: true, address1: true, city: true,
              postalCode: true, status: true, signType: true,
            },
          },
          completedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!assignment) notFound();

  const teamMembers = await prisma.membership.findMany({
    where: { campaignId, status: "active" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <AssignmentDetailClient
      assignment={assignment as Parameters<typeof AssignmentDetailClient>[0]["assignment"]}
      teamMembers={teamMembers.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.id }))}
      campaignId={campaignId}
    />
  );
}
