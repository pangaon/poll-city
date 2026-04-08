import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { rsvpId?: string; email?: string } | null;
  if (!body?.rsvpId && !body?.email?.trim()) {
    return NextResponse.json({ error: "rsvpId or email required" }, { status: 400 });
  }

  const rsvp = body.rsvpId
    ? await prisma.eventRsvp.findUnique({ where: { id: body.rsvpId } })
    : await prisma.eventRsvp.findFirst({
        where: {
          eventId: params.eventId,
          email: body!.email!.trim().toLowerCase(),
        },
      });

  if (!rsvp || rsvp.eventId !== params.eventId) {
    return NextResponse.json({ error: "RSVP not found" }, { status: 404 });
  }

  const updated = await prisma.eventRsvp.update({
    where: { id: rsvp.id },
    data: { attended: true, checkedInAt: new Date(), status: "checked_in" },
  });

  return NextResponse.json({ data: updated });
}
