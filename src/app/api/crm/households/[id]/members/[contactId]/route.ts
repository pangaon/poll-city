import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * DELETE /api/crm/households/[id]/members/[contactId]
 * Remove a contact from this household. CAMPAIGN_MANAGER+ only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; contactId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const household = await prisma.household.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true },
  });
  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: household.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: params.contactId, deletedAt: null },
    select: { id: true, householdId: true, campaignId: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (contact.householdId !== household.id) {
    return NextResponse.json({ error: "Contact is not in this household" }, { status: 422 });
  }

  await prisma.contact.update({
    where: { id: params.contactId },
    data: { householdId: null, householdRole: null },
  });

  await prisma.contactAuditLog.create({
    data: {
      campaignId: household.campaignId,
      contactId: params.contactId,
      entityType: "household_member",
      entityId: household.id,
      action: "removed_from_household",
      oldValueJson: { householdId: household.id },
      newValueJson: { householdId: null },
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ data: { ok: true } });
}
