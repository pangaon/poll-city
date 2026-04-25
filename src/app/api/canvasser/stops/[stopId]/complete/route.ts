/**
 * POST /api/canvasser/stops/[stopId]/complete
 * Marks a TurfStop as visited and creates an Interaction record.
 *
 * Body: {
 *   campaignId: string
 *   supportLevel?: SupportLevel
 *   notes?: string
 *   issues?: string[]
 *   signRequested?: boolean
 *   volunteerInterest?: boolean
 *   followUpNeeded?: boolean
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  supportLevel: z
    .enum([
      "strong_support",
      "leaning_support",
      "undecided",
      "leaning_opposition",
      "strong_opposition",
      "unknown",
    ])
    .optional(),
  notes: z.string().optional(),
  issues: z.array(z.string()).optional(),
  signRequested: z.boolean().optional(),
  volunteerInterest: z.boolean().optional(),
  followUpNeeded: z.boolean().optional(),
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
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    campaignId,
    supportLevel,
    notes,
    issues,
    signRequested,
    volunteerInterest,
    followUpNeeded,
  } = parsed.data;

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

  // Load the stop and verify it belongs to this campaign
  const stop = await prisma.turfStop.findUnique({
    where: { id: params.stopId },
    include: { turf: { select: { campaignId: true } } },
  });

  if (!stop || stop.turf.campaignId !== campaignId) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const now = new Date();

  // Mark stop visited + update contact in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.turfStop.update({
      where: { id: params.stopId },
      data: { visited: true, visitedAt: now },
    });

    if (supportLevel || signRequested !== undefined || volunteerInterest !== undefined || followUpNeeded !== undefined) {
      await tx.contact.update({
        where: { id: stop.contactId },
        data: {
          ...(supportLevel ? { supportLevel } : {}),
          ...(signRequested !== undefined ? { signRequested } : {}),
          ...(volunteerInterest !== undefined ? { volunteerInterest } : {}),
          ...(followUpNeeded !== undefined ? { followUpNeeded } : {}),
          lastContactedAt: now,
        },
      });
    }

    await tx.interaction.create({
      data: {
        contactId: stop.contactId,
        userId: session!.user.id,
        type: "door_knock",
        source: "canvass",
        supportLevel: supportLevel ?? null,
        notes: notes ?? null,
        issues: issues ?? [],
        signRequested: signRequested ?? false,
        volunteerInterest: volunteerInterest ?? false,
        followUpNeeded: followUpNeeded ?? false,
      },
    });

    // Update turf counters
    await tx.turf.update({
      where: { id: stop.turfId },
      data: {
        doorsKnocked: { increment: 1 },
        ...(supportLevel === "strong_support" || supportLevel === "leaning_support"
          ? { supporters: { increment: 1 } }
          : {}),
        ...(supportLevel === "undecided" ? { undecided: { increment: 1 } } : {}),
      },
    });
  });

  return NextResponse.json({
    data: { stopId: params.stopId, visitedAt: now.toISOString() },
  });
}
