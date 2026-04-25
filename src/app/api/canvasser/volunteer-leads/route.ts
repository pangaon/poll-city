/**
 * POST /api/canvasser/volunteer-leads
 * Records a volunteer interest flag on a contact.
 *
 * Body: { campaignId: string, contactId: string, notes?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { campaignId, contactId, notes } = parsed.data;

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

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, campaignId, deletedAt: null },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: { volunteerInterest: true },
  });

  if (notes) {
    await prisma.interaction.create({
      data: {
        contactId,
        userId: session!.user.id,
        type: "note",
        source: "canvass",
        volunteerInterest: true,
        notes: `Volunteer interest noted: ${notes}`,
        issues: [],
      },
    });
  }

  return NextResponse.json({ data: { contactId, volunteerInterest: true } }, { status: 201 });
}
