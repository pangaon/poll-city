/**
 * POST /api/gotv/strike-off
 *
 * Accepts either:
 * - { campaignId, contactId }
 * - { campaignId, name }
 *
 * Marks the matched contact as voted and returns updated summary metrics.
 * DELETE undoes a voted mark within a 10 second window.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { executeAction } from "@/lib/operations/action-engine";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

async function findContactByName(campaignId: string, name: string) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ").trim();

  let contact = await prisma.contact.findFirst({
    where: {
      campaignId,
      firstName: { contains: firstName, mode: "insensitive" },
      ...(lastName ? { lastName: { contains: lastName, mode: "insensitive" } } : {}),
      voted: false,
      isDeceased: false,
    },
    select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
  });

  if (!contact && lastName) {
    contact = await prisma.contact.findFirst({
      where: {
        campaignId,
        lastName: { contains: lastName, mode: "insensitive" },
        voted: false,
        isDeceased: false,
      },
      select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
    });
  }

  if (!contact && firstName) {
    contact = await prisma.contact.findFirst({
      where: {
        campaignId,
        OR: [
          { firstName: { contains: firstName, mode: "insensitive" } },
          { lastName: { contains: firstName, mode: "insensitive" } },
        ],
        voted: false,
        isDeceased: false,
      },
      select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
    });
  }

  return contact;
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const body = await req.json().catch(() => null) as {
    campaignId?: string;
    contactId?: string;
    name?: string;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let contactId = body?.contactId?.trim();
  let matchedContact = null as null | {
    id: string;
    firstName: string;
    lastName: string;
    address1: string | null;
    phone: string | null;
    supportLevel: string;
    voted: boolean;
  };

  if (!contactId && body?.name?.trim()) {
    matchedContact = await findContactByName(campaignId, body.name.trim());
    if (!matchedContact) {
      return NextResponse.json({ error: "No matching contact found", searchedName: body.name }, { status: 404 });
    }
    contactId = matchedContact.id;
  }

  if (!contactId) {
    return NextResponse.json({ error: "contactId or name required" }, { status: 400 });
  }

  const contact = matchedContact ?? await prisma.contact.findFirst({
    where: { id: contactId, campaignId },
    select: { id: true, firstName: true, lastName: true, address1: true, phone: true, supportLevel: true, voted: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const actionResult = await executeAction(
    "gotv.mark_voted",
    { contactId: contact.id },
    { campaignId, actorUserId: session!.user.id },
  );
  const metrics = await getGotvSummaryMetrics(campaignId);
  const duration = Date.now() - start;
  if (duration > 200) console.warn(`[SLOW] strike-off took ${duration}ms (target: 200ms)`);

  return NextResponse.json({
    ok: true,
    action: actionResult.action,
    alreadyVoted: Boolean(actionResult.details.alreadyVoted),
    contact: {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      address: contact.address1,
      phone: contact.phone,
      supportLevel: contact.supportLevel,
    },
    gap: metrics.gap,
    supportersVoted: metrics.supportersVoted,
    winThreshold: metrics.winThreshold,
    drillThrough: metrics.drillThrough,
    canUndo: true,
    undoExpiresIn: 10000,
    duration,
  }, { headers: { "Cache-Control": "no-store" } });
}

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

  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId: contact.campaignId,
      },
    },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const secondsSince = (Date.now() - contact.votedAt.getTime()) / 1000;
  if (secondsSince > 10) return NextResponse.json({ error: "Undo window expired (10 seconds)" }, { status: 400 });

  await prisma.contact.update({
    where: { id: contactId },
    data: { voted: false, votedAt: null },
  });

  return NextResponse.json({ ok: true, undone: true });
}

