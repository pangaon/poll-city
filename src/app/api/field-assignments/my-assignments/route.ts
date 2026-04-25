import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth as apiAuth } from "@/lib/auth/helpers";
import { AssignmentStatus } from "@prisma/client";

/**
 * GET /api/field-assignments/my-assignments?campaignId=X
 *
 * Returns all field assignments currently assigned to the authenticated user
 * that are actionable (published, assigned, or in_progress), with full stop
 * details for offline-capable display.
 *
 * Accepts both NextAuth session cookies and mobile Bearer JWT tokens.
 * No canvassing:read check — a canvasser can always see their own assignments.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  // Membership check — confirms the user belongs to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch assignments where this user is the direct assignee
  // Volunteer-group assignments are not included here — those need a separate
  // group-membership query and can be added in a future chunk.
  const assignments = await prisma.fieldAssignment.findMany({
    where: {
      campaignId,
      deletedAt: null,
      assignedUserId: session!.user.id,
      status: {
        in: [
          AssignmentStatus.published,
          AssignmentStatus.assigned,
          AssignmentStatus.in_progress,
        ],
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
    include: {
      fieldUnit: { select: { id: true, name: true, ward: true } },
      resourcePackage: true,
      stops: {
        orderBy: { order: "asc" },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address1: true,
              city: true,
              postalCode: true,
              phone: true,
              supportLevel: true,
              doNotContact: true,
              notes: true,
            },
          },
          household: {
            select: {
              id: true,
              address1: true,
              city: true,
              postalCode: true,
              lat: true,
              lng: true,
              totalVoters: true,
            },
          },
          sign: {
            select: {
              id: true,
              address1: true,
              city: true,
              postalCode: true,
              status: true,
              lat: true,
              lng: true,
              signType: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: assignments });
}
