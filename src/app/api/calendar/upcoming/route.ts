import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { EventStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 100);

  const fsa = postalCode.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();

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
    take: limit * 5, // over-fetch for postal filtering
  });

  // Best-effort postal filter when FSA is provided
  const filtered =
    fsa.length === 3
      ? events.filter(
          (ev) => !ev.postalCode || ev.postalCode.toUpperCase().startsWith(fsa)
        )
      : events;

  return NextResponse.json({ data: filtered.slice(0, limit) });
}
