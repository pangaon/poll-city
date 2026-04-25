/**
 * POST /api/canvasser/stops/[stopId]/note
 * Appends a canvasser note to a TurfStop.
 *
 * Body: { campaignId: string, note: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  note: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { campaignId, note } = parsed.data;

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stop = await prisma.turfStop.findUnique({
    where: { id: params.stopId },
    include: { turf: { select: { campaignId: true } } },
  });

  if (!stop || stop.turf.campaignId !== campaignId) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const updated = await prisma.turfStop.update({
    where: { id: params.stopId },
    data: {
      notes: stop.notes ? `${stop.notes}\n${note}` : note,
    },
    select: { id: true, notes: true },
  });

  return NextResponse.json({ data: updated });
}
