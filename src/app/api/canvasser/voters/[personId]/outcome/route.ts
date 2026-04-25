/**
 * POST /api/canvasser/voters/[personId]/outcome
 * Records a voter outcome during canvassing — updates support level on the contact.
 *
 * Body: {
 *   campaignId: string
 *   supportLevel: SupportLevel
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  supportLevel: z.enum([
    "strong_support",
    "leaning_support",
    "undecided",
    "leaning_opposition",
    "strong_opposition",
    "unknown",
  ]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { personId: string } },
) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { campaignId, supportLevel, notes } = parsed.data;

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

  // Verify contact belongs to this campaign
  const contact = await prisma.contact.findFirst({
    where: { id: params.personId, campaignId, deletedAt: null },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.contact.update({
      where: { id: params.personId },
      data: { supportLevel, lastContactedAt: now },
    }),
    prisma.interaction.create({
      data: {
        contactId: params.personId,
        userId: session!.user.id,
        type: "door_knock",
        source: "canvass",
        supportLevel,
        notes: notes ?? null,
        issues: [],
      },
    }),
  ]);

  return NextResponse.json({
    data: { personId: params.personId, supportLevel, recordedAt: now.toISOString() },
  });
}
