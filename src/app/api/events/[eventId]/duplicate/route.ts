import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "events:write");
  if (permError) return permError;

  const source = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: { reminders: true },
  });
  if (!source) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, source.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { dateOffsetDays?: number; nameSuffix?: string } | null;
  const dateOffsetDays = Number(body?.dateOffsetDays ?? 7);
  const offsetMs = Number.isFinite(dateOffsetDays) ? dateOffsetDays * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  const cloneDate = new Date(source.eventDate.getTime() + offsetMs);

  const created = await prisma.event.create({
    data: {
      campaignId: source.campaignId,
      name: `${source.name}${body?.nameSuffix ? ` ${body.nameSuffix}` : " (Copy)"}`,
      eventDate: cloneDate,
      location: source.location,
      capacity: source.capacity,
      description: source.description,
      eventType: source.eventType,
      status: "draft",
      visibility: source.visibility,
      isPublic: false,
      allowPublicRsvp: source.allowPublicRsvp,
      requiresApproval: source.requiresApproval,
      isVirtual: source.isVirtual,
      virtualUrl: source.virtualUrl,
      recurrenceRule: source.recurrenceRule,
      followUpMessage: source.followUpMessage,
      timezone: source.timezone,
      maxWaitlist: source.maxWaitlist,
      city: source.city,
      province: source.province,
      postalCode: source.postalCode,
      address1: source.address1,
      address2: source.address2,
      lat: source.lat,
      lng: source.lng,
      reminders: {
        create: source.reminders.map((reminder) => ({
          channel: reminder.channel,
          templateKey: reminder.templateKey,
          scheduledFor: new Date(reminder.scheduledFor.getTime() + offsetMs),
          status: "pending",
        })),
      },
    },
    include: { reminders: true },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
