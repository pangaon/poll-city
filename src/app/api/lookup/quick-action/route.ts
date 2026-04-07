import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { SupportLevel } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null) as {
    contactId?: string;
    action?: "supporter" | "soft_support" | "against" | "undecided" | "note" | "tag";
    note?: string;
    tagId?: string;
    applyHousehold?: boolean;
    latitude?: number;
    longitude?: number;
  } | null;

  if (!body?.contactId || !body.action) {
    return NextResponse.json({ error: "contactId and action are required" }, { status: 400 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: body.contactId }, select: { id: true, campaignId: true, householdId: true } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  let interactionNote = "Field encounter";

  if (body.action === "supporter") {
    updates.supportLevel = "strong_support";
    interactionNote = "Marked supporter from voter lookup";
  }
  if (body.action === "soft_support") {
    updates.supportLevel = "leaning_support";
    interactionNote = "Marked soft supporter from voter lookup";
  }
  if (body.action === "against") {
    updates.supportLevel = "strong_opposition";
    interactionNote = "Marked against from voter lookup";
  }
  if (body.action === "undecided") {
    updates.supportLevel = "undecided";
    interactionNote = "Marked undecided from voter lookup";
  }
  if (body.action === "note") {
    updates.notes = body.note?.trim() || null;
    interactionNote = body.note?.trim() || "Added note from voter lookup";
  }
  const householdContacts = body.applyHousehold && contact.householdId
    ? await prisma.contact.findMany({
      where: { campaignId: contact.campaignId, householdId: contact.householdId, isDeceased: false },
      select: { id: true },
    })
    : [{ id: body.contactId }];
  const targetContactIds = householdContacts.map((c) => c.id);

  if (body.action === "tag" && body.tagId) {
    await prisma.contactTag.createMany({
      data: targetContactIds.map((targetContactId) => ({ contactId: targetContactId, tagId: body.tagId! })),
      skipDuplicates: true,
    });
    interactionNote = body.applyHousehold ? "Added tag for household from voter lookup" : "Added tag from voter lookup";
  }

  if (Object.keys(updates).length > 0) {
    await prisma.contact.updateMany({ where: { id: { in: targetContactIds } }, data: updates });
  }

  await prisma.interaction.createMany({
    data: targetContactIds.map((targetContactId) => ({
      contactId: targetContactId,
      userId: session!.user.id,
      type: "field_encounter",
      notes: interactionNote,
      supportLevel: typeof updates.supportLevel === "string" ? (updates.supportLevel as SupportLevel) : undefined,
      latitude: body.latitude,
      longitude: body.longitude,
    })),
  });

  return NextResponse.json({ data: { success: true, affectedContacts: targetContactIds.length } });
}
