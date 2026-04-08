import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, event.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dtStart = toIcsDate(event.eventDate);
  const dtEnd = toIcsDate(new Date(event.eventDate.getTime() + 60 * 60 * 1000));
  const now = toIcsDate(new Date());
  const uid = event.icalUid || `${event.id}@pollcity`;
  const title = escapeIcsText(event.name);
  const description = escapeIcsText(event.description || "Campaign event");
  const location = escapeIcsText(event.location || "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Poll City//Campaign Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=event-${event.id}.ics`,
    },
  });
}
