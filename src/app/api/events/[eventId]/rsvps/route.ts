import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { EventRsvpStatus } from "@prisma/client";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "events:read");
  if (permError) return permError;

  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: params.eventId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: rsvps });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "events:write");
  if (permError) return permError;

  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    contactId?: string;
    status?: string;
    notes?: string;
    source?: string;
  } | null;

  if (!body?.name?.trim() || !body?.email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const existing = await prisma.eventRsvp.findFirst({
    where: {
      eventId: params.eventId,
      email: body.email.trim().toLowerCase(),
    },
  });

  // Capacity check — auto-waitlist if event is full
  let resolvedStatus: EventRsvpStatus =
    body.status && Object.values(EventRsvpStatus).includes(body.status as EventRsvpStatus)
      ? (body.status as EventRsvpStatus)
      : EventRsvpStatus.going;

  if (resolvedStatus === EventRsvpStatus.going && event.capacity && event.capacity > 0 && !existing) {
    const goingCount = await prisma.eventRsvp.count({
      where: { eventId: params.eventId, status: { in: ["going", "checked_in"] } },
    });
    if (goingCount >= event.capacity) {
      // Check waitlist cap
      if (event.maxWaitlist && event.maxWaitlist > 0) {
        const waitlistCount = await prisma.eventRsvp.count({
          where: { eventId: params.eventId, status: "waitlisted" },
        });
        if (waitlistCount >= event.maxWaitlist) {
          return NextResponse.json({ error: "Event is full and waitlist is at capacity" }, { status: 409 });
        }
      }
      resolvedStatus = EventRsvpStatus.waitlisted;
    }
  }

  const data = {
    eventId: params.eventId,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone?.trim() || null,
    contactId: body.contactId || null,
    status: resolvedStatus,
    notes: body.notes?.trim() || null,
    source: body.source?.trim() || "staff",
  };

  const rsvp = existing
    ? await prisma.eventRsvp.update({ where: { id: existing.id }, data })
    : await prisma.eventRsvp.create({ data });

  return NextResponse.json({ data: rsvp }, { status: existing ? 200 : 201 });
}
