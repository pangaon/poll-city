import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import FollowUpsClient, { type FollowUpRow } from "./follow-ups-client";

export const metadata = { title: "Field Follow-Ups — Poll City" };

export default async function FieldFollowUpsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const followUps = await prisma.followUpAction.findMany({
    where: {
      campaignId,
      status: { notIn: ["completed", "dismissed"] },
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
      household: { select: { id: true, address1: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: "asc" },
      { dueDate: "asc" },
      { createdAt: "asc" },
    ],
    take: 500,
  });

  const serialized: FollowUpRow[] = followUps.map((f) => ({
    ...f,
    contact: f.contact
      ? { id: f.contact.id, firstName: f.contact.firstName, lastName: f.contact.lastName, address1: f.contact.address1 }
      : null,
    household: f.household
      ? { id: f.household.id, address1: f.household.address1 }
      : null,
    dueDate: f.dueDate?.toISOString() ?? null,
    completedAt: f.completedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    fieldAttempt: null,
  }));

  return (
    <FollowUpsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialFollowUps={serialized}
    />
  );
}
