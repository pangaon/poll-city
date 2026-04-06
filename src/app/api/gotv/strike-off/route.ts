/**
 * POST /api/gotv/strike-off — Fuzzy name search + mark as voted.
 *
 * George's spec: "Body: { name: string }. Fuzzy searches by name.
 * Marks as voted. Returns the contact that was matched.
 * Returns new gap number. Fast. Under 200ms."
 *
 * DELETE — Undo within 10 seconds.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { name, campaignId } = await req.json();
  if (!name?.trim() || !campaignId) {
    return NextResponse.json({ error: "name and campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fuzzy search — split name into parts, search by firstName + lastName
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";

  // Try exact match first (fastest)
  let contact = await prisma.contact.findFirst({
    where: {
      campaignId,
      firstName: { contains: firstName, mode: "insensitive" },
      ...(lastName ? { lastName: { contains: lastName, mode: "insensitive" } } : {}),
      voted: false,
    },
    select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
  });

  // If no match with both names, try lastName only (common when entering "Smith")
  if (!contact && lastName) {
    contact = await prisma.contact.findFirst({
      where: {
        campaignId,
        lastName: { contains: lastName, mode: "insensitive" },
        voted: false,
      },
      select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
    });
  }

  // Try firstName only as fallback
  if (!contact) {
    contact = await prisma.contact.findFirst({
      where: {
        campaignId,
        OR: [
          { firstName: { contains: firstName, mode: "insensitive" } },
          { lastName: { contains: firstName, mode: "insensitive" } },
        ],
        voted: false,
      },
      select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
    });
  }

  if (!contact) {
    return NextResponse.json({ error: "No matching contact found", searchedName: name }, { status: 404 });
  }

  if (contact.voted) {
    return NextResponse.json({
      ok: true,
      alreadyVoted: true,
      contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}`, address: contact.address1 },
    });
  }

  // Mark voted
  await prisma.contact.update({
    where: { id: contact.id },
    data: { voted: true, votedAt: new Date() },
  });

  // Calculate new gap + audit log in parallel
  const [supportersVoted, totalContacts] = await Promise.all([
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] }, voted: true },
    }),
    prisma.contact.count({ where: { campaignId } }),
    prisma.activityLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        action: "gotv_strike_off",
        entityType: "Contact",
        entityId: contact.id,
        details: { name: `${contact.firstName} ${contact.lastName}`, searchQuery: name },
      },
    }).catch(() => {}),
  ]);

  const winThreshold = Math.ceil(totalContacts * 0.35);
  const gap = Math.max(0, winThreshold - supportersVoted);

  const duration = Date.now() - start;
  if (duration > 200) console.warn(`[SLOW] strike-off took ${duration}ms (target: 200ms)`);

  return NextResponse.json({
    ok: true,
    contact: {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      address: contact.address1,
      phone: contact.phone,
      supportLevel: contact.supportLevel,
    },
    gap,
    supportersVoted,
    winThreshold,
    canUndo: true,
    undoExpiresIn: 10000,
    duration,
  }, { headers: { "Cache-Control": "no-store" } });
}

/** DELETE — Undo a strike-off within 10 seconds */
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { votedAt: true, campaignId: true },
  });

  if (!contact?.votedAt) return NextResponse.json({ error: "Not marked as voted" }, { status: 400 });

  const secondsSince = (Date.now() - contact.votedAt.getTime()) / 1000;
  if (secondsSince > 10) return NextResponse.json({ error: "Undo window expired (10 seconds)" }, { status: 400 });

  await prisma.contact.update({
    where: { id: contactId },
    data: { voted: false, votedAt: null },
  });

  return NextResponse.json({ ok: true, undone: true });
}
