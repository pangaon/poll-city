import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardEventManager(userId: string, eventId: string, requireManager = false) {
  const event = await prisma.captureEvent.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return { campaignId: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { campaignId: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requireManager && !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return { campaignId: null, error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { campaignId: event.campaignId, error: null };
}

const createAssignmentSchema = z.object({
  locationId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["lead", "backup", "observer"]).default("lead"),
  notes: z.string().max(500).nullish(),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardEventManager(session!.user.id, params.eventId);
  if (guardError) return guardError;

  const assignments = await prisma.captureAssignment.findMany({
    where: { eventId: params.eventId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true, ward: true, pollNumber: true } },
    },
    orderBy: [{ location: { name: "asc" } }],
  });

  return NextResponse.json({ data: assignments });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId, error: guardError } = await guardEventManager(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Verify the target user is a campaign member
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: parsed.data.userId, campaignId: campaignId! } },
    select: { status: true },
  });
  if (!targetMembership || targetMembership.status !== "active") {
    return NextResponse.json({ error: "User is not an active member of this campaign" }, { status: 400 });
  }

  // Verify location belongs to this event
  const location = await prisma.captureLocation.findFirst({
    where: { id: parsed.data.locationId, eventId: params.eventId },
  });
  if (!location) return NextResponse.json({ error: "Location not found in this event" }, { status: 400 });

  try {
    const assignment = await prisma.captureAssignment.create({
      data: {
        eventId: params.eventId,
        locationId: parsed.data.locationId,
        userId: parsed.data.userId,
        campaignId: campaignId!,
        role: parsed.data.role,
        assignedById: session!.user.id,
        notes: parsed.data.notes ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This user is already assigned to this location" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardEventManager(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) return NextResponse.json({ error: "assignmentId required" }, { status: 400 });

  await prisma.captureAssignment.deleteMany({
    where: { id: assignmentId, eventId: params.eventId },
  });

  return NextResponse.json({ ok: true });
}
