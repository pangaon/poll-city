/**
 * POST /api/gotv/strike-off — Mark a supporter as voted. Sub-100ms target.
 *
 * From SUBJECT-MATTER-BIBLE: "Strike off: Sub-100ms response. Large search.
 * Hit Enter. Gap drops. Undo 10 seconds. No confirmation dialog."
 *
 * This is the most time-sensitive endpoint in the entire platform.
 * On election day, scrutineers are uploading voted names every few minutes.
 * Every millisecond matters.
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

  const { contactId, campaignId } = await req.json();
  if (!contactId || !campaignId) {
    return NextResponse.json({ error: "contactId and campaignId required" }, { status: 400 });
  }

  // Single fast update — no joins, no includes, just the write
  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: { voted: true, votedAt: new Date() },
    select: { id: true, firstName: true, lastName: true, voted: true },
  });

  const duration = Date.now() - start;
  if (duration > 100) {
    console.warn(`[SLOW] GOTV strike-off took ${duration}ms (target: 100ms) for contact ${contactId}`);
  }

  return NextResponse.json({
    ok: true,
    contact: updated,
    duration,
    canUndo: true,
    undoExpiresIn: 10000, // 10 seconds
  });
}

/** DELETE /api/gotv/strike-off — Undo a strike-off (within 10 seconds) */
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  // Check if voted within last 10 seconds (undo window)
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { votedAt: true },
  });

  if (!contact?.votedAt) {
    return NextResponse.json({ error: "Contact was not marked as voted" }, { status: 400 });
  }

  const secondsSinceVoted = (Date.now() - contact.votedAt.getTime()) / 1000;
  if (secondsSinceVoted > 10) {
    return NextResponse.json({ error: "Undo window expired (10 seconds)" }, { status: 400 });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: { voted: false, votedAt: null },
  });

  return NextResponse.json({ ok: true, undone: true });
}
