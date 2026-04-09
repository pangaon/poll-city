/**
 * Phone banking session operations.
 * GET — Get next contact to call
 * POST — Log call result
 * PATCH — End session
 */
import { NextRequest, NextResponse } from "next/server";
import { InteractionType, SupportLevel } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import { phoneBankResultSchema } from "@/lib/validators/voice";

/** GET — Get the next contact to call in this session */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "canvassing:write");
  if (error) return error;

  const pbSession = await prisma.phoneBankSession.findUnique({ where: { id: params.id } });
  if (!pbSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (pbSession.volunteerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find next contact with a phone number not yet called in this session
  const calledContactIds = await prisma.interaction.findMany({
    where: {
      userId: session.user.id as string,
      type: InteractionType.phone_call,
      createdAt: { gte: pbSession.startedAt },
      contact: { campaignId: pbSession.campaignId },
    },
    select: { contactId: true },
  });
  const calledIdArray = calledContactIds.map((i) => i.contactId);

  // Get opt-out phones
  const optOuts = await prisma.voiceOptOut.findMany({
    where: { campaignId: pbSession.campaignId },
    select: { phone: true },
  });
  const optOutPhones = optOuts.map((o) => o.phone);

  const contact = await prisma.contact.findFirst({
    where: {
      campaignId: pbSession.campaignId,
      deletedAt: null,
      doNotContact: false,
      phone: { not: null },
      id: { notIn: calledIdArray },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      address1: true,
      supportLevel: true,
      notes: true,
    },
  });

  if (!contact) return NextResponse.json({ contact: null, message: "No more contacts to call" });

  // Filter opt-outs
  if (contact.phone && optOutPhones.includes(contact.phone)) {
    return NextResponse.json({ contact: null, message: "Remaining contacts are on opt-out list" });
  }

  return NextResponse.json({ contact });
}

/** POST — Log a call result */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "canvassing:write");
  if (error) return error;

  const pbSession = await prisma.phoneBankSession.findUnique({ where: { id: params.id } });
  if (!pbSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (pbSession.volunteerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = phoneBankResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { contactId, result, supportLevel, notes, duration } = parsed.data;

  // Log interaction
  await prisma.interaction.create({
    data: {
      contactId,
      userId: session.user.id,
      type: InteractionType.phone_call,
      supportLevel: supportLevel ? (supportLevel as SupportLevel) : null,
      notes: notes ?? `Phone bank: ${result}`,
    },
  });

  // Update contact support level
  if (supportLevel) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { supportLevel: supportLevel as SupportLevel, lastContactedAt: new Date() },
    }).catch(() => {});
  }

  // Update session stats
  await prisma.phoneBankSession.update({
    where: { id: params.id },
    data: {
      callsMade: { increment: 1 },
      ...(result === "answered" || supportLevel ? { answeredCalls: { increment: 1 } } : {}),
      ...(duration ? { totalDuration: { increment: duration } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** PATCH — End the session */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "canvassing:write");
  if (error) return error;

  const pbSession = await prisma.phoneBankSession.findUnique({ where: { id: params.id } });
  if (!pbSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (pbSession.volunteerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.phoneBankSession.update({
    where: { id: params.id },
    data: { status: "completed", endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
