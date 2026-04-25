/**
 * POST /api/canvasser/stops/[stopId]/skip
 * Skips a stop — marks it visited with a SKIPPED note so it doesn't re-appear.
 *
 * Body: { campaignId: string, reason?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  reason: z.string().optional(),
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

  const { campaignId, reason } = parsed.data;

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

  const noteText = reason ? `[SKIPPED] ${reason}` : "[SKIPPED]";
  const now = new Date();

  await prisma.turfStop.update({
    where: { id: params.stopId },
    data: {
      visited: true,
      visitedAt: now,
      notes: stop.notes ? `${stop.notes}\n${noteText}` : noteText,
    },
  });

  return NextResponse.json({
    data: { stopId: params.stopId, skippedAt: now.toISOString() },
  });
}
