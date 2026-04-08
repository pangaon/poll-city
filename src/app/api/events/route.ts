import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { EventStatus, EventVisibility } from "@prisma/client";
import { audit } from "@/lib/audit";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCsv(value?: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "events:read");
  if (forbidden) return forbidden;

  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  const statuses = parseCsv(req.nextUrl.searchParams.get("status"));
  const includePast = req.nextUrl.searchParams.get("includePast") === "true";

  const events = await prisma.event.findMany({
    where: { campaignId: campaignId!,
      ...(statuses.length
        ? {
            status: {
              in: statuses.filter((status): status is EventStatus =>
                Object.values(EventStatus).includes(status as EventStatus)
              ),
            },
          }
        : {}),
      ...(from || to
        ? {
            eventDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : !includePast
          ? { eventDate: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } }
          : {}),
    },
    include: { rsvps: true },
    orderBy: { eventDate: "asc" },
  });

  const data = events.map((event) => {
    const goingCount = event.rsvps.filter((rsvp) => ["going", "checked_in"].includes(String(rsvp.status))).length;
    const checkInCount = event.rsvps.filter((rsvp) => !!rsvp.attended || !!rsvp.checkedInAt).length;
    return {
      ...event,
      totals: {
        rsvpCount: event.rsvps.length,
        goingCount,
        checkInCount,
      },
    };
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string;
    name?: string;
    eventDate?: string;
    location?: string;
    capacity?: number;
    description?: string;
    isPublic?: boolean;
    status?: string;
    visibility?: string;
    timezone?: string;
    allowPublicRsvp?: boolean;
    requiresApproval?: boolean;
    isVirtual?: boolean;
    virtualUrl?: string;
    recurrenceRule?: string;
    followUpMessage?: string;
    maxWaitlist?: number;
    eventType?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    address1?: string;
    address2?: string;
    lat?: number;
    lng?: number;
  } | null;

  if (!body?.campaignId || !body.name?.trim() || !body.eventDate || !body.location?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const eventDate = parseDate(body.eventDate);
  if (!eventDate) return NextResponse.json({ error: "Invalid eventDate" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.event.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      eventDate,
      location: body.location.trim(),
      capacity: body.capacity ?? null,
      description: body.description?.trim() || null,
      isPublic: !!body.isPublic,
      status:
        body.status && Object.values(EventStatus).includes(body.status as EventStatus)
          ? (body.status as EventStatus)
          : EventStatus.draft,
      visibility:
        body.visibility && Object.values(EventVisibility).includes(body.visibility as EventVisibility)
          ? (body.visibility as EventVisibility)
          : body.isPublic
            ? EventVisibility.public
            : EventVisibility.internal,
      timezone: body.timezone?.trim() || "America/Toronto",
      allowPublicRsvp: !!body.allowPublicRsvp,
      requiresApproval: !!body.requiresApproval,
      isVirtual: !!body.isVirtual,
      virtualUrl: body.virtualUrl?.trim() || null,
      recurrenceRule: body.recurrenceRule?.trim() || null,
      followUpMessage: body.followUpMessage?.trim() || null,
      maxWaitlist: body.maxWaitlist ?? null,
      city: body.city?.trim() || null,
      province: body.province?.trim() || null,
      postalCode: body.postalCode?.trim() || null,
      address1: body.address1?.trim() || null,
      address2: body.address2?.trim() || null,
      lat: typeof body.lat === "number" ? body.lat : null,
      lng: typeof body.lng === "number" ? body.lng : null,
      eventType: body.eventType?.trim() || null,
    },
    include: { rsvps: true },
  });

  await audit(prisma, 'event.create', {
    campaignId: body.campaignId,
    userId: session!.user.id,
    entityId: created.id,
    entityType: 'Event',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
