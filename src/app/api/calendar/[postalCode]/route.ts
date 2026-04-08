import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { EventStatus } from "@prisma/client";

// iCal line folding — spec requires lines <= 75 octets, folded with CRLF + space
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(
  events: Array<{
    id: string;
    name: string;
    icalUid: string | null;
    eventDate: Date;
    location: string;
    description: string | null;
    campaign: { name: string };
  }>,
  appUrl: string
): string {
  const now = toIcalDate(new Date());

  const vevents = events
    .map((ev) => {
      const dtstart = toIcalDate(ev.eventDate);
      const dtend = toIcalDate(new Date(ev.eventDate.getTime() + 2 * 60 * 60 * 1000));
      const uid = ev.icalUid ?? `${ev.id}@pollcity.com`;

      const lines = [
        "BEGIN:VEVENT",
        foldLine(`UID:${uid}`),
        foldLine(`DTSTAMP:${now}`),
        foldLine(`DTSTART:${dtstart}`),
        foldLine(`DTEND:${dtend}`),
        foldLine(`SUMMARY:${escapeIcal(ev.name)}`),
        foldLine(`DESCRIPTION:${escapeIcal(ev.description ?? "")}`),
        foldLine(`LOCATION:${escapeIcal(ev.location)}`),
        foldLine(`URL:${appUrl}/events/${ev.id}`),
        foldLine(`ORGANIZER;CN=${escapeIcal(ev.campaign.name)}:mailto:noreply@pollcity.com`),
        "END:VEVENT",
      ];
      return lines.join("\r\n");
    })
    .join("\r\n");

  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Poll City//Civic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Poll City Civic Events",
    "X-WR-TIMEZONE:America/Toronto",
    "X-WR-CALDESC:Public civic events from Poll City",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return cal;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { postalCode: string } }
) {
  const raw = params.postalCode ?? "";

  // Validate and extract FSA (first 3 alphanumeric chars, uppercase)
  const fsa = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
  if (!/^[A-Z]\d[A-Z]$/i.test(fsa)) {
    return new NextResponse("Invalid postal code. Provide a valid Canadian FSA (e.g. M4C).", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      isPublic: true,
      status: { in: [EventStatus.scheduled, EventStatus.live] },
      deletedAt: null,
      eventDate: {
        gte: thirtyDaysAgo,
        lte: sixMonthsOut,
      },
    },
    include: {
      campaign: {
        select: { name: true },
      },
    },
    orderBy: { eventDate: "asc" },
    take: 100,
  });

  // Best-effort postal prefix filter: include events whose postalCode starts with FSA,
  // OR events that have no postalCode set (campaign-wide public events)
  const filtered = events.filter(
    (ev) => !ev.postalCode || ev.postalCode.toUpperCase().startsWith(fsa)
  );

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "https://pollcity.ca";

  const ics = buildIcs(filtered, appUrl);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="civic-events-${fsa}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
