import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * POST /api/crm/households/[id]/members
 * Add a contact to this household. CAMPAIGN_MANAGER+ only.
 * Body: { contactId, householdRole? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  let body: { contactId?: string; householdRole?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.contactId) return NextResponse.json({ error: "contactId required" }, { status: 422 });

  // Verify contact belongs to same campaign
  const contact = await prisma.contact.findUnique({
    where: { id: body.contactId, deletedAt: null },
    select: { id: true, campaignId: true, householdId: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (contact.campaignId !== household.campaignId) return NextResponse.json({ error: "Contact belongs to different campaign" }, { status: 422 });

  const updated = await prisma.contact.update({
    where: { id: body.contactId },
    data: {
      householdId: household.id,
      householdRole: body.householdRole ?? null,
    },
    select: { id: true, firstName: true, lastName: true, householdId: true, householdRole: true },
  });

  await prisma.contactAuditLog.create({
    data: {
      campaignId: household.campaignId,
      contactId: body.contactId,
      entityType: "household_member",
      entityId: household.id,
      action: "added_to_household",
      newValueJson: { householdId: household.id, householdRole: body.householdRole ?? null },
      actorUserId: session!.user.id,
      source: "manual",
    },
  });

  return NextResponse.json({ data: updated });
}
