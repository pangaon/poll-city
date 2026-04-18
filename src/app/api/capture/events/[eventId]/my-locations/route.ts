import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    select: { campaignId: true, candidates: { orderBy: { ballotOrder: "asc" } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Managers see all locations; assigned users see only their assigned locations
  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);

  let locations;
  if (isManager) {
    locations = await prisma.captureLocation.findMany({
      where: { eventId: params.eventId },
      include: {
        submissions: {
          where: { status: { not: "draft" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { results: { include: { candidate: true } } },
        },
      },
      orderBy: [{ ward: "asc" }, { name: "asc" }],
    });
  } else {
    const assignments = await prisma.captureAssignment.findMany({
      where: { eventId: params.eventId, userId: session!.user.id },
      include: {
        location: {
          include: {
            submissions: {
              where: { status: { not: "draft" } },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { results: { include: { candidate: true } } },
            },
          },
        },
      },
    });
    locations = assignments.map((a) => a.location);
  }

  return NextResponse.json({ data: locations, candidates: event.candidates });
}
