/**
 * GET /api/canvasser/missions/[missionId]/current-stop?campaignId=X
 * Returns the next unvisited TurfStop for the canvasser to work.
 * Returns null if all stops are visited (mission complete).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { missionId: string } },
) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify turf belongs to this campaign
  const turf = await prisma.turf.findFirst({
    where: { id: params.missionId, campaignId },
    select: { id: true },
  });

  if (!turf) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const stop = await prisma.turfStop.findFirst({
    where: { turfId: params.missionId, visited: false, contact: { deletedAt: null } },
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
          supportLevel: true,
          notes: true,
          doNotContact: true,
          signRequested: true,
          volunteerInterest: true,
        },
      },
    },
  });

  if (!stop) {
    return NextResponse.json({ data: null, missionComplete: true });
  }

  return NextResponse.json({
    data: {
      stopId: stop.id,
      order: stop.order,
      contact: {
        id: stop.contact.id,
        firstName: stop.contact.firstName,
        lastName: stop.contact.lastName,
        address1: stop.contact.address1,
        address2: stop.contact.address2,
        city: stop.contact.city,
        postalCode: stop.contact.postalCode,
        phone: stop.contact.phone,
        supportLevel: stop.contact.supportLevel,
        notes: stop.contact.notes,
        doNotContact: stop.contact.doNotContact,
        signRequested: stop.contact.signRequested,
        volunteerInterest: stop.contact.volunteerInterest,
      },
    },
    missionComplete: false,
  });
}
