/**
 * GET /api/canvassing/walk?turfId=X&campaignId=Y
 * Returns the ordered walk list (TurfStops) for a turf.
 *
 * Each stop includes full contact details for display at the door.
 * Supports both NextAuth cookie sessions and mobile Bearer JWT tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const turfId = sp.get("turfId");
  const campaignId = sp.get("campaignId");

  if (!turfId || !campaignId) {
    return NextResponse.json(
      { error: "turfId and campaignId are required" },
      { status: 400 },
    );
  }

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  // Verify campaign membership (SUPER_ADMIN bypasses — they can inspect any campaign)
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: {
          userId_campaignId: { userId: session!.user.id, campaignId },
        },
        select: { id: true, role: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the turf belongs to this campaign
  const turf = await prisma.turf.findFirst({
    where: { id: turfId, campaignId },
    select: { id: true, name: true, assignedUserId: true, assignedVolunteerId: true },
  });

  if (!turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  // Non-managers can only access their own turf
  const isManager =
    isSuperAdmin ||
    ["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"].includes(
      membership?.role ?? "",
    );

  if (!isManager) {
    const isAssigned =
      turf.assignedUserId === session!.user.id ||
      turf.assignedVolunteerId === membership!.id;

    if (!isAssigned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const stops = await prisma.turfStop.findMany({
    where: { turfId, contact: { deletedAt: null } },
    orderBy: { order: "asc" },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address1: true,
          address2: true,
          city: true,
          postalCode: true,
          phone: true,
          email: true,
          supportLevel: true,
          notes: true,
          doNotContact: true,
          followUpNeeded: true,
        },
      },
    },
  });

  return NextResponse.json({
    turf: { id: turf.id, name: turf.name },
    data: stops.map((stop) => ({
      id: stop.id,
      contactId: stop.contactId,
      order: stop.order,
      visited: stop.visited,
      visitedAt: stop.visitedAt?.toISOString() ?? null,
      contact: {
        id: stop.contact.id,
        firstName: stop.contact.firstName,
        lastName: stop.contact.lastName,
        address1: stop.contact.address1,
        address2: stop.contact.address2,
        city: stop.contact.city,
        postalCode: stop.contact.postalCode,
        phone: stop.contact.phone,
        email: stop.contact.email,
        supportLevel: stop.contact.supportLevel,
        notes: stop.contact.notes,
        doNotContact: stop.contact.doNotContact,
        followUpNeeded: stop.contact.followUpNeeded,
      },
    })),
  });
}
