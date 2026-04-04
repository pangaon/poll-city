import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { createInteractionSchema } from "@/lib/validators";

/**
 * POST /api/interactions
 * Log a new interaction with a contact
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createInteractionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  // Verify access to contact
  const contact = await prisma.contact.findUnique({
    where: { id: data.contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Create interaction
  const interaction = await prisma.interaction.create({
    data: {
      contactId: data.contactId,
      userId: session!.user.id,
      type: data.type,
      notes: data.notes,
      supportLevel: data.supportLevel ?? undefined,
      issues: data.issues ?? [],
      signRequested: data.signRequested ?? false,
      volunteerInterest: data.volunteerInterest ?? false,
      followUpNeeded: data.followUpNeeded ?? false,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      doorNumber: data.doorNumber,
      duration: data.duration,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Update contact fields based on interaction
  const contactUpdate: Record<string, unknown> = { lastContactedAt: new Date() };
  if (data.supportLevel) contactUpdate.supportLevel = data.supportLevel;
  if (data.issues?.length) contactUpdate.issues = data.issues;
  if (data.signRequested) contactUpdate.signRequested = true;
  if (data.volunteerInterest) contactUpdate.volunteerInterest = true;
  if (data.followUpNeeded !== undefined) contactUpdate.followUpNeeded = data.followUpNeeded;
  if (data.followUpDate) contactUpdate.followUpDate = new Date(data.followUpDate);

  await prisma.contact.update({ where: { id: data.contactId }, data: contactUpdate });

  // Log activity
  await prisma.activityLog.create({
    data: {
      campaignId: contact.campaignId,
      userId: session!.user.id,
      action: "logged_interaction",
      entityType: "contact",
      entityId: data.contactId,
      details: {
        type: data.type,
        contactName: `${contact.firstName} ${contact.lastName}`,
        ...(data.supportLevel && { supportLevel: data.supportLevel }),
      },
    },
  });

  return NextResponse.json({ data: interaction }, { status: 201 });
}
