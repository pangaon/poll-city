/**
 * POST /api/gotv/rides/[contactId]/arranged — Mark ride as arranged.
 *
 * Adds a note to the contact and creates an audit log entry.
 * Used by the campaign team to track who has rides confirmed.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest, { params }: { params: { contactId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const contact = await prisma.contact.findUnique({
    where: { id: params.contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true, notes: true },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const driverName = body.driverName ?? "Unassigned";
  const pickupTime = body.pickupTime ?? "TBD";

  // Update contact notes
  const existingNotes = contact.notes ?? "";
  const rideNote = `\nRIDE ARRANGED — Driver: ${driverName}, Pickup: ${pickupTime} (${new Date().toLocaleTimeString("en-CA")})`;

  await prisma.contact.update({
    where: { id: params.contactId },
    data: { notes: existingNotes + rideNote },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: contact.campaignId,
      userId: session!.user.id,
      action: "gotv_ride_arranged",
      entityType: "Contact",
      entityId: params.contactId,
      details: { name: `${contact.firstName} ${contact.lastName}`, driverName, pickupTime },
    },
  });

  return NextResponse.json({
    ok: true,
    contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}` },
    rideDetails: { driverName, pickupTime },
  });
}
