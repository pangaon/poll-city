/**
 * POST /api/gotv/mark-voted — Mark a single contact as voted.
 *
 * MUST complete in under 200ms. Used live on election day.
 * Returns the updated gap number immediately so the war room
 * display updates without a separate poll.
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

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  // Verify contact belongs to user's campaign
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true, voted: true },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (contact.voted) {
    return NextResponse.json({ ok: true, alreadyVoted: true, contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}` } });
  }

  // Single fast update — no joins
  await prisma.contact.update({
    where: { id: contactId },
    data: { voted: true, votedAt: new Date() },
  });

  // Calculate new gap in parallel with audit log
  const [supportersVoted, totalContacts] = await Promise.all([
    prisma.contact.count({
      where: { campaignId: contact.campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] }, voted: true },
    }),
    prisma.contact.count({ where: { campaignId: contact.campaignId } }),
    // Audit log — fire and forget
    prisma.activityLog.create({
      data: {
        campaignId: contact.campaignId,
        userId: session!.user.id,
        action: "gotv_mark_voted",
        entityType: "Contact",
        entityId: contactId,
        details: { name: `${contact.firstName} ${contact.lastName}` },
      },
    }).catch(() => {}),
  ]);

  const winThreshold = Math.ceil(totalContacts * 0.35);
  const gap = Math.max(0, winThreshold - supportersVoted);

  const duration = Date.now() - start;
  if (duration > 200) {
    console.warn(`[SLOW] mark-voted took ${duration}ms (target: 200ms)`);
  }

  return NextResponse.json({
    ok: true,
    contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}` },
    gap,
    supportersVoted,
    winThreshold,
    duration,
  }, { headers: { "Cache-Control": "no-store" } });
}
