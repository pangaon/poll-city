import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * DELETE /api/crm/contacts/[id]/relationships/[relId]
 * Soft-deactivates a relationship and its mirror. CAMPAIGN_MANAGER+ only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; relId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rel = await prisma.contactRelationship.findUnique({
    where: { id: params.relId },
    select: { id: true, campaignId: true, fromContactId: true, toContactId: true, inverseType: true, relationshipType: true },
  });
  if (!rel || rel.fromContactId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: rel.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deactivate both directions
  await prisma.$transaction([
    prisma.contactRelationship.update({
      where: { id: params.relId },
      data: { isActive: false },
    }),
    // Deactivate mirror if it exists
    ...(rel.inverseType ? [
      prisma.contactRelationship.updateMany({
        where: {
          campaignId: rel.campaignId,
          fromContactId: rel.toContactId,
          toContactId: rel.fromContactId,
          relationshipType: rel.inverseType,
        },
        data: { isActive: false },
      }),
    ] : []),
  ]);

  await prisma.contactAuditLog.create({
    data: {
      campaignId: rel.campaignId,
      contactId: params.id,
      entityType: "relationship",
      entityId: params.relId,
      action: "deleted",
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ message: "Relationship removed" });
}
