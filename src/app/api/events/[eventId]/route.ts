import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import type { Prisma } from "@prisma/client";
import { EventStatus, EventVisibility } from "@prisma/client";
import { audit } from "@/lib/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: { rsvps: true, reminders: true },
  });
  if (!event || event.deletedAt) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const totals = {
    rsvpCount: event.rsvps.length,
    checkInCount: event.rsvps.filter((rsvp) => !!rsvp.attended || !!rsvp.checkedInAt).length,
    goingCount: event.rsvps.filter((rsvp) => ["going", "checked_in"].includes(String(rsvp.status))).length,
  };

  return NextResponse.json({ data: { ...event, totals } });
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event || event.deletedAt) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    eventDate?: string;
    location?: string;
    description?: string | null;
    capacity?: number | null;
    status?: string;
    visibility?: string;
    isPublic?: boolean;
    allowPublicRsvp?: boolean;
    requiresApproval?: boolean;
    isVirtual?: boolean;
    virtualUrl?: string | null;
    recurrenceRule?: string | null;
    followUpMessage?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    address1?: string | null;
    address2?: string | null;
    lat?: number | null;
    lng?: number | null;
    timezone?: string;
    maxWaitlist?: number | null;
    eventType?: string | null;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  let eventDate: Date | undefined;
  if (body.eventDate !== undefined) {
    const parsedDate = parseDate(body.eventDate);
    if (!parsedDate) {
      return NextResponse.json({ error: "Invalid eventDate" }, { status: 400 });
    }
    eventDate = parsedDate;
  }

  const data: Prisma.EventUpdateInput = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (eventDate !== undefined) data.eventDate = eventDate;
  if (body.location !== undefined) data.location = body.location.trim();
  if (body.description !== undefined) data.description = sanitizeUserText(body.description);
  if (body.capacity !== undefined) data.capacity = body.capacity;
  if (body.isPublic !== undefined) data.isPublic = body.isPublic;
  if (body.allowPublicRsvp !== undefined) data.allowPublicRsvp = body.allowPublicRsvp;
  if (body.requiresApproval !== undefined) data.requiresApproval = body.requiresApproval;
  if (body.isVirtual !== undefined) data.isVirtual = body.isVirtual;
  if (body.virtualUrl !== undefined) data.virtualUrl = body.virtualUrl?.trim() || null;
  if (body.recurrenceRule !== undefined) data.recurrenceRule = body.recurrenceRule?.trim() || null;
  if (body.followUpMessage !== undefined) data.followUpMessage = body.followUpMessage?.trim() || null;
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.province !== undefined) data.province = body.province?.trim() || null;
  if (body.postalCode !== undefined) data.postalCode = body.postalCode?.trim() || null;
  if (body.address1 !== undefined) data.address1 = body.address1?.trim() || null;
  if (body.address2 !== undefined) data.address2 = body.address2?.trim() || null;
  if (body.lat !== undefined) data.lat = body.lat;
  if (body.lng !== undefined) data.lng = body.lng;
  if (body.timezone !== undefined) data.timezone = body.timezone.trim() || "America/Toronto";
  if (body.maxWaitlist !== undefined) data.maxWaitlist = body.maxWaitlist;
  if (body.eventType !== undefined) data.eventType = body.eventType?.trim() || null;

  if (body.visibility !== undefined && Object.values(EventVisibility).includes(body.visibility as EventVisibility)) {
    data.visibility = body.visibility as EventVisibility;
  }

  if (body.status !== undefined && Object.values(EventStatus).includes(body.status as EventStatus)) {
    data.status = body.status as EventStatus;
    if (body.status === EventStatus.scheduled) {
      data.publishedAt = event.publishedAt ?? new Date();
    }
    if (body.status === EventStatus.cancelled) {
      data.cancelledAt = new Date();
    }
  }

  const updated = await prisma.event.update({
    where: { id: params.eventId },
    data,
    include: { rsvps: true, reminders: true },
  });

  await audit(prisma, 'event.update', {
    campaignId: event.campaignId,
    userId: session!.user.id,
    entityId: params.eventId,
    entityType: 'Event',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event || event.deletedAt) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.event.update({
    where: { id: params.eventId },
    data: { deletedAt: new Date() },
  });

  await audit(prisma, 'event.delete', {
    campaignId: event.campaignId,
    userId: session!.user.id,
    entityId: params.eventId,
    entityType: 'Event',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ ok: true });
}
